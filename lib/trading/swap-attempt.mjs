import { Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { assertReviewReady } from './review';
import { signPreparedSwap, assertPreparedReviewCurrent } from './wallet-transaction.mjs';
import { claimWalletReviewBinding } from './wallet-session.mjs';

const GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// Unmounted integration candidate. No built-in storage, RPC transport, discovery
// or connect. The trusted host supplies a durable atomic claim and a synchronous
// enqueue boundary; neither interface is certified by this module.
export function createWalletSwapAttempt({ prepared, review, wallet, readContext, readWalletState, subscribe, intentId, lastValidBlockHeight, claimIntent, enqueue }) {
  if (!prepared || !review || typeof wallet?.signTransaction !== 'function' || [readContext, readWalletState, subscribe, claimIntent, enqueue].some(f => typeof f !== 'function')) throw Error('Swap attempt dependencies required');
  if (typeof intentId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(intentId) || !Number.isSafeInteger(lastValidBlockHeight) || lastValidBlockHeight < 0) throw Error('Stable intent and original block height required');
  assertPreparedReviewCurrent(prepared, review);
  if (typeof globalThis.performance?.now !== 'function') throw Error('Monotonic clock required');
  claimWalletReviewBinding(review);
  let invalid = false, attempted = false, dispatched = false, unsubscribe = null;
  const startedMs = Date.now(), startedMono = globalThis.performance.now();
  let lastNowMs = startedMs;
  const invalidate = () => { invalid = true; };
  const dispose = () => {
    invalidate();
    const stop = unsubscribe; unsubscribe = null;
    if (typeof stop === 'function') stop();
  };
  const check = () => {
    try {
      if (invalid) throw Error('Wallet session changed; prepare a new review');
      assertPreparedReviewCurrent(prepared, review);
      const state = readWalletState();
      if (invalid || state?.launchEnabled !== true || state.wallet !== review.wallet || state.network !== review.network) throw Error('Wallet session changed; prepare a new review');
      const now = Date.now(), elapsed = globalThis.performance.now() - startedMono;
      if (!Number.isSafeInteger(now) || now < lastNowMs || now >= review.expiresAtMs || elapsed < 0 || elapsed >= review.expiresAtMs - startedMs) throw Error('Quote expired or clock moved backwards');
      lastNowMs = now;
    } catch (error) { invalidate(); throw error; }
  };
  const read = async input => { check(); const context = await readContext(input); check(); if (context?.lastValidBlockHeight !== lastValidBlockHeight) throw Error('Original block height changed'); return context; };
  try {
    unsubscribe = subscribe(invalidate);
    if (typeof unsubscribe !== 'function') throw Error('Wallet event unsubscribe required');
    check();
  } catch (error) {
    try { dispose(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Swap binding and cleanup failed'); }
    throw error;
  }
  return Object.freeze({
    dispose,
    async approve() {
      if (attempted) throw Error('Swap attempt already used; prepare a new review');
      attempted = true;
      let receipt = null, outcome = null, failure = null;
      try {
        check();
        const signed = await signPreparedSwap({ prepared, review, readContext: read, wallet: { signTransaction: async tx => { check(); const result = await wallet.signTransaction(tx); check(); return result; } } });
        check();
        // Own an independent snapshot; the provider may retain its object.
        const bytes = Uint8Array.from(signed.serialize({ requireAllSignatures: true, verifySignatures: true }));
        const transaction = Transaction.from(bytes);
        const message = Uint8Array.from(transaction.serializeMessage());
        const signature = bs58.encode(transaction.signature);
        receipt = Object.freeze({ intentId, reviewId: review.id, signature, genesis: GENESIS, blockhash: transaction.recentBlockhash, lastValidBlockHeight, expiresAtMs: review.expiresAtMs, state: 'DISPATCH_INTENT' });
        // Must atomically persist before resolving true. No signed bytes given.
        if (await claimIntent(receipt) !== true) throw Error('Intent claim was not committed');
        check();
        const context = await read({ phase: 'after', transaction });
        if (context.simulation?.signatureVerification !== true || !Number.isSafeInteger(context.simulation.slot) || context.simulation.slot < 0) throw Error('Signed dispatch context required');
        assertReviewReady(review, message, { ...context, message: Uint8Array.from(transaction.serializeMessage()) });
        if (!transaction.verifySignatures(true) || !same(bytes, Uint8Array.from(transaction.serialize()))) throw Error('Signed transaction changed before dispatch');
        // Allocate before the final check. No await or caller hook occurs between
        // that check and entering the supplied trusted enqueue function.
        const transportBytes = Uint8Array.from(bytes);
        const dispatchContext = Object.freeze({ minContextSlot: context.simulation.slot, currentBlockHeight: context.currentBlockHeight });
        check();
        dispatched = true;
        try {
          const response = await enqueue(transportBytes, receipt, dispatchContext);
          outcome = Object.freeze({ ...receipt, state: response === signature ? 'PENDING' : 'UNKNOWN' });
        } catch {
          outcome = Object.freeze({ ...receipt, state: 'UNKNOWN' });
        }
      } catch (error) {
        if (dispatched) outcome = Object.freeze({ ...receipt, state: 'UNKNOWN' });
        else failure = error;
      }
      try { dispose(); } catch (cleanupError) {
        // Once enqueue was entered, never replace the receipt with an exception
        // that a UI could mistake for a definitely unsubmitted transaction.
        if (dispatched) outcome = Object.freeze({ ...outcome, cleanupFailed: true });
        else failure = failure ? new AggregateError([failure, cleanupError], 'Swap attempt and cleanup failed') : cleanupError;
      }
      if (failure) throw failure;
      return outcome;
    },
  });
}

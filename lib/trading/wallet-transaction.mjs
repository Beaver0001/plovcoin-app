import { Keypair } from '@solana/web3.js';
import { buildNativeSwapTransaction, assertNativeBalance } from './engine/native-swap.mjs';
import { PLOV_MINT, upfrontRequired, signReviewedTransaction } from './review';
const sessions = new WeakMap();

// No wallet discovery, user signature request or send occurs during preparation.
export async function prepareWalletTransaction(options) {
  if (options.plovMint.toBase58() !== PLOV_MINT) throw Error('Unexpected PLOV mint');
  const plan = { ...options.plan, amountIn: options.plan.amountIn.clone(), quotedOut: options.plan.quotedOut.clone(), minOut: options.plan.minOut.clone(), legs: options.plan.legs.map(leg => ({ ...leg, offered: leg.offered.clone(), minOut: leg.minOut.clone() })) };
  const temporary = Keypair.generate();
  const envelope = await buildNativeSwapTransaction({ ...options, plan, temporaryWsolAccount: temporary.publicKey });
  envelope.transaction.partialSign(temporary);
  Object.freeze(envelope);
  const message = Uint8Array.from(envelope.transaction.serializeMessage());
  const details = Object.freeze({
    side: plan.direction === 1 ? 'BUY' : 'SELL', wallet: options.user.toBase58(), network: 'mainnet-beta', mint: PLOV_MINT,
    poolAddresses: Object.freeze(plan.legs.map(leg => {
      const p = options.pools.find(pool => pool.label === leg.label);
      if (!p) throw Error('Missing pool');
      return p.address.toBase58();
    })),
    amountIn: BigInt(plan.amountIn.toString()), quotedOut: BigInt(plan.quotedOut.toString()), minimumOut: BigInt(plan.minOut.toString()),
    temporaryRent: envelope.temporaryRentReturnedOnSuccess, newAtaRent: envelope.newAtaRentLamports,
  });
  // Do not return or persist the ephemeral private key. Its partial signature
  // is already attached; a new blockhash/quote requires fresh preparation.
  const prepared = Object.freeze({ envelope, message: Uint8Array.from(message), details });
  sessions.set(prepared, { message: Uint8Array.from(message), review: null });
  return prepared;
}

export async function finalizeWalletReview(prepared, { messageFeeLamports, extraReserveLamports, walletBalanceLamports, expiresAtMs }) {
  const session = sessions.get(prepared);
  if (!session) throw Error('Unknown prepared transaction');
  const actual = Uint8Array.from(prepared.envelope.transaction.serializeMessage());
  if (actual.length !== session.message.length || actual.some((x, i) => x !== session.message[i])) throw Error('Prepared transaction changed');
  assertNativeBalance({ envelope: prepared.envelope, walletBalanceLamports, messageFeeLamports, extraReserveLamports });
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', actual));
  const id = Array.from(digest, x => x.toString(16).padStart(2, '0')).join('');
  const review = { ...prepared.details, poolAddresses: [...prepared.details.poolAddresses], id, messageFee: messageFeeLamports, extraReserve: extraReserveLamports, expiresAtMs };
  upfrontRequired(review);
  Object.freeze(review.poolAddresses);
  session.review = Object.freeze(review);
  return session.review;
}

// Explicit caller consent and launch authorization are prerequisites. Returns
// a verified signed transaction only; never submits or retries it.
export function signPreparedSwap({ prepared, review, wallet, readContext }) {
  const session = sessions.get(prepared);
  if (!session || session.review !== review) throw Error('Review is not bound to this prepared transaction');
  return signReviewedTransaction({ review, reviewedMessage: session.message, transaction: prepared.envelope.transaction, readContext,
    getMessage: tx => Uint8Array.from(tx.serializeMessage()), verifySignedTransaction: tx => tx.verifySignatures(true), wallet });
}

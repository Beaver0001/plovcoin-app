import { signPreparedSwap } from './wallet-transaction.mjs';
const boundReviews = new WeakSet();

// Bind one explicit signing attempt to one review and wallet event lifetime.
// subscribe must synchronously register ALL account, network, disconnect,
// reconnect and launch-policy events, even when the state returns to its old
// value. The caller must dispose on review replacement or component unmount.
// This module neither discovers/connects a wallet nor submits a transaction.
export function createWalletReviewSession({ prepared, review, wallet, readContext, readWalletState, subscribe }) {
  if (!prepared || !review || typeof wallet?.signTransaction !== 'function' || typeof readContext !== 'function' || typeof readWalletState !== 'function' || typeof subscribe !== 'function') throw Error('Wallet review session inputs required');
  if (typeof review !== 'object') throw Error('Wallet review object required');
  if (boundReviews.has(review)) throw Error('Review already bound; prepare a new review');
  boundReviews.add(review);
  let invalidated = false, attempted = false, unsubscribe = null;
  const invalidate = () => { invalidated = true; };
  const dispose = () => {
    invalidate();
    const stop = unsubscribe;
    unsubscribe = null;
    if (typeof stop === 'function') stop();
  };
  const check = () => {
    if (invalidated) throw Error('Wallet session changed; prepare a new review');
    const state = readWalletState();
    // Recheck the latch: a synchronous state reader can itself dispatch events.
    if (invalidated) throw Error('Wallet session changed; prepare a new review');
    if (state?.launchEnabled !== true || state.wallet !== review.wallet || state.network !== review.network) {
      invalidate();
      throw Error('Wallet session changed; prepare a new review');
    }
  };
  try {
    // Listen before sampling so an event during initial sampling also latches.
    unsubscribe = subscribe(invalidate);
    if (typeof unsubscribe !== 'function') throw Error('Wallet event unsubscribe required');
    check();
  } catch (error) {
    dispose();
    throw error;
  }
  return Object.freeze({
    dispose,
    async sign() {
      if (attempted) throw Error('Wallet session already used; prepare a new review');
      attempted = true;
      try {
        check();
        const signed = await signPreparedSwap({ prepared, review, wallet: { signTransaction: async transaction => {
          check();
          const result = await wallet.signTransaction(transaction);
          check();
          return result;
        } }, readContext: async input => {
          check();
          const context = await readContext(input);
          check();
          return context;
        } });
        check();
        return signed;
      } finally {
        dispose();
      }
    },
  });
}

import { PublicKey } from '@solana/web3.js';
import { createWalletReviewSession } from './wallet-session.mjs';
import { refreshVerifiedSwapContext } from './live-accounts.mjs';

// Traditional injected-provider compatibility only. No discovery, connect,
// reconnect, network switching or signAndSend fallback. The provider must be
// supplied by the trusted host after a separate explicit connection action.
function injectedPhantomBindings({ provider, preflight, readAppState, subscribeAppState }) {
  if (provider?.isPhantom !== true || typeof provider.signTransaction !== 'function' || typeof provider.on !== 'function' || typeof provider.removeListener !== 'function') throw Error('Injected Phantom sign-only provider required');
  if (!preflight?.prepared || !preflight.review || typeof readAppState !== 'function' || typeof subscribeAppState !== 'function') throw Error('Verified preflight and app state events required');
  const readWalletState = () => {
    const app = readAppState();
    const wallet = provider.isConnected === true && provider.publicKey
      ? new PublicKey(provider.publicKey.toBytes()).toBase58() : null;
    return { wallet, network: app?.network, launchEnabled: app?.launchEnabled === true };
  };
  return {
    wallet: { signTransaction: transaction => provider.signTransaction(transaction) },
    readWalletState,
    subscribe: invalidate => {
      const registered = [];
      let stopApp = null;
      const stop = () => {
        const errors = [];
        if (typeof stopApp === 'function') {
          const fn = stopApp; stopApp = null;
          try { fn(); } catch (error) { errors.push(error); }
        }
        for (const event of registered.splice(0)) {
          try { provider.removeListener(event, invalidate); } catch (error) { errors.push(error); }
        }
        if (errors.length) throw new AggregateError(errors, 'Wallet listener cleanup failed');
      };
      try {
        for (const event of ['connect', 'accountChanged', 'disconnect']) {
          registered.push(event);
          provider.on(event, invalidate);
        }
        // Application owns selected RPC/network and launch policy, separately
        // from the injected provider. Every change, including a round trip,
        // must be synchronously published before returning to application code.
        stopApp = subscribeAppState(invalidate);
        if (typeof stopApp !== 'function') throw Error('App state unsubscribe required');
        return stop;
      } catch (error) {
        try { stop(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Wallet subscription failed'); }
        throw error;
      }
    },
  };
}

// Sign-only remains separate from the controller's approve/claim/send path.
export function createInjectedPhantomReviewSession({ connection, ...options }) {
  const bindings = injectedPhantomBindings(options);
  return createWalletReviewSession({
    ...bindings,
    prepared: options.preflight.prepared,
    review: options.preflight.review,
    readContext: input => refreshVerifiedSwapContext(connection, options.preflight, { ...input, readWalletState: bindings.readWalletState }),
  });
}

// Unmounted dispatch candidate. Borrow a trusted, already configured lifecycle
// controller; no connect, storage open, RPC query, signature or send here.
// Calling approve() IS a sign/claim/send action, never a sign-only diagnostic.
export function bindInjectedPhantomSwapAttempt({ controller, intentId, ...options }) {
  if (typeof controller?.bindSwap !== 'function') throw Error('Explicit lifecycle controller required');
  return controller.bindSwap({ ...injectedPhantomBindings(options), preflight: options.preflight, intentId });
}

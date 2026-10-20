import { createWalletSwapAttempt } from './swap-attempt.mjs';
import { verifiedPreflightBinding, refreshVerifiedSwapContext } from './live-accounts.mjs';
import { copyReceipt, receiptStoreIdentity } from './receipt-store.mjs';
import { observationStoreBinding } from './observation-store.mjs';
import { rpcAdapterBinding } from './swap-rpc.mjs';
import { observationWriteIssue } from './observation-policy.mjs';

const FIELDS = ['intentId', 'reviewId', 'signature', 'genesis', 'blockhash', 'lastValidBlockHeight', 'expiresAtMs', 'state'];
const plainReceipt = row => copyReceipt(Object.fromEntries(FIELDS.map(k => [k, row[k]])));
const identityEqual = (a, b) => a && b && FIELDS.filter(k => k !== 'state').every(k => a[k] === b[k]);
const identifier = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(s);
const safe = n => Number.isSafeInteger(n) && n >= 0;
const conservativeReceipt = (outcome, saved) => saved?.state === 'UNKNOWN' ? Object.freeze({ ...outcome, state: 'UNKNOWN' }) : outcome;

// Borrowed genuine handles; no discovery, permission prompts, initialization,
// automatic network queries or resource ownership merely on construction.
export function createSwapLifecycleController({ connection, receiptStore, observationStore, rpcAdapter, minimumContextSlot }) {
  receiptStoreIdentity(receiptStore);
  const storeBinding = observationStoreBinding(observationStore), rpcBinding = rpcAdapterBinding(rpcAdapter);
  if (storeBinding.receiptStore !== receiptStore || rpcBinding.connection !== connection || !storeBinding.rpcIdentities.includes(rpcBinding.rpcIdentity) || !safe(minimumContextSlot)) throw Error('Lifecycle connection/store/RPC binding mismatch or unsafe floor');
  let closed = false;
  const attempts = new Set(), consumedIntents = new Set(), queries = new Map();
  const check = () => {
    if (closed || !receiptStore.isOpen() || !observationStore.isOpen()) throw Error('Lifecycle controller or store closed');
    rpcBinding.assertCurrent();
  };
  check();
  const result = value => Object.freeze({ ...value, canAutomaticallyDispatch: false });
  async function readReceipt(intentId) { try { return { known: true, receipt: await receiptStore.get(intentId) }; } catch { return { known: false, receipt: null }; } }
  const stopAll = stops => {
    const errors = [];
    for (const stop of stops.splice(0).reverse()) { try { stop(); } catch (e) { errors.push(e); } }
    if (errors.length) throw new AggregateError(errors, 'Lifecycle subscription cleanup failed');
  };
  return Object.freeze({
    dispose() {
      if (closed) return Object.freeze({ cleanupFailed: false });
      closed = true; let cleanupFailed = false;
      for (const attempt of [...attempts]) cleanupFailed = attempt.dispose().cleanupFailed || cleanupFailed;
      return Object.freeze({ cleanupFailed });
    },
    bindSwap({ preflight, wallet, readWalletState, subscribe, intentId }) {
      check();
      if (!identifier(intentId) || consumedIntents.has(intentId) || typeof readWalletState !== 'function' || typeof subscribe !== 'function' || typeof wallet?.signTransaction !== 'function') throw Error('Unused intent and explicit wallet dependencies required');
      const binding = verifiedPreflightBinding(connection, preflight);
      if (binding.minContextSlot < minimumContextSlot) throw Error('Preflight is below lifecycle slot floor');
      consumedIntents.add(intentId);
      let used = false, cleanupFailed = false, candidate = null, core;
      const dispose = () => {
        attempts.delete(attempt);
        try { core.dispose(); } catch { cleanupFailed = true; }
        return Object.freeze({ cleanupFailed });
      };
      core = createWalletSwapAttempt({
        ...binding, wallet, intentId, readWalletState,
        readContext: input => { check(); return refreshVerifiedSwapContext(connection, preflight, { ...input, readWalletState }); },
        subscribe: fn => {
          const stops = [];
          try {
            // Register resource invalidations before external host subscription.
            for (const resource of [receiptStore, observationStore, rpcAdapter]) stops.push(resource.subscribeInvalidation(fn));
            const stop = subscribe(fn);
            if (typeof stop !== 'function') throw Error('Wallet event unsubscribe required');
            stops.push(stop); check();
            return () => stopAll(stops);
          } catch (e) { try { stopAll(stops); } catch (cleanup) { throw new AggregateError([e, cleanup], 'Lifecycle binding failed'); } throw e; }
        },
        claimIntent: receipt => { candidate = receipt; return receiptStore.claim(receipt); },
        enqueue: (bytes, receipt, context) => {
          check();
          if (context.minContextSlot < minimumContextSlot) throw Error('Dispatch below lifecycle floor');
          return rpcAdapter.enqueue(bytes, receipt, context);
        },
      });
      const attempt = Object.freeze({
        dispose,
        async approve() {
          if (used) throw Error('Lifecycle attempt already used');
          used = true;
          try {
            check();
            const existing = await receiptStore.get(intentId);
            check();
            if (existing) return result({ phase: 'EXISTING_INTENT', receipt: existing, claimPersistence: 'PRESENT', outcomePersistence: 'NOT_ATTEMPTED' });
            let outcome;
            try { outcome = await core.approve(); }
            catch (e) {
              const saved = await readReceipt(intentId);
              if (saved.receipt || candidate) return result({ phase: 'ATTEMPT_INTERRUPTED', receipt: saved.receipt || candidate, claimPersistence: saved.known ? (saved.receipt ? 'PRESENT' : 'NOT_FOUND') : 'UNACKNOWLEDGED', outcomePersistence: 'NOT_ATTEMPTED' });
              throw e;
            }
            // Delivery has already crossed enqueue. Even dispose/failed storage
            // must return the original receipt, never an "unsent" exception.
            if (cleanupFailed) outcome = Object.freeze({ ...outcome, cleanupFailed: true });
            try {
              const storedReceipt = await receiptStore.recordOutcome(outcome);
              return result({ phase: 'ENQUEUE_ENTERED', receipt: conservativeReceipt(outcome, storedReceipt), storedReceipt, outcomePersistence: 'ACKNOWLEDGED' });
            } catch {
              const saved = await readReceipt(intentId);
              const present = identityEqual(saved.receipt, outcome) && (saved.receipt.state === outcome.state || saved.receipt.state === 'UNKNOWN');
              return result({ phase: 'ENQUEUE_ENTERED', receipt: conservativeReceipt(outcome, saved.receipt), storedReceipt: saved.receipt, outcomePersistence: present ? 'PRESENT_AFTER_READBACK' : 'UNACKNOWLEDGED' });
            }
          } finally { dispose(); }
        },
      });
      attempts.add(attempt);
      return attempt;
    },
    async recover() {
      check();
      const receipts = await receiptStore.recover(), observations = await observationStore.recover();
      check();
      const byIntent = new Map(observations.map(row => [row.receipt.intentId, row]));
      return Object.freeze(receipts.map(row => {
        const receipt = plainReceipt(row), projection = byIntent.get(receipt.intentId) || null;
        if (projection && !identityEqual(receipt, projection.receipt)) throw Error('Recovery receipt identity changed');
        return result({ receipt, projection, minimumContextSlot: Math.max(minimumContextSlot, projection?.maxContextSlot ?? 0), recoveryState: 'RECONCILE' });
      }));
    },
    reconcile(intentId) {
      check();
      if (!identifier(intentId)) throw Error('Intent ID required');
      if (queries.has(intentId)) return queries.get(intentId);
      const work = (async () => {
        const receipt = await receiptStore.get(intentId);
        if (!receipt) throw Error('Committed intent required for reconciliation');
        const previous = await observationStore.get(intentId);
        check();
        const floor = Math.max(minimumContextSlot, previous?.maxContextSlot ?? 0);
        const observation = await rpcAdapter.reconcile(receipt, { minContextSlot: floor });
        // An already-entered read can finish persistence after dispose; it can
        // never cause signing, a new network request or submission from here.
        try {
          const projection = await observationStore.recordObservation(observation);
          return result({ receipt, observation, projection, observationPersistence: 'ACKNOWLEDGED', observationWriteIssue: null });
        } catch (error) {
          let projection = null;
          try { projection = await observationStore.get(intentId); } catch {}
          const present = projection?.history.some(event => event.sequence > (previous?.revision ?? 0) && ['observation', 'contextSlot', 'executionSlot', 'rpcIdentity'].every(k => event[k] === observation[k]));
          return result({ receipt, observation, projection, observationPersistence: present ? 'PRESENT_AFTER_READBACK' : 'UNACKNOWLEDGED', observationWriteIssue: present ? null : observationWriteIssue(error) });
        }
      })();
      queries.set(intentId, work);
      void work.finally(() => { if (queries.get(intentId) === work) queries.delete(intentId); }).catch(() => {});
      return work;
    },
  });
}

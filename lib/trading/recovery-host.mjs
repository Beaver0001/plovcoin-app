import { openSwapReceiptStore } from './receipt-store.mjs';
import { openSwapObservationStore } from './observation-store.mjs';
import { createSwapRpcAdapter } from './swap-rpc.mjs';
import { createSwapLifecycleController } from './swap-lifecycle.mjs';

const INITIAL = Object.freeze({ phase: 'IDLE', cleanupFailed: false });
const FIELDS = ['schema', 'scope', 'origin', 'receiptDatabaseName', 'observationDatabaseName', 'epochId', 'rpcEndpoint', 'rpcIdentities', 'minimumContextSlot', 'timeoutMs'];
const identifier = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(s);
const digest = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
const safe = n => Number.isSafeInteger(n) && n >= 0;
const unavailable = () => Error('Recovery host unavailable');
function configuration(input) {
  if (!input || typeof input !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw Error('Explicit rehearsal configuration required');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(input).length !== FIELDS.length || Reflect.ownKeys(input).some(k => !FIELDS.includes(k)) || FIELDS.some(k => !descriptors[k] || !Object.hasOwn(descriptors[k], 'value'))) throw Error('Explicit rehearsal data fields required');
  const c = Object.fromEntries(FIELDS.map(k => [k, descriptors[k].value]));
  if (c.schema !== 1 || c.scope !== 'ISOLATED_REHEARSAL' || !identifier(c.receiptDatabaseName) || !identifier(c.observationDatabaseName) || c.receiptDatabaseName === c.observationDatabaseName || !identifier(c.epochId) || !safe(c.minimumContextSlot) || !safe(c.timeoutMs) || c.timeoutMs < 1 || c.timeoutMs > 60000 || !Array.isArray(c.rpcIdentities) || !c.rpcIdentities.length || c.rpcIdentities.length > 16 || c.rpcIdentities.some(x => !digest(x)) || new Set(c.rpcIdentities).size !== c.rpcIdentities.length) throw Error('Invalid rehearsal configuration');
  const origin = new URL(c.origin), rpc = new URL(c.rpcEndpoint);
  // This candidate cannot bootstrap production. No localhost/HTTP exception is
  // inferred from NODE_ENV, browser globals or a failed production attempt.
  if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || origin.origin !== c.origin || rpc.protocol !== 'https:' || rpc.username || rpc.password || rpc.hash || rpc.href !== c.rpcEndpoint) throw Error('Explicit loopback rehearsal origin and canonical HTTPS RPC required');
  return Object.freeze({ ...c, rpcIdentities: Object.freeze([...c.rpcIdentities].sort()) });
}

// Rehearsal-only owner of newly opened handles. Construction/import is inert.
// Never initializes/recreates databases, requests persistence or discovers a
// wallet. Its public source has no sign/send/bind/claim/reset/release capability.
export function createSwapRecoveryHost({ configuration: input, readOrigin, indexedDB, storageManager, connection, fetch: fetchImpl }) {
  const config = configuration(input);
  if (typeof readOrigin !== 'function' || typeof indexedDB?.open !== 'function' || typeof storageManager?.persisted !== 'function' || typeof fetchImpl !== 'function' || !connection || typeof connection !== 'object') throw Error('Explicit recovery dependencies required');
  let state = INITIAL, work = null, stopped = false, receipts = null, observations = null, rpc = null, controller = null;
  const listeners = new Set(), unsubscribes = [], lifetime = new AbortController();
  const publish = phase => { state = Object.freeze({ phase, cleanupFailed: state.cleanupFailed }); for (const fn of [...listeners]) { try { fn(); } catch {} } };
  const cleanup = () => {
    let failed = state.cleanupFailed;
    for (const stop of unsubscribes.splice(0).reverse()) { try { stop(); } catch { failed = true; } }
    for (const resource of [controller, rpc, observations, receipts]) {
      try { if (resource === controller) failed = resource?.dispose().cleanupFailed || failed; else resource?.close(); } catch { failed = true; }
    }
    controller = rpc = observations = receipts = null;
    state = Object.freeze({ ...state, cleanupFailed: failed });
  };
  const stop = phase => {
    if (stopped) return state;
    stopped = true; lifetime.abort(); cleanup(); publish(phase); return state;
  };
  const context = () => {
    if (stopped) throw unavailable();
    if (readOrigin() !== config.origin || connection.rpcEndpoint !== config.rpcEndpoint) { stop('ERROR'); throw unavailable(); }
  };
  const ready = () => {
    context();
    if (state.phase !== 'READY' || !controller || !receipts.isOpen() || !observations.isOpen()) throw unavailable();
    return controller;
  };
  // One upstream AbortSignal and the owner's lifetime both reach fetch. The
  // adapter still bounds even a trusted fetch that ignores abort; no retry.
  const ownedFetch = (url, init) => {
    context();
    const abort = new AbortController(), signals = [lifetime.signal, init.signal];
    const release = () => { for (const signal of signals) signal.removeEventListener('abort', cancel); };
    const cancel = () => { abort.abort(); release(); };
    for (const signal of signals) { if (signal.aborted) cancel(); else signal.addEventListener('abort', cancel, { once: true }); }
    try {
      return Promise.resolve(fetchImpl(url, { ...init, signal: abort.signal })).then(response => {
        if (!response || response.ok !== true || response.redirected === true || typeof response.json !== 'function') { release(); return response; }
        return { ok: true, redirected: false, async json() { try { return await response.json(); } finally { release(); } } };
      }, error => { release(); throw error; });
    }
    catch (e) { release(); throw e; }
  };
  const source = Object.freeze({
    async recover() { try { const result = await ready().recover(); ready(); return result; } catch { throw unavailable(); } },
    async reconcile(intentId) { try { const result = await ready().reconcile(intentId); ready(); return result; } catch { throw unavailable(); } },
  });
  return Object.freeze({
    source,
    getSnapshot: () => state,
    getServerSnapshot: () => INITIAL,
    subscribe(fn) { if (typeof fn !== 'function') throw Error('Listener required'); listeners.add(fn); return () => { listeners.delete(fn); }; },
    close: () => stop('CLOSED'),
    open() {
      if (stopped) return Promise.reject(unavailable());
      if (work) return work;
      // Defer the body so synchronous duplicate open calls share one promise.
      work = Promise.resolve().then(async () => {
        try {
          context();
          const identity = Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(config.rpcEndpoint))), x => x.toString(16).padStart(2, '0')).join('');
          context();
          if (!config.rpcIdentities.includes(identity)) throw unavailable();
          receipts = await openSwapReceiptStore({ indexedDB, storageManager, databaseName: config.receiptDatabaseName, epochId: config.epochId, initialize: false });
          context();
          observations = await openSwapObservationStore({ indexedDB, storageManager, databaseName: config.observationDatabaseName, receiptStore: receipts, rpcIdentities: config.rpcIdentities, initialize: false });
          context();
          rpc = await createSwapRpcAdapter({ connection, fetch: ownedFetch, timeoutMs: config.timeoutMs });
          context();
          controller = createSwapLifecycleController({ connection, receiptStore: receipts, observationStore: observations, rpcAdapter: rpc, minimumContextSlot: config.minimumContextSlot });
          for (const resource of [receipts, observations, rpc]) unsubscribes.push(resource.subscribeInvalidation(() => stop('ERROR')));
          context(); publish('READY'); context(); return source;
        } catch {
          if (!stopped) stop('ERROR'); else cleanup();
          throw unavailable();
        }
      });
      publish('OPENING');
      return work;
    },
  });
}

import { copyReceipt, receiptStoreIdentity } from './receipt-store.mjs';
import { snapshotRpcObservation } from './swap-rpc.mjs';

const RECEIPT_FIELDS = ['intentId', 'reviewId', 'signature', 'genesis', 'blockhash', 'lastValidBlockHeight', 'expiresAtMs', 'state'];
const EVENT_FIELDS = ['sequence', 'observation', 'contextSlot', 'executionSlot', 'rpcIdentity'];
const CODES = ['FINALIZED_SUCCESS_OBSERVED', 'FINALIZED_ERROR_OBSERVED', 'NONFINAL_SUCCESS_OBSERVED', 'NONFINAL_ERROR_OBSERVED', 'UNRESOLVED_VALID_BLOCKHASH', 'UNRESOLVED_EXPIRED_BLOCKHASH', 'UNRESOLVED_RPC'];
const safe = n => Number.isSafeInteger(n) && n >= 0;
const identifier = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(s);
const digest = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
const sameReceipt = (a, b) => RECEIPT_FIELDS.filter(k => k !== 'state').every(k => a[k] === b[k]);
const exactKeys = (value, keys) => value && typeof value === 'object' && Reflect.ownKeys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
const finalized = event => event.observation.startsWith('FINALIZED_');
const bindings = new WeakMap();
export function observationStoreBinding(store) {
  const binding = bindings.get(store);
  if (!binding) throw Error('Original observation store handle required');
  return binding;
}

// Pure replay is also used on every read/write: a corrupt cached projection
// cannot hide contradictory or stale evidence. These helpers are internal to
// this module's integration, not exported by the browser engine facade.
export function projectObservationRecord(row, rpcIdentities) {
  if (!exactKeys(row, ['intentId', 'receipt', 'events']) || !Array.isArray(row.events) || !row.events.length) throw Error('Corrupt observation record');
  const receipt = copyReceipt(row.receipt);
  if (receipt.intentId !== row.intentId) throw Error('Observation receipt identity mismatch');
  let maxContextSlot = null, latest = null, terminal = null, firstFinalized = null, conflict = false;
  const history = row.events.map((raw, i) => {
    if (!exactKeys(raw, EVENT_FIELDS) || raw.sequence !== i + 1 || !CODES.includes(raw.observation) || !digest(raw.rpcIdentity) || !rpcIdentities.includes(raw.rpcIdentity)) throw Error('Corrupt observation event');
    const event = Object.freeze(Object.fromEntries(EVENT_FIELDS.map(k => [k, raw[k]])));
    const hasExecution = finalized(event) || event.observation.startsWith('NONFINAL_');
    if (event.observation === 'UNRESOLVED_RPC') {
      if (event.contextSlot !== null || event.executionSlot !== null) throw Error('Invalid unresolved evidence');
    } else if (!safe(event.contextSlot) || (hasExecution ? !safe(event.executionSlot) || event.executionSlot > event.contextSlot : event.executionSlot !== null)) throw Error('Invalid observation slots');
    let disposition;
    // Contradictory finalized evidence is retained even when its RPC context is
    // older. No timestamp/provider ranking can silently resolve this conflict.
    const contradiction = finalized(event) && firstFinalized && (event.observation !== firstFinalized.observation || event.executionSlot !== firstFinalized.executionSlot);
    if (finalized(event) && !firstFinalized) firstFinalized = event;
    if (contradiction) {
      conflict = true; disposition = 'CONFLICT';
    } else if (maxContextSlot !== null && event.contextSlot !== null && event.contextSlot < maxContextSlot) {
      disposition = 'STALE';
    } else if (terminal) {
      disposition = 'TERMINAL_RETAINED';
    } else if (event.contextSlot === null) {
      disposition = 'UNRESOLVED';
    } else {
      disposition = 'ACCEPTED'; latest = event;
      if (finalized(event)) terminal = event;
    }
    if (event.contextSlot !== null) maxContextSlot = maxContextSlot === null ? event.contextSlot : Math.max(maxContextSlot, event.contextSlot);
    return Object.freeze({ ...event, disposition });
  });
  return Object.freeze({ receipt, revision: history.length, maxContextSlot, observation: conflict ? 'FINALIZED_CONFLICT' : (terminal || latest)?.observation || 'UNRESOLVED_RPC', terminalEvidence: terminal, conflict, history: Object.freeze(history), canAutomaticallyDispatch: false });
}

// Independent schema: the original v74 receipt database is never upgraded,
// reset or migrated. First initialization of this companion DB is explicit.
export async function openSwapObservationStore({ indexedDB, storageManager, databaseName, receiptStore, rpcIdentities, initialize = false }) {
  const receiptIdentity = receiptStoreIdentity(receiptStore);
  if (!identifier(databaseName) || databaseName === receiptIdentity.databaseName || typeof indexedDB?.open !== 'function' || typeof storageManager?.persisted !== 'function' || !Array.isArray(rpcIdentities) || !rpcIdentities.length || rpcIdentities.some(x => !digest(x)) || new Set(rpcIdentities).size !== rpcIdentities.length || typeof initialize !== 'boolean' || !receiptStore.isOpen()) throw Error('Explicit observation database, open receipt store and RPC identities required');
  rpcIdentities = Object.freeze([...rpcIdentities].sort());
  const expected = Object.freeze({ key: 'identity', schema: 1, genesis: receiptIdentity.genesis, receiptDatabaseName: receiptIdentity.databaseName, receiptEpochId: receiptIdentity.epochId, rpcIdentities });
  const persistence = async () => { if (await storageManager.persisted() !== true) throw Error('Persistent storage is not granted'); };
  if (initialize) await persistence();
  let created = false;
  const db = await new Promise((resolve, reject) => {
    let settled = false, openingError = null;
    const request = indexedDB.open(databaseName, 1);
    const fail = e => { if (!settled) { settled = true; reject(e); } };
    request.onblocked = () => fail(Error('Observation database opening blocked'));
    request.onupgradeneeded = event => {
      if (settled || !initialize || event.oldVersion !== 0) { openingError = Error('Observation database missing; explicit initialization/reconciliation required'); request.transaction.abort(); return; }
      created = true;
      request.result.createObjectStore('identity', { keyPath: 'key' }).add(expected);
      request.result.createObjectStore('records', { keyPath: 'intentId' });
    };
    request.onerror = () => fail(openingError || request.error || Error('Observation database open failed'));
    request.onsuccess = () => { if (settled) { request.result.close(); return; } settled = true; resolve(request.result); };
  });
  let closed = false, stopReceipt = null;
  const listeners = new Set();
  const close = () => { if (closed) return; closed = true; db.close(); const stop = stopReceipt; stopReceipt = null; if (stop) stop(); for (const fn of [...listeners]) { try { fn(); } catch {} } listeners.clear(); };
  db.onversionchange = close; db.onclose = close;
  const writable = async () => { if (closed || !receiptStore.isOpen()) throw Error('Observation store closed'); await persistence(); if (closed || !receiptStore.isOpen()) throw Error('Observation store closed'); };
  const run = (stores, mode, work) => new Promise((resolve, reject) => {
    if (closed) { reject(Error('Observation store closed')); return; }
    let tx, result, failure = null;
    try {
      tx = db.transaction(stores, mode, mode === 'readwrite' ? { durability: 'strict' } : undefined);
      tx.onabort = () => reject(failure || tx.error || Error('Observation transaction aborted'));
      tx.oncomplete = () => resolve(result);
      if (mode === 'readwrite' && tx.durability !== 'strict') throw Error('Strict observation durability unavailable');
      const fail = error => { failure = error; try { tx.abort(); } catch { reject(error); } };
      work(tx, value => { result = value; }, fail);
    } catch (e) { failure = e; if (tx) { try { tx.abort(); } catch { reject(e); } } else reject(e); }
  });
  const readRow = intentId => run(['records'], 'readonly', (tx, done) => { tx.objectStore('records').get(intentId).onsuccess = e => done(e.target.result); });
  async function claimedReceipt(receipt) {
    const original = await receiptStore.get(receipt.intentId);
    if (!original || !sameReceipt(original, receipt)) throw Error('Observation does not match a committed receipt');
    return original;
  }
  try {
    if (db.version !== 1 || db.objectStoreNames.length !== 2 || !db.objectStoreNames.contains('identity') || !db.objectStoreNames.contains('records')) throw Error('Unsupported observation schema');
    const actual = await run(['identity', 'records'], 'readonly', (tx, done) => {
      for (const [name, key] of [['identity', 'key'], ['records', 'intentId']]) { const store = tx.objectStore(name); if (store.keyPath !== key || store.autoIncrement || store.indexNames.length) throw Error('Unsupported observation store schema'); }
      tx.objectStore('identity').get('identity').onsuccess = e => done(e.target.result);
    });
    if (!exactKeys(actual, Object.keys(expected)) || Object.keys(expected).some(k => k === 'rpcIdentities' ? JSON.stringify(actual[k]) !== JSON.stringify(expected[k]) : actual[k] !== expected[k])) throw Error('Observation database identity mismatch');
    if (created) await run(['identity'], 'readwrite', (tx, done) => { tx.objectStore('identity').put(expected); done(true); });
    stopReceipt = receiptStore.subscribeInvalidation(close);
    if (closed || !receiptStore.isOpen()) throw Error('Receipt store closed during observation initialization');
  } catch (e) { close(); throw e; }
  const api = Object.freeze({
    close,
    isOpen: () => !closed,
    subscribeInvalidation(fn) {
      if (typeof fn !== 'function') throw Error('Invalidation callback required');
      if (closed) { fn(); return () => {}; }
      listeners.add(fn); return () => listeners.delete(fn);
    },
    async recordObservation(input) {
      // Genuine adapter object, not imported JSON/copied UI fields. Snapshot is
      // frozen by the adapter before any await in this operation.
      const observation = snapshotRpcObservation(input);
      if (!rpcIdentities.includes(observation.rpcIdentity)) throw Error('Unapproved observation RPC');
      const receipt = copyReceipt(Object.fromEntries(RECEIPT_FIELDS.map(k => [k, observation[k]])));
      await writable();
      const original = await claimedReceipt(receipt);
      await writable();
      const projection = await run(['records'], 'readwrite', (tx, done, fail) => {
        const store = tx.objectStore('records'), request = store.get(receipt.intentId);
        request.onsuccess = () => {
          try {
            const row = request.result || { intentId: receipt.intentId, receipt: original, events: [] };
            if (request.result) { projectObservationRecord(row, rpcIdentities); if (!sameReceipt(row.receipt, receipt)) throw Error('Stored observation identity changed'); }
            const sequence = row.events.length + 1;
            if (!Number.isSafeInteger(sequence)) throw Error('Observation sequence exhausted');
            const event = Object.fromEntries(EVENT_FIELDS.map(k => [k, k === 'sequence' ? sequence : observation[k]]));
            const next = { ...row, events: [...row.events, event] };
            const result = projectObservationRecord(next, rpcIdentities);
            store.put(next); done(result);
          } catch (e) { fail(e); }
        };
      });
      await writable();
      return projection;
    },
    async get(intentId) {
      if (!identifier(intentId)) throw Error('Intent ID required');
      const row = await readRow(intentId);
      if (row === undefined) return null;
      const projection = projectObservationRecord(row, rpcIdentities);
      await claimedReceipt(projection.receipt);
      return projection;
    },
    async recover() {
      const rows = await run(['records'], 'readonly', (tx, done) => { tx.objectStore('records').getAll().onsuccess = e => done(e.target.result); });
      const results = [];
      for (const row of rows) { const projection = projectObservationRecord(row, rpcIdentities); await claimedReceipt(projection.receipt); results.push(projection); }
      return Object.freeze(results.sort((a, b) => a.receipt.intentId.localeCompare(b.receipt.intentId)));
    },
  });
  bindings.set(api, Object.freeze({ receiptStore, rpcIdentities }));
  return api;
}

import bs58 from 'bs58';

const GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const FIELDS = ['intentId', 'reviewId', 'signature', 'genesis', 'blockhash', 'lastValidBlockHeight', 'expiresAtMs', 'state'];
const STATES = ['DISPATCH_INTENT', 'PENDING', 'UNKNOWN'];
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
function encoded(value, length) {
  if (typeof value !== 'string') return false;
  try { const bytes = bs58.decode(value); return bytes.length === length && bs58.encode(bytes) === value && (length !== 64 || bytes.some(x => x !== 0)); } catch { return false; }
}
function copyReceipt(input, states = STATES, allowCleanup = false) {
  if (!input || typeof input !== 'object') throw Error('Receipt object required');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(input);
  if (keys.some(k => typeof k !== 'string' || (!FIELDS.includes(k) && !(allowCleanup && k === 'cleanupFailed'))) || FIELDS.some(k => !descriptors[k] || !Object.hasOwn(descriptors[k], 'value')) || keys.some(k => !Object.hasOwn(descriptors[k], 'value'))) throw Error('Unexpected receipt fields');
  const r = Object.fromEntries(FIELDS.map(k => [k, descriptors[k].value]));
  if (!identifier(r.intentId) || typeof r.reviewId !== 'string' || !/^[a-f0-9]{64}$/.test(r.reviewId) || !encoded(r.signature, 64) || !encoded(r.blockhash, 32) || r.genesis !== GENESIS || !Number.isSafeInteger(r.lastValidBlockHeight) || r.lastValidBlockHeight < 0 || !Number.isSafeInteger(r.expiresAtMs) || r.expiresAtMs <= 0 || !states.includes(r.state) || (descriptors.cleanupFailed && typeof descriptors.cleanupFailed.value !== 'boolean')) throw Error('Invalid receipt');
  return Object.freeze(r);
}

// Explicitly opened by the host; import has no browser/storage side effects.
// initialize=true is only for a separately authorized first initialization,
// never an automatic fallback after a missing DB, epoch mismatch or data loss.
export async function openSwapReceiptStore({ indexedDB, storageManager, databaseName, epochId, initialize = false }) {
  if (typeof indexedDB?.open !== 'function' || typeof storageManager?.persisted !== 'function' || !identifier(databaseName) || !identifier(epochId) || typeof initialize !== 'boolean') throw Error('Explicit IndexedDB, persistence manager, database and epoch required');
  const persistence = async () => { if (await storageManager.persisted() !== true) throw Error('Persistent storage is not granted'); };
  if (initialize) await persistence();
  let created = false;
  const db = await new Promise((resolve, reject) => {
    let settled = false, openingError = null;
    const request = indexedDB.open(databaseName, 1);
    const fail = error => { if (!settled) { settled = true; reject(error); } };
    request.onblocked = () => fail(Error('Receipt database opening blocked'));
    request.onupgradeneeded = event => {
      if (settled || !initialize || event.oldVersion !== 0) {
        openingError = Error('Receipt database missing; explicit initialization/reconciliation required');
        request.transaction.abort(); return;
      }
      created = true;
      request.result.createObjectStore('identity', { keyPath: 'key' }).add({ key: 'identity', schema: 1, genesis: GENESIS, epochId });
      request.result.createObjectStore('receipts', { keyPath: 'intentId' });
    };
    request.onerror = () => fail(openingError || request.error || Error('Receipt database open failed'));
    request.onsuccess = () => {
      if (settled) { request.result.close(); return; }
      settled = true; resolve(request.result);
    };
  });
  let closed = false;
  const listeners = new Set();
  const invalidate = () => {
    if (closed) return;
    closed = true;
    for (const fn of [...listeners]) { try { fn(); } catch { /* A bad subscriber must not prevent other invalidations. */ } }
    listeners.clear();
  };
  const close = () => { invalidate(); db.close(); };
  db.onversionchange = close;
  db.onclose = invalidate;
  const writable = async () => { if (closed) throw Error('Receipt store closed'); await persistence(); if (closed) throw Error('Receipt store closed'); };
  const run = (stores, mode, work) => new Promise((resolve, reject) => {
    if (closed) { reject(Error('Receipt store closed')); return; }
    let tx, result, failure = null;
    try {
      tx = db.transaction(stores, mode, mode === 'readwrite' ? { durability: 'strict' } : undefined);
      tx.onabort = () => reject(failure || tx.error || Error('Receipt transaction aborted'));
      tx.oncomplete = () => resolve(result);
      if (mode === 'readwrite' && tx.durability !== 'strict') throw Error('Strict receipt durability unavailable');
      const fail = error => { failure = error; try { tx.abort(); } catch { reject(error); } };
      work(tx, value => { result = value; }, fail);
    } catch (error) {
      failure = error;
      if (tx) { try { tx.abort(); } catch { reject(error); } } else reject(error);
    }
  });
  try {
    if (db.version !== 1 || db.objectStoreNames.length !== 2 || !db.objectStoreNames.contains('identity') || !db.objectStoreNames.contains('receipts')) throw Error('Unsupported receipt database schema');
    const identity = await run(['identity', 'receipts'], 'readonly', (tx, done) => {
      const receipts = tx.objectStore('receipts'), meta = tx.objectStore('identity');
      if (receipts.keyPath !== 'intentId' || receipts.autoIncrement || receipts.indexNames.length || meta.keyPath !== 'key' || meta.autoIncrement || meta.indexNames.length) throw Error('Unsupported receipt store schema');
      meta.get('identity').onsuccess = event => done(event.target.result);
    });
    if (!identity || Object.keys(identity).length !== 4 || identity.key !== 'identity' || identity.schema !== 1 || identity.genesis !== GENESIS || identity.epochId !== epochId) throw Error('Receipt database identity mismatch');
    // Versionchange durability is not assumed sufficient for initialization.
    if (created) await run(['identity'], 'readwrite', (tx, done) => { tx.objectStore('identity').put(identity); done(true); });
  } catch (error) { close(); throw error; }
  return Object.freeze({
    close,
    isOpen: () => !closed,
    subscribeInvalidation(fn) {
      if (typeof fn !== 'function') throw Error('Invalidation callback required');
      if (closed) { fn(); return () => {}; }
      listeners.add(fn); return () => { listeners.delete(fn); };
    },
    async claim(input) {
      // Copy before any await, so later caller edits cannot change the record.
      const receipt = copyReceipt(input, ['DISPATCH_INTENT']);
      await writable();
      const added = await run(['receipts'], 'readwrite', (tx, done) => {
        const request = tx.objectStore('receipts').add(receipt);
        request.onsuccess = () => done(true);
        request.onerror = event => {
          if (request.error?.name === 'ConstraintError') { event.preventDefault(); event.stopPropagation(); done(false); }
        };
      });
      if (added === true) await writable();
      return added;
    },
    async get(intentId) {
      if (!identifier(intentId)) throw Error('Intent ID required');
      const value = await run(['receipts'], 'readonly', (tx, done) => { tx.objectStore('receipts').get(intentId).onsuccess = event => done(event.target.result); });
      return value === undefined ? null : copyReceipt(value);
    },
    async recordOutcome(input) {
      const receipt = copyReceipt(input, ['PENDING', 'UNKNOWN'], true);
      await writable();
      const result = await run(['receipts'], 'readwrite', (tx, done, fail) => {
        const store = tx.objectStore('receipts'), request = store.get(receipt.intentId);
        request.onsuccess = () => {
          try {
            const original = copyReceipt(request.result);
            if (FIELDS.filter(k => k !== 'state').some(k => original[k] !== receipt[k])) throw Error('Receipt outcome identity changed');
            const next = Object.freeze({ ...original, state: original.state === 'UNKNOWN' ? 'UNKNOWN' : receipt.state });
            store.put(next); done(next);
          } catch (error) { fail(error); }
        };
      });
      await writable();
      return result;
    },
    async recover() {
      // Read access remains possible after loss of persistence permission.
      const rows = await run(['receipts'], 'readonly', (tx, done) => { tx.objectStore('receipts').getAll().onsuccess = event => done(event.target.result); });
      return Object.freeze(rows.map(row => Object.freeze({ ...copyReceipt(row), recoveryState: 'RECONCILE', canAutomaticallyDispatch: false })).sort((a, b) => a.intentId.localeCompare(b.intentId)));
    },
  });
}

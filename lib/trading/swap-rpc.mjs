import { Buffer } from 'buffer';
import { Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

const GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const FIELDS = ['intentId', 'reviewId', 'signature', 'genesis', 'blockhash', 'lastValidBlockHeight', 'expiresAtMs', 'state'];
const observations = new WeakMap();
const adapters = new WeakMap();
export function rpcAdapterBinding(adapter) {
  const binding = adapters.get(adapter);
  if (!binding) throw Error('Original RPC adapter required');
  return binding;
}
export function snapshotRpcObservation(input) {
  const value = observations.get(input);
  if (!value) throw Error('Original RPC observation required');
  return value;
}
const safe = n => Number.isSafeInteger(n) && n >= 0;
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
function encoded(s, length) {
  try { const b = bs58.decode(s); return typeof s === 'string' && b.length === length && bs58.encode(b) === s && (length !== 64 || b.some(x => x)); } catch { return false; }
}
function receiptSnapshot(input, dispatch = false) {
  if (!input || typeof input !== 'object') throw Error('Public receipt required');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (FIELDS.some(k => !descriptors[k] || !Object.hasOwn(descriptors[k], 'value'))) throw Error('Public receipt data fields required');
  const r = Object.fromEntries(FIELDS.map(k => [k, descriptors[k].value]));
  if (typeof r.intentId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(r.intentId) || typeof r.reviewId !== 'string' || !/^[a-f0-9]{64}$/.test(r.reviewId) || !encoded(r.signature, 64) || !encoded(r.blockhash, 32) || r.genesis !== GENESIS || !safe(r.lastValidBlockHeight) || !safe(r.expiresAtMs) || r.expiresAtMs === 0 || !(dispatch ? ['DISPATCH_INTENT'] : ['DISPATCH_INTENT', 'PENDING', 'UNKNOWN']).includes(r.state)) throw Error('Invalid public receipt');
  return Object.freeze(r);
}

// Explicit candidate transport. The host/core still owns review authorization,
// durable claim, wallet event lifetime and final live context. No import effects.
export async function createSwapRpcAdapter({ connection, fetch: fetchImpl, timeoutMs = 10000 }) {
  const endpoint = connection?.rpcEndpoint;
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || typeof fetchImpl !== 'function' || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw Error('Explicit HTTPS RPC and bounded timeout required');
  const address = url.href;
  const rpcIdentity = Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(address))), x => x.toString(16).padStart(2, '0')).join('');
  let nextId = 0, closed = false;
  const used = new Set(), active = new Set(), listeners = new Set();
  const close = () => { if (closed) return; closed = true; for (const abort of [...active]) abort(); for (const fn of [...listeners]) { try { fn(); } catch {} } listeners.clear(); };
  const assertCurrent = () => { if (connection.rpcEndpoint !== endpoint) { close(); throw Error('RPC endpoint changed'); } if (closed) throw Error('RPC adapter closed'); };
  async function rpc(method, params) {
    if (closed || connection.rpcEndpoint !== endpoint) throw Error('RPC adapter closed or endpoint changed');
    const id = ++nextId;
    const controller = new AbortController();
    let timer, abort;
    // Bound the caller even when a custom fetch ignores AbortSignal. A late
    // response never triggers another send and cannot replace the receipt.
    const stopped = new Promise((_, reject) => {
      abort = () => { controller.abort(); reject(Error('RPC request interrupted')); };
      timer = setTimeout(abort, timeoutMs);
      active.add(abort);
    });
    const request = (async () => {
      const response = await fetchImpl(address, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }), signal: controller.signal, redirect: 'error', credentials: 'omit', cache: 'no-store' });
      if (!response || response.ok !== true || response.redirected === true) throw Error('RPC HTTP failure');
      const json = await response.json();
      if (closed || connection.rpcEndpoint !== endpoint || !json || json.jsonrpc !== '2.0' || json.id !== id || Object.hasOwn(json, 'error') || !Object.hasOwn(json, 'result')) throw Error('Invalid RPC response');
      return json.result;
    })();
    try { return await Promise.race([request, stopped]); }
    finally { clearTimeout(timer); active.delete(abort); }
  }
  const chain = async () => { if (await rpc('getGenesisHash', []) !== GENESIS) throw Error('Wrong RPC chain'); };
  try { await chain(); } catch (e) { close(); throw e; }
  const api = Object.freeze({
    identity: Object.freeze({ rpcIdentity, genesis: GENESIS }),
    close,
    subscribeInvalidation(fn) {
      if (typeof fn !== 'function') throw Error('Invalidation callback required');
      if (closed) { fn(); return () => {}; }
      listeners.add(fn); return () => listeners.delete(fn);
    },
    // Synchronous validation/copy followed immediately by one explicit HTTP
    // request. No await before fetch, no retries, no new blockhash/signature.
    enqueue(input, inputReceipt, inputContext) {
      if (closed || connection.rpcEndpoint !== endpoint) throw Error('RPC adapter closed or endpoint changed');
      const r = receiptSnapshot(inputReceipt, true);
      const minContextSlot = inputContext?.minContextSlot, currentBlockHeight = inputContext?.currentBlockHeight;
      if (!safe(minContextSlot) || !safe(currentBlockHeight) || currentBlockHeight > r.lastValidBlockHeight || Date.now() >= r.expiresAtMs) throw Error('Expired or invalid dispatch context');
      if (!(input instanceof Uint8Array) || input.length > 1232 || input.length === 0) throw Error('Signed transaction bytes required');
      const bytes = Uint8Array.from(input), tx = Transaction.from(bytes);
      if (!tx.verifySignatures(true) || tx.recentBlockhash !== r.blockhash || bs58.encode(tx.signature) !== r.signature || !same(bytes, tx.serialize({ requireAllSignatures: true, verifySignatures: true }))) throw Error('Signed transaction/receipt mismatch');
      if (used.has(r.intentId)) throw Error('RPC intent already attempted');
      const payload = Buffer.from(bytes).toString('base64');
      // Recheck time after cryptography/encoding, then consume before fetch.
      if (Date.now() >= r.expiresAtMs) throw Error('Dispatch expired during validation');
      used.add(r.intentId);
      return rpc('sendTransaction', [payload, { encoding: 'base64', skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 0, minContextSlot }]).then(signature => {
        if (signature !== r.signature) throw Error('RPC returned a different signature');
        return signature;
      });
    },
    async reconcile(inputReceipt, { minContextSlot } = {}) {
      const r = receiptSnapshot(inputReceipt);
      if (!safe(minContextSlot)) throw Error('Explicit reconciliation slot floor required');
      const result = (observation, slot = null, executionSlot = null) => {
        const value = Object.freeze({ ...r, observation, contextSlot: slot, executionSlot, rpcIdentity, canAutomaticallyDispatch: false });
        observations.set(value, value);
        return value;
      };
      try {
        await chain();
        const status = await rpc('getSignatureStatuses', [[r.signature], { searchTransactionHistory: true }]);
        if (!safe(status?.context?.slot) || status.context.slot < minContextSlot || !Array.isArray(status.value) || status.value.length !== 1) throw Error('Invalid status context');
        const value = status.value[0];
        if (value !== null) {
          if (!value || !safe(value.slot) || value.slot > status.context.slot || !['processed', 'confirmed', 'finalized'].includes(value.confirmationStatus) || !Object.hasOwn(value, 'err') || (value.err !== null && typeof value.err !== 'object' && typeof value.err !== 'string')) throw Error('Invalid transaction status');
          if (value.confirmationStatus === 'finalized') return result(value.err === null ? 'FINALIZED_SUCCESS_OBSERVED' : 'FINALIZED_ERROR_OBSERVED', status.context.slot, value.slot);
          return result(value.err === null ? 'NONFINAL_SUCCESS_OBSERVED' : 'NONFINAL_ERROR_OBSERVED', status.context.slot, value.slot);
        }
        const valid = await rpc('isBlockhashValid', [r.blockhash, { commitment: 'finalized', minContextSlot: status.context.slot }]);
        if (!safe(valid?.context?.slot) || valid.context.slot < status.context.slot || typeof valid.value !== 'boolean') throw Error('Invalid blockhash context');
        // Even an expired hash plus history-null cannot prove non-execution on
        // a pruned/partial RPC. Keep the original intent, never release it.
        return result(valid.value ? 'UNRESOLVED_VALID_BLOCKHASH' : 'UNRESOLVED_EXPIRED_BLOCKHASH', valid.context.slot);
      } catch { return result('UNRESOLVED_RPC'); }
    },
  });
  adapters.set(api, Object.freeze({ connection, rpcIdentity, assertCurrent }));
  return api;
}

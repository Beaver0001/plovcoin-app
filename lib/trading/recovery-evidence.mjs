import { copyReceipt } from './receipt-store.mjs';
import { projectObservationRecord } from './observation-store.mjs';

const FORMAT = 'PLOV_RECOVERY_EVIDENCE', GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
export const RECOVERY_EXPORT_LIMITS = Object.freeze({ bytes: 4 * 1024 * 1024, rows: 1000, events: 10000 });
const EVENT = ['sequence', 'observation', 'contextSlot', 'executionSlot', 'rpcIdentity'];
const PROJECTION = ['receipt', 'revision', 'maxContextSlot', 'observation', 'terminalEvidence', 'conflict', 'history', 'canAutomaticallyDispatch'];
const RECEIPT = ['intentId', 'reviewId', 'signature', 'genesis', 'blockhash', 'lastValidBlockHeight', 'expiresAtMs'];
const exact = (v, keys) => {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Reflect.ownKeys(v).length !== keys.length) throw Error('Invalid evidence shape');
  const d = Object.getOwnPropertyDescriptors(v);
  if (keys.some(k => !d[k] || !Object.hasOwn(d[k], 'value'))) throw Error('Evidence data fields required');
};
const safe = n => Number.isSafeInteger(n) && n >= 0;
const equalEvent = (a, b) => a === null || b === null ? a === b : EVENT.every(k => a[k] === b[k]);
function snapshot(input) {
  if (!Array.isArray(input) || input.length > RECOVERY_EXPORT_LIMITS.rows) throw Error('Evidence row limit or shape');
  let events = 0;
  const ids = new Set();
  const rows = input.map(raw => {
    exact(raw, ['receipt', 'projection', 'minimumContextSlot', 'recoveryState', 'canAutomaticallyDispatch']);
    const receipt = copyReceipt(raw.receipt);
    if (ids.has(receipt.intentId) || !safe(raw.minimumContextSlot) || raw.recoveryState !== 'RECONCILE' || raw.canAutomaticallyDispatch !== false) throw Error('Invalid recovery row');
    ids.add(receipt.intentId);
    let projection = null;
    if (raw.projection !== null) {
      const p = raw.projection; exact(p, PROJECTION);
      const saved = copyReceipt(p.receipt);
      if (!RECEIPT.every(k => saved[k] === receipt[k]) || !Array.isArray(p.history) || (events += p.history.length) > RECOVERY_EXPORT_LIMITS.events) throw Error('Evidence identity or event limit');
      const history = p.history.map(e => { exact(e, [...EVENT, 'disposition']); return Object.fromEntries(EVENT.map(k => [k, e[k]])); });
      projection = projectObservationRecord({ intentId: receipt.intentId, receipt: saved, events: history }, [...new Set(history.map(e => e.rpcIdentity))]);
      if (p.terminalEvidence !== null) exact(p.terminalEvidence, EVENT);
      if (['revision', 'maxContextSlot', 'observation', 'conflict', 'canAutomaticallyDispatch'].some(k => p[k] !== projection[k]) || !equalEvent(p.terminalEvidence, projection.terminalEvidence) || p.history.some((e, i) => e.disposition !== projection.history[i].disposition) || raw.minimumContextSlot < (projection.maxContextSlot ?? 0)) throw Error('Evidence projection does not match replay');
    }
    return Object.freeze({ receipt, projection, minimumContextSlot: raw.minimumContextSlot, recoveryState: 'RECONCILE', canAutomaticallyDispatch: false });
  });
  rows.sort((a, b) => a.receipt.intentId < b.receipt.intentId ? -1 : a.receipt.intentId > b.receipt.intentId ? 1 : 0);
  return Object.freeze({ scope: 'SAVED_LOCAL_SNAPSHOT', genesis: GENESIS, completeness: 'UNSAVED_RESPONSES_UNKNOWN', rows: Object.freeze(rows) });
}
const hash = async text => Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), x => x.toString(16).padStart(2, '0')).join('');
const encode = (payload, sha256) => JSON.stringify({ format: FORMAT, version: 1, payload, sha256 }, null, 2) + '\n';
export async function createRecoveryEvidence(rows) {
  // Copy/replay before hashing awaits. Never include endpoint URLs, arbitrary
  // error text, signed bytes, configuration or volatile UI attention fields.
  const payload = snapshot(rows), canonical = JSON.stringify(payload);
  if (new TextEncoder().encode(encode(payload, '0'.repeat(64))).byteLength > RECOVERY_EXPORT_LIMITS.bytes) throw Error('Evidence byte limit');
  const sha256 = await hash(canonical), text = encode(payload, sha256);
  return Object.freeze({ filename: 'plov-recovery-evidence.json', mimeType: 'application/json', sha256, text });
}
export async function verifyRecoveryEvidence(text) {
  if (typeof text !== 'string' || text.length > RECOVERY_EXPORT_LIMITS.bytes || new TextEncoder().encode(text).byteLength > RECOVERY_EXPORT_LIMITS.bytes) throw Error('Evidence byte limit or input type');
  const envelope = JSON.parse(text); exact(envelope, ['format', 'version', 'payload', 'sha256']);
  if (envelope.format !== FORMAT || envelope.version !== 1 || !/^[a-f0-9]{64}$/.test(envelope.sha256)) throw Error('Unsupported evidence format');
  exact(envelope.payload, ['scope', 'genesis', 'completeness', 'rows']);
  const payload = snapshot(envelope.payload.rows);
  if (envelope.payload.scope !== payload.scope || envelope.payload.genesis !== payload.genesis || envelope.payload.completeness !== payload.completeness || text !== encode(payload, envelope.sha256) || await hash(JSON.stringify(payload)) !== envelope.sha256) throw Error('Evidence integrity/canonical format mismatch');
  // A self-contained checksum is NOT a signature or chain/RPC authenticity
  // proof. Anyone can alter content and compute a new checksum. No import API.
  return Object.freeze({ integrity: 'CHECKSUM_ONLY', payload, sha256: envelope.sha256 });
}

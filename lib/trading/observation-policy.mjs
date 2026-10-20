const FIELDS = ['version', 'maxRecords', 'maxEventsPerRecord', 'maxEventsTotal', 'maxSerializedBytes'];
const failures = new WeakSet();
export function copyObservationWritePolicy(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Explicit observation write policy required');
  const d = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(input).length !== FIELDS.length || FIELDS.some(k => !d[k] || !Object.hasOwn(d[k], 'value'))) throw Error('Observation write policy data fields required');
  const p = Object.fromEntries(FIELDS.map(k => [k, d[k].value]));
  if (p.version !== 1 || FIELDS.slice(1).some(k => !Number.isSafeInteger(p[k]) || p[k] < 1) || p.maxRecords > p.maxEventsTotal || p.maxEventsPerRecord > p.maxEventsTotal) throw Error('Invalid observation write limits');
  return Object.freeze(p);
}
const exceeded = () => { const e = Error('Observation history write limit reached'); failures.add(e); return e; };
export const observationWriteIssue = e => failures.has(e) ? 'HISTORY_LIMIT' : e?.name === 'QuotaExceededError' ? 'STORAGE_QUOTA' : 'UNACKNOWLEDGED';

// Logical UTF-8 JSON bytes of record values, not browser disk allocation.
// The caller holds one records readwrite transaction while inspecting rows.
export function createObservationBudget(policy) {
  const limits = copyObservationWritePolicy(policy);
  let records = 0, events = 0, bytes = 0;
  return Object.freeze({
    add(row) {
      if (!row || !Array.isArray(row.events)) throw Error('Invalid budget record');
      const size = new TextEncoder().encode(JSON.stringify(row)).byteLength;
      records++; events += row.events.length; bytes += size;
      if (![records, events, bytes].every(Number.isSafeInteger) || row.events.length > limits.maxEventsPerRecord || records > limits.maxRecords || events > limits.maxEventsTotal || bytes > limits.maxSerializedBytes) throw exceeded();
    },
  });
}

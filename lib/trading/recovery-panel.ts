// Presentation boundary only. No engine/provider/storage/network imports.
export type Receipt = Readonly<{ intentId: string; reviewId: string; signature: string; genesis: string; blockhash: string; lastValidBlockHeight: number; expiresAtMs: number; state: "DISPATCH_INTENT" | "PENDING" | "UNKNOWN" }>;
export type RecoverySource = { recover(): Promise<unknown>; reconcile(intentId: string): Promise<unknown> };
export type Attention = "UNACKNOWLEDGED" | "HISTORY_LIMIT" | "STORAGE_QUOTA" | "CHECK_FAILED" | "MISSING";
type Fingerprint = Readonly<{ observation: string; contextSlot: number | null; executionSlot: number | null; rpcIdentity: string }>;
type Projection = Readonly<{ code: string; revision: number; history: readonly Fingerprint[] }>;
export type RecoveryCard = Readonly<{ receipt: Receipt; projection: Projection | null; attention: readonly Attention[] }>;
export type PanelState = Readonly<{ phase: "idle" | "ready" | "error"; pending: string | null; rows: readonly RecoveryCard[] }>;
const INITIAL: PanelState = Object.freeze({ phase: "idle", pending: null, rows: Object.freeze([]) });
const CODES = ["FINALIZED_SUCCESS_OBSERVED", "FINALIZED_ERROR_OBSERVED", "FINALIZED_CONFLICT", "NONFINAL_SUCCESS_OBSERVED", "NONFINAL_ERROR_OBSERVED", "UNRESOLVED_VALID_BLOCKHASH", "UNRESOLVED_EXPIRED_BLOCKHASH", "UNRESOLVED_RPC"];
const FIELDS = ["intentId", "reviewId", "signature", "genesis", "blockhash", "lastValidBlockHeight", "expiresAtMs", "state"] as const;
const safe = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid recovery data"); return value as Record<string, unknown>; }
function receipt(value: unknown): Receipt {
  const r = object(value);
  if (typeof r.intentId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(r.intentId) || typeof r.reviewId !== "string" || !/^[a-f0-9]{64}$/.test(r.reviewId) || typeof r.signature !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(r.signature) || typeof r.blockhash !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.blockhash) || r.genesis !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" || !safe(r.lastValidBlockHeight) || !safe(r.expiresAtMs) || r.expiresAtMs === 0 || !["DISPATCH_INTENT", "PENDING", "UNKNOWN"].includes(String(r.state))) throw Error("Invalid recovery receipt");
  return Object.freeze(Object.fromEntries(FIELDS.map(k => [k, r[k]]))) as Receipt;
}
const same = (a: Receipt, b: Receipt) => FIELDS.filter(k => k !== "state").every(k => a[k] === b[k]);
const matches = (a: Fingerprint, b: Fingerprint) => a.observation === b.observation && a.contextSlot === b.contextSlot && a.executionSlot === b.executionSlot && a.rpcIdentity === b.rpcIdentity;
function fingerprint(value: unknown): Fingerprint {
  const f = object(value), execution = typeof f.observation === "string" && /^(FINALIZED|NONFINAL)_/.test(f.observation);
  if (typeof f.observation !== "string" || !CODES.includes(f.observation) || f.observation === "FINALIZED_CONFLICT" || typeof f.rpcIdentity !== "string" || !/^[a-f0-9]{64}$/.test(f.rpcIdentity) || (f.observation === "UNRESOLVED_RPC" ? f.contextSlot !== null || f.executionSlot !== null : !safe(f.contextSlot) || (execution ? !safe(f.executionSlot) || f.executionSlot > f.contextSlot : f.executionSlot !== null))) throw Error("Invalid observation fingerprint");
  return Object.freeze({ observation: f.observation, contextSlot: f.contextSlot as number | null, executionSlot: f.executionSlot as number | null, rpcIdentity: f.rpcIdentity });
}
function projection(value: unknown, r: Receipt): Projection | null {
  if (value === null) return null;
  const p = object(value);
  if (!same(receipt(p.receipt), r) || typeof p.observation !== "string" || !CODES.includes(p.observation) || p.canAutomaticallyDispatch !== false || p.conflict !== (p.observation === "FINALIZED_CONFLICT") || !safe(p.revision) || p.revision === 0 || !Array.isArray(p.history) || p.history.length !== p.revision || (p.maxContextSlot !== null && !safe(p.maxContextSlot))) throw Error("Invalid recovery projection");
  // The controller/store validates provenance and replay. This component only
  // validates its public presentation contract; it never authorizes dispatch.
  const history = Object.freeze(p.history.map((input, i) => { const event = object(input); if (event.sequence !== i + 1) throw Error("Invalid history sequence"); return fingerprint(event); }));
  return Object.freeze({ code: p.observation, revision: p.revision, history });
}
function rows(value: unknown): readonly RecoveryCard[] {
  if (!Array.isArray(value)) throw Error("Recovery rows required");
  const ids = new Set<string>();
  return Object.freeze(value.map(input => {
    const row = object(input), r = receipt(row.receipt);
    if (ids.has(r.intentId) || row.canAutomaticallyDispatch !== false || row.recoveryState !== "RECONCILE" || !safe(row.minimumContextSlot)) throw Error("Invalid recovery row");
    ids.add(r.intentId);
    return Object.freeze({ receipt: r, projection: projection(row.projection, r), attention: Object.freeze([]) as readonly Attention[] });
  }));
}
function noRegression(previous: RecoveryCard, next: RecoveryCard) {
  if (!same(previous.receipt, next.receipt) || (previous.projection && (!next.projection || next.projection.revision < previous.projection.revision || previous.projection.history.some((event, i) => !matches(event, next.projection!.history[i])) || (previous.projection.code === "FINALIZED_CONFLICT" && next.projection.code !== "FINALIZED_CONFLICT")))) throw Error("Recovery identity/history regressed");
}
const withAttention = (row: RecoveryCard, attention: Attention): RecoveryCard => Object.freeze({ ...row, attention: Object.freeze([...new Set([...row.attention, attention])]) });

export function createSwapRecoverySession(source: RecoverySource) {
  if (typeof source?.recover !== "function" || typeof source?.reconcile !== "function") throw Error("Read-only recovery source required");
  let state = INITIAL, generation = 0, closed = false;
  const listeners = new Set<() => void>();
  const publish = (next: PanelState) => { state = Object.freeze(next); for (const fn of [...listeners]) { try { fn(); } catch { /* One UI listener cannot block the rest. */ } } };
  const update = (id: string, fn: (row: RecoveryCard) => RecoveryCard) => Object.freeze(state.rows.map(row => row.receipt.intentId === id ? fn(row) : row));
  return Object.freeze({
    getSnapshot: () => state,
    getServerSnapshot: () => INITIAL,
    subscribe(fn: () => void) {
      if (closed) throw Error("Recovery session closed");
      listeners.add(fn);
      return () => { listeners.delete(fn); if (!listeners.size) { generation++; state = INITIAL; } };
    },
    dispose() { closed = true; generation++; listeners.clear(); state = INITIAL; },
    async load() {
      if (closed || state.pending) return false;
      const epoch = generation;
      publish({ ...state, pending: "history" });
      try {
        const loaded = rows(await source.recover());
        if (closed || epoch !== generation) return false;
        const previous = new Map(state.rows.map(row => [row.receipt.intentId, row]));
        const combined = loaded.map(row => {
          const old = previous.get(row.receipt.intentId); previous.delete(row.receipt.intentId);
          if (!old) return row;
          noRegression(old, row);
          return Object.freeze({ ...row, receipt: old.receipt.state === "UNKNOWN" ? Object.freeze({ ...row.receipt, state: "UNKNOWN" as const }) : row.receipt, attention: Object.freeze(old.attention.filter(x => x !== "MISSING")) });
        });
        for (const old of previous.values()) combined.push(withAttention(old, "MISSING"));
        publish({ phase: "ready", pending: null, rows: Object.freeze(combined) });
        return true;
      } catch {
        if (!closed && epoch === generation) publish({ ...state, phase: "error", pending: null });
        return false;
      }
    },
    async check(intentId: string) {
      const previous = state.rows.find(row => row.receipt.intentId === intentId);
      if (closed || state.pending || state.phase !== "ready" || !previous || previous.attention.includes("MISSING")) return false;
      const epoch = generation;
      publish({ ...state, pending: intentId });
      try {
        const response = object(await source.reconcile(intentId));
        if (closed || epoch !== generation) return false;
        const r = receipt(response.receipt), saved = projection(response.projection, r), fresh = fingerprint(response.observation);
        if (!same(previous.receipt, r) || !same(receipt(response.observation), r) || response.canAutomaticallyDispatch !== false || !["ACKNOWLEDGED", "PRESENT_AFTER_READBACK", "UNACKNOWLEDGED"].includes(String(response.observationPersistence))) throw Error("Invalid reconciliation response");
        const next: RecoveryCard = Object.freeze({ receipt: previous.receipt.state === "UNKNOWN" ? Object.freeze({ ...r, state: "UNKNOWN" as const }) : r, projection: saved, attention: Object.freeze([]) });
        noRegression(previous, next);
        if (response.observationPersistence === "UNACKNOWLEDGED") {
          // Never display a fresh or old green result over a known failed write.
          const issue = response.observationWriteIssue ?? "UNACKNOWLEDGED";
          if (!["UNACKNOWLEDGED", "HISTORY_LIMIT", "STORAGE_QUOTA"].includes(String(issue))) throw Error("Invalid write issue");
          publish({ ...state, pending: null, rows: update(intentId, old => withAttention(Object.freeze({ ...old, projection: saved || old.projection }), issue as Attention)) });
          return false;
        }
        if (!saved || !saved.history.some(event => matches(event, fresh))) throw Error("Persisted evidence does not match response");
        publish({ ...state, pending: null, rows: update(intentId, () => next) });
        return true;
      } catch {
        if (!closed && epoch === generation) publish({ ...state, pending: null, rows: update(intentId, old => withAttention(old, "CHECK_FAILED")) });
        return false;
      }
    },
  });
}

export function recoveryStatus(row: RecoveryCard, stale = false): string {
  if (stale) return "STALE";
  if (row.projection?.code === "FINALIZED_CONFLICT") return "FINALIZED_CONFLICT";
  if (row.attention.includes("MISSING")) return "MISSING";
  if (row.attention.includes("HISTORY_LIMIT")) return "HISTORY_LIMIT";
  if (row.attention.includes("STORAGE_QUOTA")) return "STORAGE_QUOTA";
  if (row.attention.includes("UNACKNOWLEDGED")) return "UNACKNOWLEDGED";
  if (row.attention.includes("CHECK_FAILED")) return "CHECK_FAILED";
  return row.projection?.code || row.receipt.state;
}

// Two retained witnesses explain the conflict; they do not resolve it or rank
// providers. No fresh network request or unbounded rendered history list.
export function conflictEvidence(row: RecoveryCard): readonly Fingerprint[] {
  if (row.projection?.code !== "FINALIZED_CONFLICT") return Object.freeze([]);
  const first = row.projection.history.find(x => x.observation.startsWith("FINALIZED_"));
  const other = first && row.projection.history.find(x => x.observation.startsWith("FINALIZED_") && (x.observation !== first.observation || x.executionSlot !== first.executionSlot));
  return Object.freeze(first && other ? [first, other] : []);
}

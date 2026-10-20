"use client";

import { useSyncExternalStore } from "react";
import { SwapRecoveryPanel } from "./SwapRecoveryPanel";
import { SwapEvidenceExport } from "./SwapEvidenceExport";
import type { RecoverySource } from "@/lib/trading/recovery-panel";

type Snapshot = Readonly<{ phase: "IDLE" | "OPENING" | "READY" | "ERROR" | "CLOSED"; cleanupFailed: boolean }>;
export type RecoveryHost = Readonly<{
  source: RecoverySource; open(): Promise<unknown>; close(): unknown;
  getSnapshot(): Snapshot; getServerSnapshot(): Snapshot; subscribe(fn: () => void): () => void;
}>;

// Unmounted rehearsal composition. The caller owns this host; rendering or
// unmounting never opens/closes it. There is no production bootstrap fallback.
export function SwapRecoveryHostPanel({ host, locale = "en" }: { host: RecoveryHost; locale?: "en" | "ru" }) {
  const ru = locale === "ru", state = useSyncExternalStore(host.subscribe, host.getSnapshot, host.getServerSnapshot);
  return <div data-host-phase={state.phase} className="mx-auto max-w-3xl space-y-5 text-rice">
    <div className="rounded-2xl border border-fire/20 bg-bg-soft p-5 sm:p-8">
      <h2 className="font-display text-2xl text-fire">{ru ? "Проверочный контур истории" : "History rehearsal"}</h2>
      <p className="mt-3 text-sm text-rice-soft">{ru ? "Изолированная проверка. Публичная торговля не включена." : "Isolated rehearsal. Public trading is disabled."}</p>
      {state.phase === "IDLE" && <button type="button" data-action="open-host" className="mt-5 rounded-lg border border-fire/50 px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-fire" onClick={() => { void host.open().catch(() => {}); }}>{ru ? "Открыть сохранённый контур" : "Open saved rehearsal"}</button>}
      {state.phase === "OPENING" && <p role="status" className="mt-4 text-sm">{ru ? "Проверяем конфигурацию и доступность…" : "Checking configuration and availability…"}</p>}
      {state.phase === "READY" && <button type="button" data-action="close-host" className="mt-5 rounded-lg border border-fire/40 px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-fire" onClick={() => host.close()}>{ru ? "Закрыть проверочный контур" : "Close rehearsal"}</button>}
      {(state.phase === "ERROR" || state.phase === "CLOSED") && <p role="alert" className="mt-4 text-sm text-gold">{state.phase === "ERROR" ? (ru ? "Контур недоступен. История не считается пустой; исход операций не установлен. Не отправляйте операции повторно." : "Rehearsal unavailable. History is not assumed empty and transaction outcomes are not established. Do not resubmit transactions.") : (ru ? "Контур закрыт. Сохранённые записи не удалялись; повторная отправка не выполнялась." : "Rehearsal closed. Saved records were not deleted and transactions were not resubmitted.")}</p>}
      {state.cleanupFailed && <p role="alert" className="mt-3 text-sm text-gold">{ru ? "Закрытие ресурсов требует дополнительной проверки." : "Resource cleanup needs further verification."}</p>}
    </div>
    {state.phase === "READY" && <SwapRecoveryPanel source={host.source} locale={locale} />}
    {state.phase === "READY" && <SwapEvidenceExport source={host.source} locale={locale} />}
  </div>;
}

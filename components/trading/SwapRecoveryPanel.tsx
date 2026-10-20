"use client";

import { useMemo, useSyncExternalStore } from "react";
import { createSwapRecoverySession, recoveryStatus, type RecoverySource } from "@/lib/trading/recovery-panel";

const COPY: Record<string, [string, string, string, string]> = {
  DISPATCH_INTENT: ["Результат не установлен", "Запись операции сохранена. Проверьте исходную транзакцию перед дальнейшими действиями.", "Result not established", "The operation record is saved. Check the original transaction before taking further action."],
  PENDING: ["Ожидает проверки", "Есть ответ об отправке. Исполнение ещё нужно проверить по исходной подписи.", "Awaiting verification", "A submission response was received. Execution still needs to be checked using the original signature."],
  UNKNOWN: ["Исход отправки неизвестен", "Операция могла исполниться. Проверьте статус; не отправляйте её заново.", "Submission outcome unknown", "The transaction may have executed. Check its status; do not submit it again."],
  FINALIZED_SUCCESS_OBSERVED: ["RPC сообщает о финализированном исполнении", "Сохранён результат проверки исходной подписи. Новая операция не создавалась.", "RPC reports finalized execution", "The check of the original signature is saved. No new transaction was created."],
  FINALIZED_ERROR_OBSERVED: ["RPC сообщает о финализированной ошибке", "По данным RPC, исполнение завершилось с ошибкой. Сетевая комиссия могла быть удержана.", "RPC reports a finalized failure", "According to the RPC, execution failed. A network fee may still have been charged."],
  NONFINAL_SUCCESS_OBSERVED: ["Исполнение замечено, финализации нет", "Исходная транзакция требует дальнейшей проверки. Это ещё не финальный результат.", "Execution observed; not finalized", "The original transaction needs further verification. This is not a final result."],
  NONFINAL_ERROR_OBSERVED: ["Ошибка замечена, финализации нет", "Сохранён предварительный ответ об ошибке. Финальный исход ещё не установлен.", "Error observed; not finalized", "A preliminary error response is saved. The final outcome is not established."],
  FINALIZED_CONFLICT: ["Ответы RPC противоречат друг другу", "Противоречие не разрешено. Нужна дополнительная проверка исходной подписи; повторная отправка недоступна.", "RPC responses conflict", "The conflict is unresolved. The original signature needs further verification; resubmission is unavailable."],
  UNRESOLVED_VALID_BLOCKHASH: ["Подтверждённого исхода нет", "Проверка не установила исполнение. Не создавайте повторную операцию на основании этого ответа.", "Outcome remains unresolved", "The check did not establish execution. Do not create a replacement based on this response."],
  UNRESOLVED_EXPIRED_BLOCKHASH: ["Истечение срока не доказывает отсутствие исполнения", "Даже после истечения срока отправки нужно проверить исполнение в прошлом по исходной подписи.", "Expiry does not prove non-execution", "Past execution still needs verification using the original signature, even after submission expires."],
  UNRESOLVED_RPC: ["Подтверждённого исхода нет", "RPC не предоставил пригодного ответа. Исходная запись сохранена для дальнейшей проверки.", "Outcome remains unresolved", "The RPC did not provide a usable response. The original record is retained for further checks."],
  UNACKNOWLEDGED: ["Проверка требует внимания", "Сохранение нового ответа не подтверждено. Повторная отправка не выполняется; статус можно проверить снова.", "Verification needs attention", "Saving the new response is unconfirmed. No resubmission occurs; you can check the status again."],
  CHECK_FAILED: ["Не удалось обновить статус", "Показаны ранее загруженные сведения. Повторите чтение истории или проверку статуса.", "Status could not be refreshed", "Previously loaded information is shown. Read the history or check the status again."],
  MISSING: ["Запись истории недоступна", "Текущее чтение не подтвердило ранее загруженную запись. Она сохранена на экране; перечитайте историю.", "History record unavailable", "The current read did not contain a previously loaded record. It is retained on screen; read the history again."],
  STALE: ["Сведения могут быть устаревшими", "Не удалось прочитать историю. Показан предыдущий снимок; повторите чтение перед дальнейшей проверкой.", "Information may be outdated", "History could not be read. A previous snapshot is shown; read it again before checking further."],
};

// Unmounted read-only component: its narrow source has no signing/send method.
export function SwapRecoveryPanel({ source, locale = "en" }: { source: RecoverySource; locale?: "en" | "ru" }) {
  const ru = locale === "ru";
  const session = useMemo(() => createSwapRecoverySession(source), [source]);
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);
  const busy = state.pending !== null;
  return <section aria-label={ru ? "Сохранённые операции" : "Saved transactions"} aria-busy={busy} className="mx-auto max-w-3xl rounded-2xl border border-fire/20 bg-bg-soft p-5 text-rice sm:p-8">
    <h2 className="font-display text-2xl text-fire">{ru ? "Сохранённые операции" : "Saved transactions"}</h2>
    <p className="mt-3 text-sm text-rice-soft">{ru ? "История относится к этому браузеру. Проверка статуса не запрашивает новую подпись и не отправляет транзакцию повторно." : "This history belongs to this browser. A status check does not request a new signature or resubmit a transaction."}</p>
    <button type="button" onClick={() => { void session.load(); }} disabled={busy} data-action="history" className="mt-5 rounded-lg border border-fire/50 px-4 py-3 text-sm font-semibold text-rice transition hover:bg-fire/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fire disabled:cursor-wait disabled:opacity-50">
      {state.pending === "history" ? (ru ? "Читаем историю…" : "Reading history…") : state.phase === "idle" ? (ru ? "Показать сохранённые операции" : "Show saved transactions") : (ru ? "Прочитать историю заново" : "Read history again")}
    </button>
    <p role="status" aria-live="polite" className="mt-4 text-sm text-rice-soft">{state.phase === "idle" && !busy ? (ru ? "История ещё не загружена." : "History has not been loaded yet.") : busy ? (ru ? "Выполняется проверка. Повторная отправка недоступна." : "A check is in progress. Resubmission is unavailable.") : state.phase === "ready" && !state.rows.length ? (ru ? "Сохранённых записей нет." : "No saved records were found.") : ""}</p>
    {state.phase === "error" && <p role="alert" className="mt-4 rounded-lg border border-gold/40 bg-gold/5 p-3 text-sm text-gold">{ru ? "Не удалось прочитать историю. Показанные сведения могут быть устаревшими. Подробности ошибки скрыты; повторите чтение." : "History could not be read. Displayed information may be outdated. Error details are hidden; read the history again."}</p>}
    <ol className="mt-5 space-y-4">
      {state.rows.map((row, index) => {
        const code = recoveryStatus(row, state.phase === "error"), copy = COPY[code];
        return <li key={row.receipt.intentId} data-intent-id={row.receipt.intentId} data-recovery-status={code} className="rounded-xl border border-fire/15 bg-bg p-4 sm:p-5">
          <h3 className="font-semibold">{ru ? "Операция" : "Transaction"} {index + 1}</h3>
          <p className="mt-2 font-medium text-gold">{copy[ru ? 0 : 2]}</p>
          <p className="mt-2 text-sm leading-relaxed text-rice-soft">{copy[ru ? 1 : 3]}</p>
          <dl className="mt-4 space-y-2 text-sm"><div><dt className="text-rice-dim">{ru ? "Сеть" : "Network"}</dt><dd>Solana mainnet</dd></div><div><dt className="text-rice-dim">{ru ? "Подпись исходной транзакции" : "Original transaction signature"}</dt><dd className="mt-1 break-all font-mono text-xs leading-relaxed">{row.receipt.signature}</dd></div></dl>
          <button type="button" data-action="check" disabled={busy || state.phase !== "ready" || row.attention.includes("MISSING")} onClick={() => { void session.check(row.receipt.intentId); }} className="mt-4 rounded-lg border border-fire/40 px-4 py-2 text-sm font-semibold hover:bg-fire/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fire disabled:cursor-not-allowed disabled:opacity-50">{state.pending === row.receipt.intentId ? (ru ? "Проверяем…" : "Checking…") : (ru ? "Проверить статус" : "Check status")}</button>
        </li>;
      })}
    </ol>
  </section>;
}

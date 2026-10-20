"use client";
import { useEffect, useRef, useState } from "react";
import { createRecoveryEvidence } from "@/lib/trading/recovery-evidence.mjs";
import type { RecoverySource } from "@/lib/trading/recovery-panel";

// Explicit local download; no automatic read, query, write or upload. A source
// change/unmount invalidates pending work without disposing the borrowed source.
export function SwapEvidenceExport({ source, locale = "en" }: { source: RecoverySource; locale?: "en" | "ru" }) {
  const ru = locale === "ru", generation = useRef(0), pending = useRef(false);
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  useEffect(() => { generation.current++; pending.current = false; setState("idle"); return () => { generation.current++; pending.current = false; }; }, [source]);
  async function download() {
    if (pending.current) return;
    const epoch = generation.current; pending.current = true; setState("pending");
    const current = () => epoch === generation.current;
    let url: string | null = null;
    try {
      const rows = await source.recover(); if (!current()) return;
      const evidence = await createRecoveryEvidence(rows); if (!current()) return;
      url = URL.createObjectURL(new Blob([evidence.text], { type: evidence.mimeType }));
      const link = document.createElement("a"); link.href = url; link.download = evidence.filename;
      document.body.appendChild(link); try { link.click(); } finally { link.remove(); }
      setState("done");
    } catch { if (current()) setState("error"); }
    finally { if (url) URL.revokeObjectURL(url); if (current()) pending.current = false; }
  }
  return <section aria-label={ru ? "Экспорт сохранённой истории" : "Export saved history"} className="rounded-2xl border border-fire/20 bg-bg-soft p-5 text-rice sm:p-8">
    <h2 className="font-display text-xl text-fire">{ru ? "Экспорт сохранённой истории" : "Export saved history"}</h2>
    <p className="mt-3 text-sm text-rice-soft">{ru ? "JSON содержит публичные подписи и сохранённые ответы RPC. Несохранённые ответы неизвестны. SHA256 проверяет целостность файла; подлинность данных он не подтверждает." : "JSON contains public signatures and saved RPC responses. Unsaved responses remain unknown. SHA256 checks file integrity; it does not authenticate the data."}</p>
    <button type="button" data-action="export-evidence" disabled={state === "pending"} onClick={() => { void download(); }} className="mt-4 rounded-lg border border-fire/40 px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-fire disabled:opacity-50">{state === "pending" ? (ru ? "Готовим файл…" : "Preparing file…") : (ru ? "Скачать историю (JSON)" : "Download history (JSON)")}</button>
    <p role="status" className="mt-3 text-sm text-rice-soft">{state === "done" ? (ru ? "Файл подготовлен для скачивания. Записи в браузере не изменялись." : "File prepared for download. Browser records were not changed.") : ""}</p>
    {state === "error" && <p role="alert" className="mt-3 text-sm text-gold">{ru ? "Не удалось подготовить полный файл. Проверьте доступ к истории; записи не удалялись." : "The complete file could not be prepared. Check history access; records were not deleted."}</p>}
  </section>;
}

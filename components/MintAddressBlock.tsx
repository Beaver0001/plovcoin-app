"use client";

import { useCopyFeedback } from "./useCopyFeedback";
import { official } from "@/lib/official-config.mjs";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, ShieldAlert } from "lucide-react";
import { useI18n } from "./I18nProvider";

const MINT_ADDRESS = official.mint;
const SOLSCAN_URL = `https://solscan.io/token/${MINT_ADDRESS}`;

type Variant = "hero" | "compact" | "footer";

export function MintAddressBlock({ variant = "hero" }: { variant?: Variant }) {
  const { t } = useI18n();
  const { copied, message, copy } = useCopyFeedback(MINT_ADDRESS);
  const mb = t.mintBlock;

  if (variant === "footer") {
    return (
      <div className="mt-6 rounded-lg border border-fire/20 bg-bg-soft/40 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="font-mono text-[9px] uppercase tracking-widest text-fire-glow">
              {mb.label}
            </div>
            <code className="mt-0.5 block break-all font-mono text-[11px] text-rice">
              {MINT_ADDRESS}
            </code>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              onClick={copy}
              aria-label={`${mb.copyBtn}: ${mb.label}`}
              className="inline-flex flex-wrap items-center gap-1 rounded-md border border-fire/30 bg-fire/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fire transition-colors hover:bg-fire/20"
              title={copied ? mb.copiedBtn : mb.copyBtn}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? mb.copiedBtn : mb.copyBtn}
              <span role="status" className={copied || !message ? "sr-only" : "basis-full text-xs normal-case tracking-normal"}>{message}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="rounded-xl border border-fire/20 bg-bg-soft/40 p-4">
        <div className="mb-2 flex items-center gap-2">
          <ShieldAlert size={14} className="text-fire" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-fire-glow">
            {mb.label}
          </span>
        </div>
        <code className="block break-all font-mono text-xs text-rice">{MINT_ADDRESS}</code>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={copy}
              aria-label={`${mb.copyBtn}: ${mb.label}`}
            className="inline-flex flex-wrap items-center gap-1.5 rounded-md border border-fire/30 bg-fire/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fire transition-colors hover:bg-fire/20"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? mb.copiedBtn : mb.copyBtn}
              <span role="status" className={copied || !message ? "sr-only" : "basis-full text-xs normal-case tracking-normal"}>{message}</span>
          </button>
          <a
            href={SOLSCAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-wrap items-center gap-1.5 rounded-md border border-fire/20 bg-bg/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-rice-soft transition-colors hover:border-fire/40 hover:text-fire"
          >
            {mb.solscanBtn}
            <ExternalLink size={11} />
          </a>
        </div>
      </div>
    );
  }

  // hero variant (biggest)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="card-warm relative overflow-hidden !p-5 sm:!p-6"
    >
      {/* corner accent */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-fire/10 blur-3xl" />

      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-fire/40 bg-fire/10">
            <Check size={12} className="text-fire" strokeWidth={3} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-fire-glow">
            {mb.label}
          </span>
        </div>

        <code className="block break-all rounded-lg border border-fire/20 bg-bg/60 px-3 py-3 font-mono text-[13px] leading-relaxed text-rice sm:text-sm">
          {MINT_ADDRESS}
        </code>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={copy}
              aria-label={`${mb.copyBtn}: ${mb.label}`}
            className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-fire/40 bg-fire/15 px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-fire transition-all hover:bg-fire/25"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? mb.copiedBtn : mb.copyBtn}
              <span role="status" className={copied || !message ? "sr-only" : "basis-full text-xs normal-case tracking-normal"}>{message}</span>
          </button>
          <a
            href={SOLSCAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-fire/20 bg-bg/40 px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-rice-soft transition-all hover:border-fire/40 hover:text-fire"
          >
            {mb.solscanBtn}
            <ExternalLink size={12} />
          </a>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-fire/15 bg-fire/5 p-2.5">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-fire" />
          <p className="text-[11px] leading-relaxed text-rice-soft">{mb.warning}</p>
        </div>
      </div>
    </motion.div>
  );
}

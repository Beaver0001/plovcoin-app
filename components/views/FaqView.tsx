"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronDown, ShieldAlert, Copy, Check, ExternalLink, ArrowRight } from "lucide-react";
import { useI18n } from "../I18nProvider";
import { Navbar } from "../Navbar";
import { Footer } from "../Footer";
import { localePath } from "@/lib/i18n";

// Type-safe access - FAQ items may have optional proofLink
type FaqItem = {
  q: string;
  a: string;
  proofLabel?: string;
  proofHref?: string;
};

function ProofLink({ label, href }: { label: string; href: string }) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");
  const content = (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-fire transition-colors hover:underline">
      {label}
      <ArrowRight size={10} />
    </span>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return <Link href={href}>{content}</Link>;
}

function FaqAccordion({
  q,
  a,
  proofLabel,
  proofHref,
  isOpen,
  onToggle,
}: FaqItem & { isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-fire/15 bg-bg-soft/40">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-fire/5"
      >
        <span className="flex-1 font-display text-sm text-rice">{q}</span>
        <ChevronDown
          size={16}
          className={`mt-1 shrink-0 text-fire transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-fire/10 p-4 pt-3">
              <p className="text-sm leading-relaxed text-rice-soft">{a}</p>
              {proofLabel && proofHref && (
                <div className="mt-3">
                  <ProofLink label={proofLabel} href={proofHref} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeaturedCard({
  q,
  a,
  proofLabel,
  proofHref,
  isOpen,
  onToggle,
  index,
}: FaqItem & { isOpen: boolean; onToggle: () => void; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="card-warm !p-0 overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-fire/5"
      >
        <span className="shrink-0 font-mono text-xs font-semibold text-fire">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="flex-1 font-display text-sm leading-snug text-rice">{q}</span>
        <ChevronDown
          size={14}
          className={`mt-1 shrink-0 text-fire transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-fire/10 p-4 pt-3">
              <p className="text-sm leading-relaxed text-rice-soft">{a}</p>
              {proofLabel && proofHref && (
                <div className="mt-3">
                  <ProofLink label={proofLabel} href={proofHref} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CopyableValue({ value, mono }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1.5 rounded border border-fire/20 bg-bg/40 px-1.5 py-0.5 text-[11px] text-rice hover:border-fire/40 hover:text-fire transition-colors ${
        mono ? "font-mono" : ""
      }`}
      title="Copy"
    >
      <span className="max-w-[220px] truncate sm:max-w-none">{value}</span>
      {copied ? <Check size={11} className="text-fire" /> : <Copy size={11} className="opacity-50" />}
    </button>
  );
}

function OfficialSources() {
  const { t } = useI18n();
  const os = t.faq.officialSources;
  return (
    <div
      id="official-sources"
      className="card-warm !p-5 border-fire/30 bg-fire/5 scroll-mt-24"
    >
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert size={16} className="text-fire" />
        <span className="font-display text-base text-fire">{os.title}</span>
      </div>
      <p className="text-xs text-rice-soft">{os.warning}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {os.items.map((item, i: number) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-fire/15 bg-bg-soft/60 px-3 py-2"
          >
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-rice-dim">
              {item.label}
            </span>
            <div className="min-w-0 flex items-center gap-1.5">
              <CopyableValue value={item.value} mono={item.mono} />
              {item.href && item.href.startsWith("http") && (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-fire hover:opacity-70"
                  title="Open"
                >
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FaqView() {
  const { t, locale } = useI18n();
  const faq = t.faq;

  // openKey format: "featured-{i}" or "{catId}-{i}"
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>(faq.categories[0].id);

  const toggle = (key: string) => setOpenKey(openKey === key ? null : key);
  const activeCategory =
    faq.categories.find((c) => c.id === activeCat) ?? faq.categories[0];

  return (
    <>
      <Navbar />
      <main>
        <div className="container-narrow pb-20 pt-12 sm:pt-16">
          {/* Hero */}
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-fire/30 bg-fire/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-fire"
            >
              {faq.badge}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 font-display text-5xl text-rice sm:text-6xl"
            >
              <span className="text-fire-gradient glow-text">{faq.title}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-base text-rice-soft sm:text-lg"
            >
              {faq.intro}
            </motion.p>
          </div>

          {/* Official Sources banner */}
          <div className="mt-10">
            <OfficialSources />
          </div>

          {/* Featured questions */}
          <section className="mt-16">
            <h2 className="font-display text-2xl text-rice">{faq.featuredTitle}</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {faq.featured.map((item: FaqItem, i: number) => {
                const key = `featured-${i}`;
                return (
                  <FeaturedCard
                    key={key}
                    {...item}
                    index={i}
                    isOpen={openKey === key}
                    onToggle={() => toggle(key)}
                  />
                );
              })}
            </div>
          </section>

          {/* Categories */}
          <section className="mt-16">
            <h2 className="font-display text-2xl text-rice">{faq.categoriesTitle}</h2>

            {/* Category tabs */}
            <div className="mt-5 flex flex-wrap gap-2">
              {faq.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCat(cat.id);
                    setOpenKey(null);
                  }}
                  className={`rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all ${
                    activeCat === cat.id
                      ? "bg-fire text-bg"
                      : "border border-fire/20 bg-bg-soft/40 text-rice-soft hover:border-fire/40 hover:text-fire"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Items */}
            <div className="mt-6 space-y-3">
              {activeCategory.items.map((item: FaqItem, i: number) => {
                const key = `${activeCat}-${i}`;
                return (
                  <FaqAccordion
                    key={key}
                    {...item}
                    isOpen={openKey === key}
                    onToggle={() => toggle(key)}
                  />
                );
              })}
            </div>
          </section>

          {/* Still have questions CTA */}
          <div className="mt-16 card-warm !p-8 text-center">
            <div className="font-display text-xl text-rice">
              {locale === "ru" ? "Остались вопросы?" : "Still have questions?"}
            </div>
            <p className="mt-2 text-sm text-rice-soft">
              {locale === "ru"
                ? "Присоединяйтесь к PlovArmy в Telegram — мы отвечаем быстро."
                : "Join PlovArmy on Telegram — we answer fast."}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://t.me/PlovCoin"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Telegram
              </a>
              <Link href={localePath(locale, "/whitepaper")} className="btn-secondary">
                {locale === "ru" ? "Читать Whitepaper" : "Read Whitepaper"}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

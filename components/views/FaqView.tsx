"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useI18n } from "../I18nProvider";
import { Navbar } from "../Navbar";
import { Footer } from "../Footer";
import { localePath } from "@/lib/i18n";

function FaqItem({ q, a, isOpen, onToggle }: {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-fire/15 bg-bg-soft/40 overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-fire/5"
      >
        <span className="flex-1 font-display text-sm text-rice">{q}</span>
        <ChevronDown
          size={16}
          className={`mt-1 shrink-0 text-fire transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
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
            <div className="border-t border-fire/10 p-4 pt-3 text-sm leading-relaxed text-rice-soft">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqView() {
  const { t, locale } = useI18n();
  const faq = t.faq;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>(faq.categories[0].id);

  const toggle = (key: string) => setOpenKey(openKey === key ? null : key);
  const activeCategory = faq.categories.find((c) => c.id === activeCat) ?? faq.categories[0];

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

          {/* Category tabs (sticky) */}
          <div className="sticky top-20 z-20 mt-12 -mx-4 border-b border-fire/10 bg-bg/80 px-4 py-3 backdrop-blur-md">
            <div className="flex flex-wrap gap-2">
              {faq.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCat(cat.id);
                    setOpenKey(null);
                    // scroll back to top of items
                    window.scrollTo({ top: window.scrollY, behavior: "smooth" });
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
          </div>

          {/* Items */}
          <div className="mt-8 space-y-3">
            {activeCategory.items.map((item, i) => {
              const key = `${activeCat}-${i}`;
              return (
                <FaqItem
                  key={key}
                  q={item.q}
                  a={item.a}
                  isOpen={openKey === key}
                  onToggle={() => toggle(key)}
                />
              );
            })}
          </div>

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

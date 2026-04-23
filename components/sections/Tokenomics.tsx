"use client";

import { motion } from "framer-motion";
import { useI18n } from "../I18nProvider";

const PCTS = [45, 20, 15, 8, 7, 5];
const COLORS = [
  "from-fire to-fire-glow",
  "from-fire-deep to-fire",
  "from-saffron to-fire",
  "from-gold to-saffron",
  "from-gold-deep to-gold",
  "from-rice-dim to-gold-deep",
];

export function Tokenomics() {
  const { t } = useI18n();

  return (
    <section id="tokenomics" className="relative py-32">
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 max-w-3xl"
        >
          <div className="badge-pill mb-5">{t.tokenomics.chapter}</div>
          <h2 className="font-display text-5xl leading-[0.95] text-rice md:text-7xl">
            {t.tokenomics.titleLine1}{" "}
            <span className="text-fire-gradient">{t.tokenomics.titleLine2}</span>
          </h2>
          <p className="mt-8 max-w-2xl font-serif text-xl italic text-rice-soft">
            {t.tokenomics.intro}
          </p>
        </motion.div>

        {/* Allocations bars */}
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            {t.tokenomics.allocations.map((a, i) => {
              const pct = PCTS[i] ?? 0;
              const color = COLORS[i] ?? COLORS[0];
              return (
                <motion.div
                  key={a.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="card-warm !p-5"
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <div className="font-display text-lg text-rice">{a.label}</div>
                      <div className="font-mono text-[11px] text-rice-dim mt-0.5">{a.note}</div>
                    </div>
                    <div className="font-display text-2xl text-fire-gradient">{pct}%</div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bg/60">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.08, ease: "easeOut" }}
                      className={`h-full rounded-full bg-gradient-to-r ${color}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Side stats */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="card-warm text-center"
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-fire-glow">
                {t.tokenomics.totalSupply}
              </div>
              <div className="mt-3 font-display text-4xl text-fire-gradient glow-text leading-tight">
                13,013,003,000
              </div>
              <div className="mt-2 font-mono text-xs text-rice-soft">{t.tokenomics.totalNote}</div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-[10px] font-mono text-rice-dim">
                <div className="rounded-lg border border-fire/15 bg-bg/40 p-2">
                  <div className="text-fire">{t.tokenomics.mint}</div>
                  <div className="mt-1">{t.tokenomics.disabled}</div>
                </div>
                <div className="rounded-lg border border-fire/15 bg-bg/40 p-2">
                  <div className="text-fire">{t.tokenomics.freeze}</div>
                  <div className="mt-1">{t.tokenomics.disabled}</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="card-warm"
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-fire-glow">
                {t.tokenomics.largestAlloc}
              </div>
              <div className="mt-3 font-display text-2xl text-rice leading-tight">
                {t.tokenomics.largestTitle}
              </div>
              <div className="mt-2 text-xs text-rice-soft">
                {t.tokenomics.largestBody}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

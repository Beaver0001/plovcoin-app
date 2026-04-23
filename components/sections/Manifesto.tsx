"use client";

import { motion } from "framer-motion";
import { Flame, Sparkles, Users } from "lucide-react";
import { useI18n } from "../I18nProvider";

const ICONS = [Flame, Sparkles, Users];

export function Manifesto() {
  const { t } = useI18n();

  return (
    <section className="relative py-32">
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-20 max-w-3xl"
        >
          <div className="badge-pill mb-5">{t.manifesto.chapter}</div>
          <h2 className="font-display text-5xl leading-[0.95] text-rice md:text-7xl">
            {t.manifesto.titleLine1}
            <br />
            <span className="text-fire-gradient">{t.manifesto.titleLine2}</span>
          </h2>
          <p className="mt-8 max-w-2xl font-serif text-xl italic text-rice-soft">
            {t.manifesto.intro}
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {t.manifesto.items.map((b, i) => {
            const Icon = ICONS[i] ?? Flame;
            return (
              <motion.div
                key={b.no}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="card-warm group flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-rice-dim">№ {b.no}</span>
                  <div className="rounded-full border border-fire/30 bg-fire/5 p-2.5 transition-colors group-hover:bg-fire/15">
                    <Icon size={20} className="text-fire" />
                  </div>
                </div>

                <h3 className="mt-6 font-display text-3xl text-rice">{b.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-rice-soft">{b.body}</p>
                <p className="mt-6 border-l-2 border-fire/40 pl-3 font-serif text-sm italic text-rice-dim">
                  &ldquo;{b.quote}&rdquo;
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

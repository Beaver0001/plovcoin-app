"use client";

import { motion } from "framer-motion";
import { Check, Clock, Lock } from "lucide-react";
import { useI18n } from "../I18nProvider";

const STATUSES = ["in-progress", "upcoming", "upcoming", "upcoming", "future"] as const;

const statusIcon = {
  "in-progress": Clock,
  upcoming: Lock,
  future: Lock,
};

const statusColor = {
  "in-progress": "text-fire border-fire/40 bg-fire/10",
  upcoming: "text-rice-soft border-rice-dim/30 bg-bg/40",
  future: "text-rice-dim border-rice-dim/20 bg-bg/40",
};

export function Roadmap() {
  const { t } = useI18n();

  const statusLabel = {
    "in-progress": t.roadmap.statusInProgress,
    upcoming: t.roadmap.statusUpcoming,
    future: t.roadmap.statusFuture,
  };

  return (
    <section id="roadmap" className="relative py-32">
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 max-w-3xl"
        >
          <div className="badge-pill mb-5">{t.roadmap.chapter}</div>
          <h2 className="font-display text-5xl leading-[0.95] text-rice md:text-7xl">
            {t.roadmap.titleLine1}
            <br />
            <span className="text-fire-gradient">{t.roadmap.titleLine2}</span>
          </h2>
          <p className="mt-8 max-w-2xl font-serif text-xl italic text-rice-soft">
            {t.roadmap.intro}
          </p>
        </motion.div>

        <div className="space-y-3">
          {t.roadmap.phases.map((p, i) => {
            const status = STATUSES[i] ?? "future";
            const Icon = statusIcon[status];
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`card-warm grid gap-6 md:grid-cols-[200px_1fr] !p-6 ${
                  status === "in-progress" ? "border-fire/40 bg-bg-soft/80" : ""
                }`}
              >
                <div>
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${statusColor[status]}`}
                  >
                    <Icon size={10} />
                    {statusLabel[status]}
                  </div>
                  <div className="mt-3 font-mono text-xs uppercase tracking-widest text-rice-dim">
                    {p.quarter}
                  </div>
                  <div className="mt-1 font-display text-3xl text-rice">{p.name}</div>
                  <div className="font-serif italic text-rice-soft">{p.subtitle}</div>
                </div>

                <ul className="space-y-2.5 md:border-l md:border-fire/15 md:pl-6">
                  {p.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-rice-soft">
                      <Check
                        size={14}
                        className={`mt-1 shrink-0 ${
                          status === "in-progress" ? "text-fire" : "text-rice-dim"
                        }`}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

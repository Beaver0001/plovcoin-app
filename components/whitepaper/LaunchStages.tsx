"use client";

import { motion } from "framer-motion";
import { useI18n } from "../I18nProvider";
import { ChevronRight } from "lucide-react";

export function LaunchStages() {
  const { t } = useI18n();
  const stages = t.whitepaper.liquidity.archStages;

  return (
    <div className="card-warm !p-6">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
        {stages.map((stage, i) => (
          <div key={stage.period} className="contents">
            {i > 0 && (
              <div className="hidden items-center justify-center md:flex">
                <ChevronRight className="text-fire/50" size={24} />
              </div>
            )}
            {i > 0 && (
              <div className="flex items-center justify-center md:hidden">
                <div className="h-6 w-px bg-fire/30" />
              </div>
            )}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className={`rounded-xl border border-fire/15 bg-bg/40 p-4 ${
                i === 0 ? "border-fire/40 bg-fire/5" : ""
              }`}
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-fire-glow">
                {stage.period}
              </div>
              <div className="mt-2 font-display text-base text-rice leading-tight">
                {stage.venue}
              </div>
              <div className="mt-2 text-xs text-rice-soft">{stage.desc}</div>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}

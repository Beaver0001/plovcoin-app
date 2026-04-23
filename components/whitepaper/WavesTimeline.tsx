"use client";

import { motion } from "framer-motion";
import { useI18n } from "../I18nProvider";

export function WavesTimeline() {
  const { t } = useI18n();
  const waves = t.whitepaper.airdrops.waves;

  return (
    <div className="card-warm !p-6">
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-fire/60 via-fire/30 to-fire/10 md:block" />

        <div className="grid gap-6 md:grid-cols-4">
          {waves.map((w, i) => (
            <motion.div
              key={w.wave}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative"
            >
              {/* Dot */}
              <div className="relative mb-4 flex items-center md:block">
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 font-display text-sm ${
                    i === 0
                      ? "border-fire bg-fire text-bg shadow-[0_0_20px_rgba(255,107,26,0.5)]"
                      : "border-fire/40 bg-bg-soft text-fire"
                  }`}
                >
                  {i + 1}
                </div>
              </div>

              <div className="font-mono text-[10px] uppercase tracking-widest text-fire-glow">
                {w.period}
              </div>
              <div className="mt-1 font-display text-lg text-rice">{w.wave}</div>
              <div className="mt-2 font-mono text-[11px] text-rice-soft">{w.tool}</div>
              <div className="mt-1 text-xs text-rice-dim leading-snug">{w.mechanic}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { useI18n } from "../I18nProvider";
import { Flame, Snowflake, Scale, ShieldCheck } from "lucide-react";

const ICONS = [Flame, Snowflake, Scale, ShieldCheck];

export function TrustStrip() {
  const { t } = useI18n();
  const trust = t.whitepaper.trust;
  const items = [
    { ...trust.mintOff, Icon: ICONS[0] },
    { ...trust.freezeOff, Icon: ICONS[1] },
    { ...trust.fairLaunch, Icon: ICONS[2] },
    { ...trust.liqProtection, Icon: ICONS[3] },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => {
        const Icon = item.Icon;
        return (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="card-warm !p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-fire/30 bg-fire/10">
                <Icon size={18} className="text-fire" />
              </div>
              <div>
                <div className="font-display text-base text-rice leading-tight">{item.title}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-rice-dim">
                  {item.desc}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

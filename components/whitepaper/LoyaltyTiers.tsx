"use client";

import { motion } from "framer-motion";
import { useI18n } from "../I18nProvider";

const TIER_COLORS = [
  "from-[#CD7F32] to-[#A05A23]", // Bronze
  "from-[#C0C0C0] to-[#8A8A8A]", // Silver
  "from-[#F5C842] to-[#C8951C]", // Gold
  "from-[#B9F2FF] to-[#4A90E2]", // Diamond
];

export function LoyaltyTiers() {
  const { t } = useI18n();
  const tiers = t.whitepaper.airdrops.tiers;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiers.map((tier, i) => (
        <motion.div
          key={tier.tier}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="card-warm !p-5 text-center"
        >
          <div
            className={`mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-to-br ${TIER_COLORS[i]} opacity-90 shadow-lg`}
          />
          <div className="font-display text-lg text-rice">{tier.tier}</div>
          <div className="mt-1 font-mono text-xs text-rice-dim">{tier.condition}</div>
          <div className="mt-3 rounded-lg border border-fire/20 bg-fire/5 px-2 py-1.5 font-mono text-xs text-fire">
            {tier.reward}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

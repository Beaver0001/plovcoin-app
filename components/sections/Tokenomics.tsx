"use client";

import { motion } from "framer-motion";

const allocations = [
  { label: "PlovDrop (Airdrop)", pct: 45, color: "from-fire to-fire-glow", note: "4 waves · 5,855,851,350 $PLOV" },
  { label: "Liquidity", pct: 20, color: "from-fire-deep to-fire", note: "2,602,600,600 $PLOV · Meteora/Raydium/Orca" },
  { label: "Marketing & Growth", pct: 15, color: "from-saffron to-fire", note: "1,951,950,450 $PLOV · KOL / Community" },
  { label: "Team", pct: 8, color: "from-gold to-saffron", note: "1,041,040,240 $PLOV · 12-cliff + 24m vest" },
  { label: "Burn Reserve", pct: 7, color: "from-gold-deep to-gold", note: "910,910,210 $PLOV · Milestone burns" },
  { label: "Loyalty (Hold-to-Earn)", pct: 5, color: "from-rice-dim to-gold-deep", note: "650,650,150 $PLOV · On-chain snapshots" },
];

export function Tokenomics() {
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
          <div className="badge-pill mb-5">The Recipe</div>
          <h2 className="font-display text-5xl leading-[0.95] text-rice md:text-7xl">
            Token <span className="text-fire-gradient">distribution</span>
          </h2>
          <p className="mt-8 max-w-2xl font-serif text-xl italic text-rice-soft">
            Every ingredient in its place. 45% goes to the community through PlovDrop —
            the largest allocation. No presale, no private sale, no VC rounds.
          </p>
        </motion.div>

        {/* Allocations bars */}
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            {allocations.map((a, i) => (
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
                  <div className="font-display text-2xl text-fire-gradient">{a.pct}%</div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg/60">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${a.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3 + i * 0.08, ease: "easeOut" }}
                    className={`h-full rounded-full bg-gradient-to-r ${a.color}`}
                  />
                </div>
              </motion.div>
            ))}
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
                Total Supply
              </div>
              <div className="mt-3 font-display text-4xl text-fire-gradient glow-text leading-tight">
                13,013,003,000
              </div>
              <div className="mt-2 font-mono text-xs text-rice-soft">$PLOV · Fixed forever</div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-[10px] font-mono text-rice-dim">
                <div className="rounded-lg border border-fire/15 bg-bg/40 p-2">
                  <div className="text-fire">Mint</div>
                  <div className="mt-1">DISABLED</div>
                </div>
                <div className="rounded-lg border border-fire/15 bg-bg/40 p-2">
                  <div className="text-fire">Freeze</div>
                  <div className="mt-1">DISABLED</div>
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
                Largest Allocation
              </div>
              <div className="mt-3 font-display text-2xl text-rice leading-tight">
                45% to Community
              </div>
              <div className="mt-2 text-xs text-rice-soft">
                PlovDrop across four waves — more than Liquidity, Marketing, and Team combined.
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

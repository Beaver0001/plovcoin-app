"use client";

import { motion } from "framer-motion";
import { Check, Clock, Lock } from "lucide-react";

const phases = [
  {
    status: "in-progress",
    quarter: "Q2 2026",
    name: "Phase 0",
    subtitle: "Foundation",
    items: [
      "Token deployed on Solana (mint & freeze disabled)",
      "Squads multisig treasury setup",
      "Security review initiated",
      "Proof-Hub live, all addresses public",
    ],
  },
  {
    status: "upcoming",
    quarter: "June 2026",
    name: "Phase 1",
    subtitle: "TGE Launch",
    items: [
      "Meteora DLMM launch pool (T0)",
      "PlovDrop Wave 1 distribution (~6.8% supply)",
      "Liquidity protection active (lock/timelock)",
      "Claim portal opens at claim.plovcoin.com",
    ],
  },
  {
    status: "upcoming",
    quarter: "Q3 2026",
    name: "Phase 2",
    subtitle: "Growth",
    items: [
      "Raydium CPMM mirror pool (T+1 APY-gated)",
      "20,000+ holders target",
      "CEX Tier-2 listings initiated",
      "PlovDrop Wave 2 distribution",
    ],
  },
  {
    status: "upcoming",
    quarter: "Q4 2026",
    name: "Phase 3",
    subtitle: "Scale",
    items: [
      "Orca CLMM USDC support pool (T+30)",
      "Liquidity expansion across multiple DEXs",
      "100,000+ holders target",
      "Additional Tier-2 CEX listings",
    ],
  },
  {
    status: "future",
    quarter: "2027+",
    name: "Phase 4+",
    subtitle: "Expansion",
    items: [
      "DAO governance transition",
      "Kazan Genesis NFT collection",
      "Cross-chain bridges evaluation",
      "#PlovFest — annual community event",
    ],
  },
];

const statusIcon = {
  "in-progress": Clock,
  upcoming: Lock,
  future: Lock,
};

const statusLabel = {
  "in-progress": "In Progress",
  upcoming: "Upcoming",
  future: "Future",
};

const statusColor = {
  "in-progress": "text-fire border-fire/40 bg-fire/10",
  upcoming: "text-rice-soft border-rice-dim/30 bg-bg/40",
  future: "text-rice-dim border-rice-dim/20 bg-bg/40",
};

export function Roadmap() {
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
          <div className="badge-pill mb-5">The Cooking Stages</div>
          <h2 className="font-display text-5xl leading-[0.95] text-rice md:text-7xl">
            Roadmap
            <br />
            <span className="text-fire-gradient">to the table</span>
          </h2>
          <p className="mt-8 max-w-2xl font-serif text-xl italic text-rice-soft">
            Every dish has phases. Ingredients, preparation, fire, serving. Same with $PLOV —
            a deliberate sequence, not a hype pump.
          </p>
        </motion.div>

        <div className="space-y-3">
          {phases.map((p, i) => {
            const Icon = statusIcon[p.status as keyof typeof statusIcon];
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`card-warm grid gap-6 md:grid-cols-[200px_1fr] !p-6 ${
                  p.status === "in-progress" ? "border-fire/40 bg-bg-soft/80" : ""
                }`}
              >
                <div>
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${
                      statusColor[p.status as keyof typeof statusColor]
                    }`}
                  >
                    <Icon size={10} />
                    {statusLabel[p.status as keyof typeof statusLabel]}
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
                          p.status === "in-progress" ? "text-fire" : "text-rice-dim"
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

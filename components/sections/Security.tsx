"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, Eye, FileCheck, ArrowUpRight } from "lucide-react";

const cards = [
  {
    icon: ShieldCheck,
    title: "Squads Multisig",
    body: "All treasury operations require multi-signature approval with timelock. No single signer can move funds. 4 hardware wallets, 3 signers required.",
    cta: { label: "View on Solscan", href: "/proof#addresses" },
  },
  {
    icon: Eye,
    title: "Proof-Hub",
    body: "Every action is on-chain and published with transaction hashes, addresses, and timestamps. No private allocations. Everything verifiable on Solana.",
    cta: { label: "Open Proof-Hub", href: "/proof" },
  },
  {
    icon: FileCheck,
    title: "Security Review",
    body: "Independent security review process initiated with external auditors. Results will be published on Proof-Hub when finalized. We do not claim any audit completion until officially confirmed.",
    cta: { label: "Status & Reports", href: "/proof#security" },
  },
];

export function Security() {
  return (
    <section id="security" className="relative py-32">
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 max-w-3xl"
        >
          <div className="badge-pill mb-5">Transparency</div>
          <h2 className="font-display text-5xl leading-[0.95] text-rice md:text-7xl">
            Security
            <br />
            <span className="text-fire-gradient">& proof</span>
          </h2>
          <p className="mt-8 max-w-2xl font-serif text-xl italic text-rice-soft">
            Every treasury operation is on-chain, multi-signed, and published. No hidden wallets.
            No secret allocations. Everything verifiable on Solana.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="card-warm group flex flex-col"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-fire/30 bg-fire/10">
                  <Icon size={22} className="text-fire" />
                </div>
                <h3 className="font-display text-2xl text-rice">{card.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-rice-soft">{card.body}</p>
                <Link
                  href={card.cta.href}
                  className="mt-5 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-fire transition-all hover:gap-2.5"
                >
                  {card.cta.label}
                  <ArrowUpRight size={14} />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Audit banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10 rounded-xl border border-fire/30 bg-gradient-to-r from-fire/10 via-fire/5 to-transparent px-6 py-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-fire-glow">
                Security Status
              </div>
              <div className="mt-1 text-sm text-rice">
                <span className="font-bold">Security review / audit process initiated.</span>{" "}
                Engagement with external auditors is underway. Results will be published on{" "}
                <Link href="/proof#security" className="text-fire underline">
                  Proof-Hub
                </Link>{" "}
                when finalized. We do not claim any audit completion until officially confirmed by the auditor.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

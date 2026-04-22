"use client";

import { motion } from "framer-motion";

const milestones = [
  { era: "~ 800 BC", title: "The First Pot", text: "Rice meets fire in clay vessels. The recipe is born — different in every village, the same at heart." },
  { era: "10th Century", title: "The Spread", text: "Trade routes carry the recipe across continents. Saffron, lamb, dried fruit, chicken, vegetables. Each version honest." },
  { era: "2010", title: "UNESCO Heritage", text: "Recognized as humanity's intangible cultural heritage — not because one place owns it, but because everyone does. A communal recipe scaled across cultures." },
  { era: "2026", title: "On-Chain", text: "A recipe that survived 1,000 years of distributed consensus moves to Solana. Same philosophy, new technology. Open source, community-owned, immutable." },
];

export function Story() {
  return (
    <section id="story" className="relative py-32">
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-20 max-w-3xl"
        >
          <div className="badge-pill mb-5">Chapter One</div>
          <h2 className="font-display text-5xl leading-[0.95] text-rice md:text-7xl">
            From every kitchen
            <br />
            <span className="text-fire-gradient">to the blockchain</span>
          </h2>
          <p className="mt-8 max-w-2xl font-serif text-xl italic text-rice-soft">
            Plov didn't belong to one place. It appeared, independently, wherever fire met grain
            and meat met spice. A universal recipe written not by one chef, but by humanity itself.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="grid gap-6 md:grid-cols-4">
          {milestones.map((m, i) => (
            <motion.div
              key={m.era}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative"
            >
              {/* Connector dot */}
              <div className="mb-6 flex items-center">
                <div className="relative h-3 w-3 rounded-full bg-fire shadow-[0_0_15px_rgba(255,107,26,0.8)]">
                  <div className="absolute inset-0 animate-ping rounded-full bg-fire opacity-50" />
                </div>
                {i < milestones.length - 1 && (
                  <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-fire/40 to-fire/5" />
                )}
              </div>

              <div className="font-mono text-xs uppercase tracking-widest text-fire-glow">
                {m.era}
              </div>
              <h3 className="mt-2 font-display text-2xl text-rice">{m.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-rice-soft">{m.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

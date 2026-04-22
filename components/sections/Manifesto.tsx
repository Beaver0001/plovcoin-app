"use client";

import { motion } from "framer-motion";
import { Flame, Sparkles, Users } from "lucide-react";

const beliefs = [
  {
    icon: Flame,
    no: "01",
    title: "Culture First",
    body: "Most tokens borrow a cute mascot and call it a day. We're rooted in something older — a recipe that connects strangers across continents. Real story, real heritage, real meaning.",
    quote: "If your meme needs explaining, it isn't one yet.",
  },
  {
    icon: Sparkles,
    no: "02",
    title: "Fair Launch",
    body: "No presale. No private round. No insider allocations. No VCs at a discount. Everyone gets the same shot, at the same price, at the same time. The token launches the way a community potluck starts — open to all who show up.",
    quote: "Same fire, same kazan, same chance.",
  },
  {
    icon: Users,
    no: "03",
    title: "Community Owned",
    body: "45% of supply goes to airdrops over four waves. Just 8% for the team, fully vested. Mint authority disabled forever. Liquidity locked. The chef sets the table, the community feasts together.",
    quote: "The one who cooks it shouldn't own it. The belongs to those who eat.",
  },
];

export function Manifesto() {
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
          <div className="badge-pill mb-5">Chapter Two</div>
          <h2 className="font-display text-5xl leading-[0.95] text-rice md:text-7xl">
            Three things
            <br />
            <span className="text-fire-gradient">we believe</span>
          </h2>
          <p className="mt-8 max-w-2xl font-serif text-xl italic text-rice-soft">
            Most memecoins are jokes told once. We're building something that already passed
            the test — a cultural artifact that survived for centuries because it actually works.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {beliefs.map((b, i) => {
            const Icon = b.icon;
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
                  "{b.quote}"
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

const TGE_DATE = new Date("2026-06-01T00:00:00Z").getTime();

function useCountdown() {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, TGE_DATE - now);
      setTime({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

function Embers() {
  const embers = Array.from({ length: 20 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {embers.map((_, i) => (
        <motion.div
          key={i}
          className="ember"
          initial={{
            x: `${Math.random() * 100}%`,
            y: "100%",
            opacity: 0,
          }}
          animate={{
            y: "-10%",
            opacity: [0, 1, 1, 0],
            x: `${Math.random() * 100}%`,
          }}
          transition={{
            duration: 8 + Math.random() * 6,
            repeat: Infinity,
            delay: Math.random() * 8,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

export function Hero() {
  const t = useCountdown();

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-ember-radial" />
      <Embers />

      <div className="container-narrow relative z-10 text-center">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-3 rounded-full border border-fire/25 bg-bg-soft/60 px-4 py-1.5 backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-fire opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-fire" />
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-rice-soft">
            Solana · Pre-TGE · June 2026
          </span>
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-7xl leading-none tracking-tight text-fire-gradient glow-text animate-fire-flicker md:text-9xl"
        >
          $PLOV
        </motion.h1>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mx-auto mt-8 max-w-2xl"
        >
          <p className="font-serif text-3xl italic leading-tight text-rice md:text-4xl">
            Billions have tasted it.{" "}
            <span className="text-fire-glow">Now they can own it.</span>
          </p>
          <p className="mt-6 text-base text-rice-soft md:text-lg">
            A recipe loved across every continent. Now on-chain, with a 1,000-year community testing it.
            Fair launch. No presale. No&nbsp;VC.
          </p>
        </motion.div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mx-auto mt-12 grid max-w-xl grid-cols-4 gap-3"
        >
          {[
            { label: "Days", value: t.days },
            { label: "Hours", value: t.hours },
            { label: "Mins", value: t.minutes },
            { label: "Secs", value: t.seconds },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-fire/20 bg-bg-soft/60 px-3 py-4 backdrop-blur-sm"
            >
              <div className="font-display text-3xl text-fire-gradient md:text-4xl tabular-nums">
                {String(item.value).padStart(2, "0")}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-rice-dim">
                {item.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link href="/#community" className="btn-primary">
            Join PlovArmy →
          </Link>
          <Link href="/whitepaper" className="btn-secondary">
            Read Whitepaper
          </Link>
        </motion.div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-20 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-rice-dim"
        >
          {[
            "Globally Loved",
            "13B Fixed Supply",
            "Squads Multisig",
            "Fair Launch",
            "Proof-Hub Open",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 font-mono uppercase tracking-wider">
              <span className="h-1 w-1 rounded-full bg-fire/60" />
              {item}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg to-transparent" />
    </section>
  );
}

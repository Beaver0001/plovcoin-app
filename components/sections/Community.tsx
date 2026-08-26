"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useI18n } from "../I18nProvider";
import { localePath } from "@/lib/i18n";

const channels = [
  {
    name: "Telegram",
    handle: "@PlovCoinAnnouncements",
    href: "https://t.me/PlovCoinAnnouncements",
    color: "from-[#2AABEE] to-[#229ED9]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },  {
    name: "X / Twitter",
    handle: "@PlovTeam",
    href: "https://x.com/PlovTeam",
    color: "from-rice to-rice-soft",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  }
  
  
];

export function Community() {
  const { locale, t } = useI18n();

  return (
    <section id="community" className="relative py-32">
      <div className="container-narrow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 max-w-3xl"
        >
          <div className="badge-pill mb-5">{t.community.chapter}</div>
          <h2 className="font-display text-5xl leading-[0.95] text-rice md:text-7xl">
            {t.community.titleLine1}
            <br />
            <span className="text-fire-gradient">{t.community.titleLine2}</span>
          </h2>
          <p className="mt-8 max-w-2xl font-serif text-xl italic text-rice-soft">
            {t.community.intro}
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((c, i) => (
            <motion.a
              key={c.name}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="card-warm group flex flex-col items-center text-center"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${c.color} text-bg shadow-lg transition-transform group-hover:scale-110`}
              >
                {c.icon}
              </div>
              <div className="mt-4 font-display text-lg text-rice">{c.name}</div>
              <div className="mt-1 font-mono text-xs text-rice-dim">{c.handle}</div>
            </motion.a>
          ))}
        </div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <div className="font-display text-4xl text-fire-gradient glow-text md:text-6xl">
            {t.community.finalTitle}
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="https://x.com/PlovTeam" target="_blank" rel="noopener noreferrer" className="btn-primary">
              {t.community.ctaPrimary}
            </Link>
            <Link href={localePath(locale, "/whitepaper")} className="btn-secondary">
              {t.community.ctaSecondary}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

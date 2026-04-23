"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, Eye, FileCheck, ArrowUpRight } from "lucide-react";
import { useI18n } from "../I18nProvider";
import { localePath } from "@/lib/i18n";

const ICONS = [ShieldCheck, Eye, FileCheck];

export function Security() {
  const { locale, t } = useI18n();

  const hrefs = [
    localePath(locale, "/proof") + "#addresses",
    localePath(locale, "/proof"),
    localePath(locale, "/proof") + "#security",
  ];

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
          <div className="badge-pill mb-5">{t.security.chapter}</div>
          <h2 className="font-display text-5xl leading-[0.95] text-rice md:text-7xl">
            {t.security.titleLine1}
            <br />
            <span className="text-fire-gradient">{t.security.titleLine2}</span>
          </h2>
          <p className="mt-8 max-w-2xl font-serif text-xl italic text-rice-soft">
            {t.security.intro}
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {t.security.cards.map((card, i) => {
            const Icon = ICONS[i] ?? ShieldCheck;
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
                  href={hrefs[i] ?? localePath(locale, "/proof")}
                  className="mt-5 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-fire transition-all hover:gap-2.5"
                >
                  {card.ctaLabel}
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
                {t.security.bannerLabel}
              </div>
              <div className="mt-1 text-sm text-rice">
                <span className="font-bold">{t.security.bannerBold}</span>{" "}
                {t.security.bannerRest}{" "}
                <Link href={`${localePath(locale, "/proof")}#security`} className="text-fire underline">
                  {t.security.bannerProofLink}
                </Link>{" "}
                {t.security.bannerTail}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

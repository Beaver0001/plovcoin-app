"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, FileText, HelpCircle, ShieldCheck, AlertTriangle } from "lucide-react";
import enDict from "@/lib/dictionaries/en.json";
import ruDict from "@/lib/dictionaries/ru.json";

export default function NotFound() {
  const pathname = usePathname();
  // Detect locale from pathname (best-effort - not-found runs before layouts)
  const isRu = pathname?.startsWith("/ru");
  const t = isRu ? ruDict.notFound : enDict.notFound;
  const prefix = isRu ? "/ru" : "";

  const links = [
    { href: `${prefix}/`, label: t.links.home, Icon: Home },
    { href: `${prefix}/whitepaper`, label: t.links.whitepaper, Icon: FileText },
    { href: `${prefix}/faq`, label: t.links.faq, Icon: HelpCircle },
    { href: `${prefix}/proof`, label: t.links.proof, Icon: ShieldCheck },
  ];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-ember-radial opacity-40" />

      <div className="relative w-full max-w-xl text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex justify-center"
        >
          <Image
            src="/plov-logo.png"
            alt="PlovCoin"
            width={72}
            height={72}
            priority
            className="h-16 w-16 sm:h-20 sm:w-20"
            style={{ mixBlendMode: "screen" }}
          />
        </motion.div>

        {/* Badge with 404 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-fire/30 bg-fire/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-fire"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-fire animate-pulse" />
          {t.badge}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 font-display text-4xl leading-tight text-rice sm:text-5xl"
        >
          <span className="text-fire-gradient glow-text">{t.title}</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-base italic text-rice-soft"
        >
          {t.subtitle}
        </motion.p>

        {/* Suggestion */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10"
        >
          <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-fire-glow">
            {t.suggestion}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {links.map((link, i) => {
              const Icon = link.Icon;
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className="group flex items-center gap-3 rounded-xl border border-fire/15 bg-bg-soft/60 px-4 py-3 text-left transition-all hover:border-fire/40 hover:bg-fire/5"
                  >
                    <Icon size={16} className="shrink-0 text-fire" />
                    <span className="font-display text-sm text-rice group-hover:text-fire">
                      {link.label}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Anti-phishing note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-8 flex items-center justify-center gap-2 text-xs text-rice-dim"
        >
          <AlertTriangle size={12} className="text-fire/60" />
          <span>{t.antiPhishNote}</span>
        </motion.div>
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useI18n } from "./I18nProvider";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { localePath } from "@/lib/i18n";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { locale, t } = useI18n();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const home = localePath(locale, "/");
  const proof = localePath(locale, "/proof");
  const whitepaper = localePath(locale, "/whitepaper");
  const faq = localePath(locale, "/faq");

  const links = [
    { href: `${home}#story`, label: t.nav.story },
    { href: `${home}#tokenomics`, label: t.nav.tokenomics },
    { href: `${home}#roadmap`, label: t.nav.roadmap },
    { href: proof, label: t.nav.proofHub },
    { href: whitepaper, label: t.nav.whitepaper },
    { href: faq, label: t.nav.faq },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-fire/10 bg-bg/80 backdrop-blur-xl"
          : "bg-transparent"
      )}
    >
      <nav className="container-narrow flex h-16 items-center justify-between">
        <Link
          href={home}
          className="font-display text-2xl text-fire-gradient glow-text"
        >
          $PLOV
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-xs uppercase tracking-wider text-rice-soft transition-colors hover:text-fire"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-5">
          <LocaleSwitcher />
          <Link
            href={`${home}#community`}
            className="btn-primary !py-2 !px-5 !text-sm"
          >
            {t.nav.joinCta}
          </Link>
        </div>

        <button
          className="md:hidden text-rice"
          onClick={() => setOpen(!open)}
          aria-label={t.ui.menu}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-fire/10 bg-bg-soft md:hidden">
          <div className="container-narrow flex flex-col gap-4 py-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-mono text-sm uppercase tracking-wider text-rice-soft hover:text-fire"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-fire/10 flex items-center justify-between">
              <LocaleSwitcher />
            </div>
            <Link
              href={`${home}#community`}
              onClick={() => setOpen(false)}
              className="btn-primary !py-2.5 !text-sm"
            >
              {t.nav.joinCta}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

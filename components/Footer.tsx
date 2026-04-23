"use client";

import Link from "next/link";
import { useI18n } from "./I18nProvider";
import { localePath } from "@/lib/i18n";

export function Footer() {
  const { locale, t } = useI18n();
  const home = localePath(locale, "/");

  const sections = {
    [t.footer.sectionProduct]: [
      { href: `${home}#story`, label: t.footer.links.story },
      { href: `${home}#tokenomics`, label: t.footer.links.tokenomics },
      { href: `${home}#roadmap`, label: t.footer.links.roadmap },
      { href: `${home}#security`, label: t.footer.links.security },
    ],
    [t.footer.sectionResources]: [
      { href: localePath(locale, "/whitepaper"), label: t.footer.links.whitepaper },
      { href: localePath(locale, "/proof"), label: t.footer.links.proof },
      { href: localePath(locale, "/plovdrop"), label: t.footer.links.plovdrop },
    ],
    [t.footer.sectionCommunity]: [
      { href: "https://t.me/plovcoin", label: "Telegram", external: true },
      { href: "https://x.com/PlovCoin", label: "X / Twitter", external: true },
      { href: "https://instagram.com/plovcoin", label: "Instagram", external: true },
      { href: "https://tiktok.com/@plovcoin", label: "TikTok", external: true },
    ],
    [t.footer.sectionContact]: [
      { href: "mailto:hello@plovcoin.com", label: "hello@plovcoin.com" },
      { href: "mailto:security@plovcoin.com", label: "security@plovcoin.com" },
      { href: "mailto:listing@plovcoin.com", label: "listing@plovcoin.com" },
    ],
  } as const;

  return (
    <footer className="relative mt-32 border-t border-fire/10 bg-bg-soft/40">
      <div className="container-narrow py-16">
        {/* Anti-phishing banner */}
        <div className="mb-12 rounded-xl border border-fire/30 bg-fire/5 px-5 py-4 font-mono text-xs text-rice-soft">
          <span className="font-bold text-fire">{t.footer.antiPhishBold}</span>{" "}
          {t.footer.antiPhishText}
        </div>

        {/* Brand + Links */}
        <div className="grid gap-12 lg:grid-cols-[1.5fr_3fr]">
          <div>
            <div className="font-display text-3xl text-fire-gradient glow-text">$PLOV</div>
            <p className="mt-3 font-serif text-lg italic text-rice-soft">
              {t.footer.tagline}
            </p>
            <p className="mt-6 max-w-sm text-sm text-rice-dim">
              {t.footer.briefDesc}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {Object.entries(sections).map(([title, items]) => (
              <div key={title}>
                <div className="mb-4 font-mono text-xs uppercase tracking-widest text-fire-glow">
                  {title}
                </div>
                <ul className="space-y-2.5">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        target={"external" in item && item.external ? "_blank" : undefined}
                        rel={"external" in item && item.external ? "noopener noreferrer" : undefined}
                        className="text-sm text-rice-soft transition-colors hover:text-fire"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="divider-fire my-12" />

        {/* Risk disclaimer */}
        <div className="rounded-xl border border-rice-dim/20 bg-bg/40 px-5 py-4 font-mono text-[11px] leading-relaxed text-rice-dim">
          <span className="font-bold text-rice-soft">{t.footer.riskBold}</span>{" "}
          {t.footer.riskText}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 text-xs text-rice-dim sm:flex-row">
          <div>{t.footer.copyright}</div>
          <div className="font-mono">
            {t.footer.builtOn} <span className="text-fire">Solana</span> · {t.footer.auditedOn}{" "}
            <Link href={localePath(locale, "/proof")} className="text-fire hover:underline">
              /proof
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

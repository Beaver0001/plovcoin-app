import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import { official, claimCopy } from "@/lib/official-config.mjs";

async function claimLocale() {
  return (await headers()).get("x-plov-locale") === "ru" ? "ru" : "en";
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await claimLocale();
  const copy = claimCopy(locale);
  return {
    title: `${copy.title} — PlovCoin`, description: copy.intro,
    robots: { index: false, follow: false },
    alternates: {
      canonical: `${official.claim}${locale === "ru" ? "/ru" : "/"}`,
      languages: { en: `${official.claim}/`, ru: `${official.claim}/ru` },
    },
  };
}

export default async function ClaimSoonPage() {
  const locale = await claimLocale();
  const copy = claimCopy(locale);
  const announcements = official.channels.find(channel => channel.id === `announcements_${locale}`)!;
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xl text-center">
        <a href={official.website} className="inline-flex items-center gap-3">
          <Image src="/plov-logo.png" alt="PlovCoin" width={64} height={64} priority className="h-16 w-16" />
          <span className="font-display text-4xl text-fire-gradient glow-text">$PLOV</span>
        </a>
        <nav aria-label={locale === "ru" ? "Язык" : "Language"} className="mt-6 flex justify-center gap-4 font-mono text-sm">
          <a href="?setLocale=en" hrefLang="en" aria-current={locale === "en" ? "page" : undefined} className={locale === "en" ? "text-fire" : "text-rice-soft"}>EN</a>
          <a href="?setLocale=ru" hrefLang="ru" aria-current={locale === "ru" ? "page" : undefined} className={locale === "ru" ? "text-fire" : "text-rice-soft"}>RU</a>
        </nav>
        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-fire/30 bg-fire/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-fire">
          <span className="h-1.5 w-1.5 rounded-full bg-fire animate-pulse" />
          {new URL(official.claim).hostname}
        </div>
        <h1 className="mt-8 font-display text-4xl leading-tight text-fire-gradient glow-text sm:text-5xl">{copy.title}</h1>
        <p className="mt-6 text-base text-rice-soft">{copy.intro}</p>
        <p className="mt-3 text-sm text-rice-dim">{copy.rules}</p>
        <div className="mt-8 rounded-xl border border-fire/20 bg-fire/5 p-4 text-left">
          <div className="font-mono text-[10px] uppercase tracking-widest text-fire">⚠ {locale === "ru" ? "Безопасность" : "Security"}</div>
          <p className="mt-2 text-sm leading-relaxed text-rice-soft">{copy.security}</p>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={announcements.href} target="_blank" rel="noopener noreferrer" className="btn-primary">{locale === "ru" ? "Официальные анонсы" : "Official announcements"}</a>
          <a href={official.website} className="btn-secondary">{copy.back}</a>
        </div>
        <div className="mt-12 border-t border-fire/10 pt-6">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-fire-glow">{copy.sources}</h2>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 font-mono text-xs text-rice-soft">
            {official.channels.map(channel => (
              <li key={channel.id}><a href={channel.href} target="_blank" rel="noopener noreferrer" className="hover:text-fire">{channel[locale]}</a></li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-rice-dim">{copy.membership}</p>
        </div>
      </div>
    </main>
  );
}

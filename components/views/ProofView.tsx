"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import { localePath } from "@/lib/i18n";
import { official } from "@/lib/official-config.mjs";
import evidence from "@/lib/proof-evidence.json";

const observedAt = `${evidence.observedAt.slice(0, 19).replace("T", " ")} UTC`;

function formatTokens(raw: string, locale: string) {
  const whole = BigInt(raw) / 10n ** BigInt(evidence.decimals);
  return `${whole.toLocaleString(locale === "ru" ? "ru-RU" : "en-US")} PLOV`;
}

export function ProofView() {
  const { locale, t } = useI18n();
  const snapshot = [
    { label: t.proof.snapshotLabels.supply, value: formatTokens(evidence.supply, locale), href: `https://solscan.io/token/${official.mint}` },
    { label: t.proof.snapshotLabels.balance, value: formatTokens(evidence.treasuryBalance, locale), href: `https://solscan.io/account/${evidence.treasuryTokenAccount}` },
    { label: t.proof.snapshotLabels.updateAuthority, value: evidence.updateAuthority, href: `https://solscan.io/account/${evidence.updateAuthority}` },
    { label: t.proof.snapshotLabels.metadataAccount, value: evidence.metadataAccount, href: `https://solscan.io/account/${evidence.metadataAccount}` },
  ];

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container-narrow">
          {/* Header */}
          <div className="mb-12">
            <div className="badge-pill mb-5">{t.proof.chapter}</div>
            <h1 className="font-display text-5xl leading-[0.95] text-rice md:text-6xl">
              {t.proof.titleStart}
              <span className="text-fire-gradient">{t.proof.titleAccent}</span>
            </h1>
            <p className="mt-6 max-w-2xl font-serif text-xl italic text-rice-soft">
              {t.proof.intro}
            </p>
            <p className="mt-4 text-xs text-rice-soft">
              {t.proof.copyReviewedLabel}: <time dateTime={evidence.copyReviewedOn}>{evidence.copyReviewedOn}</time>
            </p>
          </div>

          {/* Quick navigation */}
          <nav className="mb-16 flex flex-wrap gap-2 rounded-2xl border border-fire/15 bg-bg-soft/40 p-4">
            {t.proof.sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-fire/20 bg-bg/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-rice-soft transition-all hover:border-fire hover:text-fire"
              >
                {s.title}
              </a>
            ))}
          </nav>

          {/* Sections */}
          <div className="space-y-10">
            {t.proof.sections.map((s) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-24 rounded-2xl border border-fire/15 bg-bg-soft/40 p-5 sm:p-8"
              >
                {s.id === "security" && (
                  <div className="mb-8 rounded-xl border border-fire/30 bg-fire/5 p-5">
                    <h2 className="font-display text-2xl text-rice">
                      {t.security.cards[2].title}
                    </h2>
                    <dl className="mt-4 space-y-3 text-sm leading-relaxed">
                      {t.proof.reviewFields.map(field => (
                        <div key={field.label}>
                          <dt className="font-semibold text-rice">{field.label}</dt>
                          <dd className="mt-1 text-rice-soft">{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-4 text-sm text-rice-soft">
                      {official.hacken.reportUrl ? (
                        <a href={official.hacken.reportUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t.proof.reportLinkLabel}</a>
                      ) : t.proof.reportLinkPending}
                    </p>
                  </div>
                )}
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="break-words font-display text-2xl text-rice sm:text-3xl">{s.title}</h2>
                </div>
                <p className="text-sm text-rice-soft">{s.note}</p>
                {s.id === "security" && (
                  <div className="mt-6 space-y-3">
                    <p className="text-xs leading-relaxed text-rice-soft">
                      {t.proof.observedLabel}: <time dateTime={evidence.observedAt}>{observedAt}</time>
                      {` · finalized · slot ${evidence.slot}`}
                    </p>
                    <p className="text-xs leading-relaxed text-rice-soft">{t.proof.observationNote}</p>
                    <dl className="space-y-3 rounded-xl border border-rice-dim/20 bg-bg/40 p-4 text-sm">
                      {snapshot.map(item => (
                        <div key={item.label}>
                          <dt className="text-rice">{item.label}</dt>
                          <dd className="mt-1 break-all font-mono text-xs text-rice-soft">
                            <a href={item.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-fire">{item.value}</a>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {(() => {
                  const items = (s as {
                    items?: { label: string; value: string; href: string; tag: string }[];
                  }).items;
                  if (!items || items.length === 0) {
                    return (
                      <div className="mt-6 rounded-xl border border-rice-dim/20 bg-bg/40 p-5 font-mono text-xs text-rice-dim">
                        {("emptyState" in s && s.emptyState) || t.proof.placeholder}
                        <div className="mt-3 text-[11px]">
                          {t.proof.placeholderNote}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-6 space-y-2">
                      {items.map((it) => (
                        <div
                          key={it.label + it.value}
                          className="rounded-xl border border-rice-dim/20 bg-bg/40 p-4 font-mono text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-fire-glow">
                              {it.label}
                            </span>
                            {it.tag ? (
                              <span className="rounded-full border border-fire/30 bg-fire/10 px-2 py-0.5 text-[10px] text-fire">
                                {it.tag}
                              </span>
                            ) : null}
                          </div>
                          {it.href ? (
                            <a
                              href={it.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block break-all text-rice-soft transition-colors hover:text-fire"
                            >
                              {it.value}
                            </a>
                          ) : (
                            <div className="mt-1 break-all text-rice-dim">{it.value}</div>
                          )}
                          {evidence.multisigs.some(multisig => multisig.address === it.value) && (
                            <p className="mt-2 text-[11px] leading-relaxed text-rice-soft">
                              {t.proof.observedLabel}: <time dateTime={evidence.observedAt}>{observedAt}</time>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </section>
            ))}
          </div>

          {/* Verify guidance */}
          <div className="mt-16 rounded-2xl border border-fire/30 bg-fire/5 p-8 text-center">
            <h3 className="font-display text-2xl text-rice">{t.proof.verifyTitle}</h3>
            <p className="mt-3 max-w-xl mx-auto text-sm text-rice-soft">
              {t.proof.verifyText}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="https://solscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary !text-sm !py-2.5 !px-5"
              >
                {t.proof.verifyCta1}
              </Link>
              <Link href={localePath(locale, "/whitepaper")} className="btn-secondary !text-sm !py-2.5 !px-5">
                {t.proof.verifyCta2}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

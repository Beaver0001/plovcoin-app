"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import { localePath } from "@/lib/i18n";

const STATUS_FLAGS = ["coming", "locked", "locked", "locked"] as const;

const statusColorMap = {
  coming: "text-fire border-fire/40 bg-fire/10",
  locked: "text-rice-dim border-rice-dim/20 bg-bg/40",
};

export function PlovDropView() {
  const { locale, t } = useI18n();

  const statusLabelMap = {
    coming: t.plovdrop.statusComing,
    locked: t.plovdrop.statusLocked,
  };

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container-narrow">
          <div className="mb-12">
            <div className="badge-pill mb-5">{t.plovdrop.badge}</div>
            <h1 className="font-display text-5xl leading-[0.95] text-rice md:text-6xl">
              {t.plovdrop.titleStart}
              <span className="text-fire-gradient">{t.plovdrop.titleAccent}</span>
            </h1>
            <p className="mt-6 max-w-2xl font-serif text-xl italic text-rice-soft">
              {t.plovdrop.intro}
            </p>
          </div>

          {/* Anti-phishing notice */}
          <div className="mb-12 rounded-xl border border-fire/30 bg-fire/5 px-5 py-4 font-mono text-xs text-rice-soft">
            <span className="font-bold text-fire">{t.plovdrop.phishBold}</span>{" "}
            {t.plovdrop.phishText}
          </div>

          {/* Waves */}
          <div className="space-y-4">
            {t.plovdrop.waves.map((w, i) => {
              const flag = STATUS_FLAGS[i] ?? "locked";
              return (
                <div
                  key={w.wave}
                  className={`card-warm grid gap-6 md:grid-cols-[200px_1fr_auto] !p-6 ${
                    flag === "coming" ? "border-fire/40 bg-bg-soft/80" : ""
                  }`}
                >
                  <div>
                    <div className="font-display text-3xl text-rice">{w.wave}</div>
                    <div className="mt-1 font-mono text-xs uppercase tracking-widest text-rice-dim">
                      {w.when}
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-2xl text-fire-gradient">{w.pct}</div>
                    <div className="mt-2 text-sm text-rice-soft">{w.target}</div>
                  </div>
                  <div
                    className={`inline-flex h-fit items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${statusColorMap[flag]}`}
                  >
                    {statusLabelMap[flag]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-2xl border border-fire/30 bg-fire/5 p-8 text-center">
            <h3 className="font-display text-2xl text-rice">{t.plovdrop.ctaTitle}</h3>
            <p className="mt-3 max-w-xl mx-auto text-sm text-rice-soft">
              {t.plovdrop.ctaText}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="https://t.me/plovcoin"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary !text-sm !py-2.5 !px-5"
              >
                {t.plovdrop.ctaPrimary}
              </Link>
              <Link href={`${localePath(locale, "/proof")}#airdrop`} className="btn-secondary !text-sm !py-2.5 !px-5">
                {t.plovdrop.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

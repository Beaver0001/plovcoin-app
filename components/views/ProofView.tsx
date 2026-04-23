"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import { localePath } from "@/lib/i18n";

export function ProofView() {
  const { locale, t } = useI18n();

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
                className="scroll-mt-24 rounded-2xl border border-fire/15 bg-bg-soft/40 p-8"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-3xl text-rice">{s.title}</h2>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-rice-dim">
                    {t.proof.lastUpdated}
                  </span>
                </div>
                <p className="text-sm text-rice-soft">{s.note}</p>

                <div className="mt-6 rounded-xl border border-rice-dim/20 bg-bg/40 p-5 font-mono text-xs text-rice-dim">
                  {t.proof.placeholder}
                  <div className="mt-3 text-[11px]">
                    {t.proof.placeholderNote}
                  </div>
                </div>
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

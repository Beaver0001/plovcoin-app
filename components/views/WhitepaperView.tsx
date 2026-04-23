"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

export function WhitepaperView() {
  const { t } = useI18n();

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container-narrow">
          <div className="mb-12">
            <div className="badge-pill mb-5">{t.whitepaper.badge}</div>
            <h1 className="font-display text-5xl leading-[0.95] text-rice md:text-6xl">
              <span className="text-fire-gradient">{t.whitepaper.title}</span>
            </h1>
            <p className="mt-6 max-w-2xl font-serif text-xl italic text-rice-soft">
              {t.whitepaper.intro}
            </p>
          </div>

          {/* Download CTA */}
          <div className="mb-16 grid gap-4 sm:grid-cols-2">
            <Link
              href="/whitepaper-v7.3.pdf"
              target="_blank"
              className="card-warm flex items-center gap-4 hover:border-fire/60"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-fire/30 bg-fire/10">
                <Download size={22} className="text-fire" />
              </div>
              <div>
                <div className="font-display text-lg text-rice">{t.whitepaper.downloadTitle}</div>
                <div className="font-mono text-xs text-rice-dim">{t.whitepaper.downloadMeta}</div>
              </div>
            </Link>

            <Link
              href="https://github.com/Beaver0001/plovcoin-app"
              target="_blank"
              rel="noopener noreferrer"
              className="card-warm flex items-center gap-4 hover:border-fire/60"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-fire/30 bg-fire/10">
                <FileText size={22} className="text-fire" />
              </div>
              <div>
                <div className="font-display text-lg text-rice">{t.whitepaper.githubTitle}</div>
                <div className="font-mono text-xs text-rice-dim">{t.whitepaper.githubMeta}</div>
              </div>
            </Link>
          </div>

          {/* Table of contents */}
          <div className="rounded-2xl border border-fire/15 bg-bg-soft/40 p-8">
            <div className="mb-6 font-mono text-xs uppercase tracking-widest text-fire-glow">
              {t.whitepaper.toc}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {t.whitepaper.sections.map((s) => (
                <div
                  key={s.num}
                  className="flex gap-4 rounded-xl border border-rice-dim/10 bg-bg/40 p-4"
                >
                  <div className="font-display text-2xl text-fire-gradient leading-none">
                    {s.num}
                  </div>
                  <div>
                    <div className="font-display text-base text-rice">{s.title}</div>
                    <div className="mt-1 text-xs text-rice-soft">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

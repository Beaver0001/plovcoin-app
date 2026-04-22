import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";
import { Download, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Whitepaper v7.3",
  description:
    "PlovCoin Whitepaper v7.3 — full technical and economic specification. Tokenomics, liquidity strategy, security architecture, roadmap.",
};

const sections = [
  { num: "01", title: "Executive Summary", desc: "What $PLOV is, why it exists, what it isn't." },
  { num: "02", title: "Cultural Thesis", desc: "Why a universal recipe is the right base for a memecoin." },
  { num: "03", title: "Tokenomics", desc: "Supply, distribution, allocation rationale, vesting." },
  { num: "04", title: "Liquidity Strategy", desc: "Meteora DLMM, Raydium, Orca CLMM. Pool design and protections." },
  { num: "05", title: "PlovDrop", desc: "Four-wave airdrop structure. Anti-sybil. Eligibility criteria." },
  { num: "06", title: "Security Architecture", desc: "Squads multisig, Streamflow vesting, audit process, MEV policy." },
  { num: "07", title: "Roadmap", desc: "Phase 0 through Phase 4+. Milestones, dependencies." },
  { num: "08", title: "Governance (Future)", desc: "PlovDAO transition path. Voting mechanics. Treasury control." },
  { num: "09", title: "Risks & Disclaimers", desc: "Comprehensive risk disclosure. Regulatory considerations." },
  { num: "10", title: "Team & Operations", desc: "Pseudonymous team structure. DRI registry. Operational discipline." },
];

export default function WhitepaperPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container-narrow">
          <div className="mb-12">
            <div className="badge-pill mb-5">Document v7.3 · April 2026</div>
            <h1 className="font-display text-5xl leading-[0.95] text-rice md:text-6xl">
              <span className="text-fire-gradient">Whitepaper</span>
            </h1>
            <p className="mt-6 max-w-2xl font-serif text-xl italic text-rice-soft">
              Full technical and economic specification. Read it. Question it. Verify it.
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
                <div className="font-display text-lg text-rice">Download PDF</div>
                <div className="font-mono text-xs text-rice-dim">~2.4 MB · 48 pages</div>
              </div>
            </Link>

            <Link
              href="https://github.com/Beaver0001/plovcoin-website"
              target="_blank"
              rel="noopener noreferrer"
              className="card-warm flex items-center gap-4 hover:border-fire/60"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-fire/30 bg-fire/10">
                <FileText size={22} className="text-fire" />
              </div>
              <div>
                <div className="font-display text-lg text-rice">View on GitHub</div>
                <div className="font-mono text-xs text-rice-dim">Markdown source</div>
              </div>
            </Link>
          </div>

          {/* Table of contents */}
          <div className="rounded-2xl border border-fire/15 bg-bg-soft/40 p-8">
            <div className="mb-6 font-mono text-xs uppercase tracking-widest text-fire-glow">
              Table of Contents
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {sections.map((s) => (
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

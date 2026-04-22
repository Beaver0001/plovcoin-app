import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proof-Hub — On-Chain Verification",
  description:
    "Verify every PlovCoin operation on-chain. Addresses, liquidity, airdrops, burns, vesting, advertising, security, incidents — all public, all verifiable on Solana.",
};

const sections = [
  { id: "addresses", title: "Addresses", note: "All Squads multisig + mint address. Single source of truth." },
  { id: "liquidity", title: "Liquidity", note: "Pool addresses, seed transactions, lock/timelock status." },
  { id: "airdrop", title: "Airdrop / PlovDrop", note: "Per-wave snapshot hash, IPFS CID, claim portal link." },
  { id: "burn-log", title: "Burn Log", note: "Date, amount, reason, transaction hash for every burn." },
  { id: "vesting", title: "Vesting", note: "Streamflow stream IDs for every team member." },
  { id: "advertising", title: "Advertising / KOL", note: "Every paid placement: KOL, platform, amount, tx hash." },
  { id: "security", title: "Security", note: "Audit status, security@plovcoin.com, PGP key, bug bounty." },
  { id: "incidents", title: "Incidents", note: "P0/P1 incident notes within 24h. Post-mortems published." },
  { id: "transparency", title: "Transparency Reports", note: "Monthly KPI report — first 3 days of each month." },
];

const PLACEHOLDER = "— pending publication —";

export default function ProofPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container-narrow">
          {/* Header */}
          <div className="mb-12">
            <div className="badge-pill mb-5">Verifiable on Solana</div>
            <h1 className="font-display text-5xl leading-[0.95] text-rice md:text-6xl">
              Proof-<span className="text-fire-gradient">Hub</span>
            </h1>
            <p className="mt-6 max-w-2xl font-serif text-xl italic text-rice-soft">
              Every action on-chain. Every address public. Every transaction verifiable.
              No private wallets. No hidden allocations.
            </p>
          </div>

          {/* Quick navigation */}
          <nav className="mb-16 flex flex-wrap gap-2 rounded-2xl border border-fire/15 bg-bg-soft/40 p-4">
            {sections.map((s) => (
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
            {sections.map((s) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-24 rounded-2xl border border-fire/15 bg-bg-soft/40 p-8"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-3xl text-rice">{s.title}</h2>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-rice-dim">
                    Last updated: pending TGE
                  </span>
                </div>
                <p className="text-sm text-rice-soft">{s.note}</p>

                <div className="mt-6 rounded-xl border border-rice-dim/20 bg-bg/40 p-5 font-mono text-xs text-rice-dim">
                  {PLACEHOLDER}
                  <div className="mt-3 text-[11px]">
                    Data will be published progressively as TGE approaches (June 2026).
                    Bookmark this page — every operation will appear here within 24 hours.
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Verify guidance */}
          <div className="mt-16 rounded-2xl border border-fire/30 bg-fire/5 p-8 text-center">
            <h3 className="font-display text-2xl text-rice">Verify everything yourself</h3>
            <p className="mt-3 max-w-xl mx-auto text-sm text-rice-soft">
              Once published, every address and transaction here links directly to Solscan.
              You don't need to trust us — verify on-chain.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="https://solscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary !text-sm !py-2.5 !px-5"
              >
                Open Solscan ↗
              </Link>
              <Link href="/whitepaper" className="btn-secondary !text-sm !py-2.5 !px-5">
                Read Whitepaper
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

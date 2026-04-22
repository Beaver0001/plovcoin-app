import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PlovDrop — 45% to Community",
  description:
    "PlovDrop is the largest allocation in $PLOV — 45% of supply distributed across four airdrop waves to the community.",
};

const waves = [
  {
    wave: "Wave 1",
    when: "TGE · June 2026",
    pct: "6.8%",
    target: "Founding members + #PlovChallenge participants",
    status: "Coming Soon",
    statusColor: "text-fire border-fire/40 bg-fire/10",
  },
  {
    wave: "Wave 2",
    when: "Q3 2026",
    pct: "12%",
    target: "Holders + active community + verified social engagement",
    status: "Locked",
    statusColor: "text-rice-dim border-rice-dim/20 bg-bg/40",
  },
  {
    wave: "Wave 3",
    when: "Q3-Q4 2026",
    pct: "13.2%",
    target: "Loyalty rewards + ecosystem contributors",
    status: "Locked",
    statusColor: "text-rice-dim border-rice-dim/20 bg-bg/40",
  },
  {
    wave: "Wave 4",
    when: "Q2 2027",
    pct: "13%",
    target: "Long-term holders + DAO participants",
    status: "Locked",
    statusColor: "text-rice-dim border-rice-dim/20 bg-bg/40",
  },
];

export default function PlovDropPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container-narrow">
          <div className="mb-12">
            <div className="badge-pill mb-5">45% to Community</div>
            <h1 className="font-display text-5xl leading-[0.95] text-rice md:text-6xl">
              Plov<span className="text-fire-gradient">Drop</span>
            </h1>
            <p className="mt-6 max-w-2xl font-serif text-xl italic text-rice-soft">
              The largest allocation goes to the people. Four waves over 12 months. No insiders, no whitelists, no pay-to-play.
            </p>
          </div>

          {/* Anti-phishing notice */}
          <div className="mb-12 rounded-xl border border-fire/30 bg-fire/5 px-5 py-4 font-mono text-xs text-rice-soft">
            <span className="font-bold text-fire">⚠ OFFICIAL CLAIM ONLY:</span>{" "}
            <span className="text-rice">claim.plovcoin.com</span> — opens at TGE.
            Any other URL is a phishing attempt. We will never DM you.
          </div>

          {/* Waves */}
          <div className="space-y-4">
            {waves.map((w) => (
              <div
                key={w.wave}
                className={`card-warm grid gap-6 md:grid-cols-[200px_1fr_auto] !p-6 ${
                  w.status === "Coming Soon" ? "border-fire/40 bg-bg-soft/80" : ""
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
                  className={`inline-flex h-fit items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${w.statusColor}`}
                >
                  {w.status}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-2xl border border-fire/30 bg-fire/5 p-8 text-center">
            <h3 className="font-display text-2xl text-rice">Want to be eligible?</h3>
            <p className="mt-3 max-w-xl mx-auto text-sm text-rice-soft">
              Join the community now. Wave 1 eligibility starts with #PlovChallenge participation
              and verified social engagement.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="https://t.me/plovcoin" target="_blank" rel="noopener noreferrer" className="btn-primary !text-sm !py-2.5 !px-5">
                Join PlovArmy →
              </Link>
              <Link href="/proof#airdrop" className="btn-secondary !text-sm !py-2.5 !px-5">
                Verify on Proof-Hub
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Claim — Opens at TGE | PlovCoin",
  description:
    "The PlovCoin airdrop claim portal opens at TGE (June 2026). Follow @PlovTeam for the launch announcement.",
  robots: { index: false, follow: false },
};

export default function ClaimSoonPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3">
          <Image
            src="/plov-logo.png"
            alt="PlovCoin"
            width={64}
            height={64}
            priority
            className="h-16 w-16"
            style={{ mixBlendMode: "screen" }}
          />
          <span className="font-display text-4xl text-fire-gradient glow-text">
            $PLOV
          </span>
        </Link>

        {/* Badge */}
        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-fire/30 bg-fire/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-fire">
          <span className="h-1.5 w-1.5 rounded-full bg-fire animate-pulse" />
          claim.plovcoin.com
        </div>

        {/* Title */}
        <h1 className="mt-8 font-display text-4xl leading-tight text-rice sm:text-5xl">
          Claim portal
          <br />
          <span className="text-fire-gradient glow-text">opens at TGE</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base text-rice-soft">
          The PlovCoin airdrop claim site will be live at Token Generation Event — target{" "}
          <strong className="text-rice">June 2026</strong>.
        </p>
        <p className="mt-3 text-sm text-rice-dim">
          Exact date announced 2 weeks before launch via official channels.
        </p>

        {/* Warning */}
        <div className="mt-8 rounded-xl border border-fire/20 bg-fire/5 p-4 text-left">
          <div className="font-mono text-[10px] uppercase tracking-widest text-fire">
            ⚠ Anti-phishing
          </div>
          <p className="mt-2 text-sm leading-relaxed text-rice-soft">
            <strong className="text-rice">claim.plovcoin.com</strong> is the{" "}
            <em>only</em> official PlovCoin claim domain. Any other URL is a scam. We will never DM
            you a claim link.
          </p>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="https://t.me/PlovCoinOfficial"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Follow announcements
          </a>
          <Link href="/" className="btn-secondary">
            Back to plovcoin.com
          </Link>
        </div>

        {/* Official links */}
        <div className="mt-12 border-t border-fire/10 pt-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-fire-glow">
            Official channels
          </div>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-xs text-rice-dim">
            <li>
              <a href="https://plovcoin.com" className="hover:text-fire">
                plovcoin.com
              </a>
            </li>
            <li>
              <a
                href="https://x.com/PlovTeam"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fire"
              >
                x.com/PlovTeam
              </a>
            </li>
            <li>
              <a
                href="https://t.me/PlovCoin"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fire"
              >
                t.me/PlovCoin
              </a>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

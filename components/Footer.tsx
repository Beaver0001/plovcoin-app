import Link from "next/link";

const sections = {
  Product: [
    { href: "/#story", label: "Story" },
    { href: "/#tokenomics", label: "Tokenomics" },
    { href: "/#roadmap", label: "Roadmap" },
    { href: "/#security", label: "Security" },
  ],
  Resources: [
    { href: "/whitepaper", label: "Whitepaper v7.3" },
    { href: "/proof", label: "Proof-Hub" },
    { href: "/plovdrop", label: "PlovDrop" },
  ],
  Community: [
    { href: "https://t.me/plovcoin", label: "Telegram", external: true },
    { href: "https://x.com/PlovCoin", label: "X / Twitter", external: true },
    { href: "https://instagram.com/plovcoin", label: "Instagram", external: true },
    { href: "https://tiktok.com/@plovcoin", label: "TikTok", external: true },
  ],
  Contact: [
    { href: "mailto:hello@plovcoin.com", label: "hello@plovcoin.com" },
    { href: "mailto:security@plovcoin.com", label: "security@plovcoin.com" },
    { href: "mailto:listing@plovcoin.com", label: "listing@plovcoin.com" },
  ],
};

export function Footer() {
  return (
    <footer className="relative mt-32 border-t border-fire/10 bg-bg-soft/40">
      <div className="container-narrow py-16">
        {/* Anti-phishing banner */}
        <div className="mb-12 rounded-xl border border-fire/30 bg-fire/5 px-5 py-4 font-mono text-xs text-rice-soft">
          <span className="font-bold text-fire">⚠ ANTI-PHISHING:</span>{" "}
          Official URLs only — <span className="text-rice">plovcoin.com</span> and{" "}
          <span className="text-rice">claim.plovcoin.com</span>. Never enter your seed phrase. We will never DM you first.
        </div>

        {/* Brand + Links */}
        <div className="grid gap-12 lg:grid-cols-[1.5fr_3fr]">
          <div>
            <div className="font-display text-3xl text-fire-gradient glow-text">$PLOV</div>
            <p className="mt-3 font-serif text-lg italic text-rice-soft">
              The universal recipe, on-chain.
            </p>
            <p className="mt-6 max-w-sm text-sm text-rice-dim">
              Fair launch memecoin on Solana. 45% to community. Mint=OFF. No presale, no VC.
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
          <span className="font-bold text-rice-soft">RISK DISCLAIMER:</span>{" "}
          $PLOV is a memecoin with no inherent utility or expectation of profit. Cryptocurrency
          investments are highly volatile and may result in total loss of capital. Nothing on this site
          constitutes financial, legal, or investment advice. Not available in restricted jurisdictions.
          Do your own research. Past performance does not indicate future results. Compliance with local
          laws is the sole responsibility of the participant.
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 text-xs text-rice-dim sm:flex-row">
          <div>© 2026 PlovCoin. All rights reserved.</div>
          <div className="font-mono">
            Built on <span className="text-fire">Solana</span> · Audited progress on{" "}
            <Link href="/proof" className="text-fire hover:underline">
              /proof
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

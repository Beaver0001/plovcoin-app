export const metadata = { alternates: { canonical: "https://plovcoin.com/terms", languages: { en: "https://plovcoin.com/terms", ru: "https://plovcoin.com/ru/terms", "x-default": "https://plovcoin.com/terms" } }, title: "Terms of Use — PlovCoin" };
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-rice-soft">
      <p className="mb-6 text-xs"><a href="/" className="underline hover:text-rice">&larr; PlovCoin</a></p>
      <h1 className="mb-3 text-3xl font-bold text-rice">Terms of Use</h1>
      <p className="mb-8 text-xs opacity-70">Last updated: September 3, 2026</p>
      <div className="space-y-5 text-sm leading-relaxed">
        <p>PlovCoin ($PLOV) is a cultural memecoin on Solana created for community and entertainment purposes. The token is not intended or positioned as an investment product, security, or financial instrument; it confers no rights to profit, governance of any legal entity, or claims against any party.</p>
        <p>Nothing on this website constitutes financial, legal, or tax advice. Digital assets are highly volatile; you may lose the entire amount you spend. Participate only with funds you can afford to lose and only where lawful in your jurisdiction. You are solely responsible for compliance with your local laws.</p>
        <p>By using this site you confirm that you are at least 18 years old or have reached the age of majority in your jurisdiction. The token and airdrops are not offered to sanctioned individuals or entities, or to residents of jurisdictions where acquiring or receiving such assets is prohibited.</p>
        <p>Airdrop participation is subject to the official Wave Policy published for each wave, including eligibility, anti-Sybil rules, and regional restrictions. We may amend program rules before a wave opens; changes are announced through official channels listed on this site.</p>
        <p>The website is provided "as is" without warranties of any kind. To the maximum extent permitted by law, the PlovCoin team is not liable for any losses arising from use of this site, the token, or third-party services (wallets, exchanges, RPC providers).</p>
        <p>Official channels and contract addresses are listed on the <a href="/proof" className="underline hover:text-rice">Proof-hub</a> page. Anything else claiming to be PlovCoin is not us. We never DM first and never ask for seed phrases.</p>
        <p>We may update these Terms. The current version is always published on this page; the date of the last update is shown above.</p>
      </div>
      <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 text-xs opacity-80"><a href="/" className="underline hover:text-rice">Home</a><a href="/proof" className="underline hover:text-rice">Proof-hub</a><a href="/whitepaper" className="underline hover:text-rice">Whitepaper</a><a href="/faq" className="underline hover:text-rice">FAQ</a><a href="/terms" className="underline hover:text-rice">Terms</a><a href="/privacy" className="underline hover:text-rice">Privacy</a><a href="/terms?setLocale=ru" className="underline hover:text-rice">Русский</a></nav>
    </main>
  );
}

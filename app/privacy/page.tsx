export const metadata = { alternates: { canonical: "https://plovcoin.com/privacy", languages: { en: "https://plovcoin.com/privacy", ru: "https://plovcoin.com/ru/privacy", "x-default": "https://plovcoin.com/privacy" } }, title: "Privacy Policy — PlovCoin" };
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-rice-soft">
      <p className="mb-6 text-xs"><a href="/" className="underline hover:text-rice">&larr; PlovCoin</a></p>
      <h1 className="mb-3 text-3xl font-bold text-rice">Privacy Policy</h1>
      <p className="mb-8 text-xs opacity-70">Last updated: September 3, 2026</p>
      <div className="space-y-5 text-sm leading-relaxed">
        <p>This website does not require accounts and does not collect personal data beyond standard technical logs of our hosting provider (IP address, user agent) used for security and operation.</p>
        <p>We do not use advertising trackers. The site sets a single functional cookie, plov_locale, which remembers your language choice for one year and is not used for tracking. Page views are counted in aggregate with Vercel Web Analytics, which uses no cookies and does not identify individual visitors.</p>
        <p>If you email us (e.g. security@plovcoin.com), we process your message and address solely to respond and handle the report. Correspondence is retained no longer than needed to handle the report; you may request deletion of your data by writing to the same address. We do not sell or share personal data with third parties except where required by law.</p>
        <p>Third-party services you use to interact with PlovCoin (wallets, Telegram, X, exchanges) have their own privacy policies; we are not responsible for their processing.</p>
        <p>We may update this Policy; the current version is published on this page.</p>
        <p>Questions: security@plovcoin.com.</p>
      </div>
      <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 text-xs opacity-80"><a href="/" className="underline hover:text-rice">Home</a><a href="/proof" className="underline hover:text-rice">Proof-hub</a><a href="/whitepaper" className="underline hover:text-rice">Whitepaper</a><a href="/faq" className="underline hover:text-rice">FAQ</a><a href="/terms" className="underline hover:text-rice">Terms</a><a href="/privacy" className="underline hover:text-rice">Privacy</a><a href="/privacy?setLocale=ru" className="underline hover:text-rice">Русский</a></nav>
    </main>
  );
}

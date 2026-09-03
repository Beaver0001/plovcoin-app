import { I18nProvider } from "@/components/I18nProvider";
import { getDictionary } from "@/lib/i18n";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const dict = getDictionary("en");

export const metadata = { alternates: { canonical: "https://plovcoin.com/privacy", languages: { en: "https://plovcoin.com/privacy", ru: "https://plovcoin.com/ru/privacy", "x-default": "https://plovcoin.com/privacy" } }, title: "Privacy Policy — PlovCoin" };
export default function Page() {
  return (
    <I18nProvider locale="en" dict={dict}>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-8 pt-32 text-rice-soft">
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
      </main>
      <Footer />
    </I18nProvider>
  );
}

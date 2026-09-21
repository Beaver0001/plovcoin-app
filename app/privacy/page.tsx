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
      <p className="mb-8 text-xs opacity-70">Last updated: September 21, 2026</p>
      <div className="space-y-5 text-sm leading-relaxed">
        <p>This website does not require accounts and does not collect personal data beyond standard technical logs of our hosting provider (IP address, user agent) used for security and operation.</p>
        <p>We do not use advertising trackers. The site sets a single functional cookie, plov_locale, which remembers your language choice for one year and is not used for tracking. Page views are counted in aggregate with Vercel Web Analytics, which uses no cookies and does not identify individual visitors.</p>
        <p>If you email us (e.g. security@plovcoin.com), we process your message and address solely to respond and handle the report. Correspondence is retained no longer than needed to handle the report; you may request deletion of your data by writing to the same address. We do not sell personal data. Service providers supporting our hosting and email may process data to provide those services; we may also disclose data where required by law.</p>
        <p>Third-party services you use to interact with PlovCoin (wallets, Telegram, X, exchanges) have their own privacy policies; we are not responsible for their processing.</p>
        <section id="instagram" aria-labelledby="instagram-heading" className="space-y-5">
          <h2 id="instagram-heading" className="text-xl font-bold text-rice">Instagram integration — PlovCoin Community</h2>
          <p>This section covers the PlovCoin Community application and its integration with the Instagram accounts <a className="underline" href="https://www.instagram.com/plovcoinofficial/" target="_blank" rel="noopener noreferrer">@plovcoinofficial</a> and <a className="underline" href="https://www.instagram.com/plovcoin_ru/" target="_blank" rel="noopener noreferrer">@plovcoin_ru</a>. The website-only statements above do not describe the data received through this integration.</p>
          <p>When you interact with these accounts, our application may receive Instagram identifiers, message and comment content, timestamps, and related event information made available by Meta through the permissions granted to our application. We process this information to manage community interactions, handle enquiries, moderate comments, and operate and troubleshoot the integration.</p>
          <p>Received webhook events are stored on our server. Access is restricted to authorised personnel and services. Our hosting provider operates the infrastructure used to store and process this information. Meta processes information under its own privacy policies. We do not sell Instagram data.</p>
          <p>The integration is being tested. Stored events currently have no automatic expiry; they remain stored until manually deleted. You can request deletion using the instructions below.</p>
          <h3 id="instagram-data-deletion" className="scroll-mt-28 text-lg font-semibold text-rice">Requesting deletion of Instagram data</h3>
          <p>Email <a className="underline" href="mailto:security@plovcoin.com?subject=Instagram%20data%20deletion">security@plovcoin.com</a> with the subject “Instagram data deletion”. Include your Instagram username and identify the PlovCoin account you contacted. Do not send passwords, access tokens, or wallet recovery phrases.</p>
          <p>We may ask you to confirm control of the relevant Instagram account before processing your request. We will respond with the outcome or explain any further information needed. Deletion from our application does not delete messages or other records held independently by Instagram or other participants.</p>
        </section>
        <p>We may update this Policy; the current version is published on this page.</p>
        <p>Questions: security@plovcoin.com.</p>
      </div>
      </main>
      <Footer />
    </I18nProvider>
  );
}

import type { Metadata } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { getDictionary } from "@/lib/i18n";
import { FaqView } from "@/components/views/FaqView";

const dict = getDictionary("en");

export const metadata: Metadata = {
  title: dict.meta.faqTitle,
  description: dict.meta.faqDesc,
  alternates: {
    canonical: "https://plovcoin.com/faq",
    languages: {
      en: "https://plovcoin.com/faq",
      ru: "https://plovcoin.com/ru/faq",
    },
  },
};

export default function Page() {
  return (
    <I18nProvider locale="en" dict={dict}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\": \"https://schema.org\", \"@type\": \"FAQPage\", \"mainEntity\": [{\"@type\": \"Question\", \"name\": \"What is PlovCoin?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"PlovCoin ($PLOV) is a cultural memecoin on Solana with fixed supply and transparent launch structure. It's built around plov \u2014 a universal symbol of hospitality and the shared table.\"}}, {\"@type\": \"Question\", \"name\": \"What is the official token address?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"B4LhtMwbKh8D1nfj7dE6FefKpg7U2qkbYC371DBcJq9x. Always verify before any interaction. Any other address claiming to be $PLOV is a scam.\"}}, {\"@type\": \"Question\", \"name\": \"Where can I buy $PLOV?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Live trading is not open during the pre-TGE stage. At public activation, the primary PLOV/SOL market is planned on Meteora DAMM v2, with Jupiter routing after activation. No fixed Raydium or Orca launch schedule is announced.\"}}, {\"@type\": \"Question\", \"name\": \"Can I buy $PLOV before TGE?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"No. There is no presale, private sale, or early allocation. Anyone offering $PLOV before TGE is a scammer. Wait for the official launch \u2014 we'll announce it 2 weeks in advance.\"}}, {\"@type\": \"Question\", \"name\": \"How do I verify this isn't a scam?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Cross-check three things: the URL is plovcoin.com (or ru.plovcoin.com), the token mint matches the address on our site and Solscan, and any claim link starts with claim.plovcoin.com. We never DM claim links. We never ask for seed phrases.\"}}, {\"@type\": \"Question\", \"name\": \"Where do I claim airdrops?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Only on claim.plovcoin.com. We will never DM you a claim link \u2014 anyone who does is a scammer.\"}}, {\"@type\": \"Question\", \"name\": \"Will team tokens unlock at launch?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"No. Team tokens (8% of supply) are locked for a 12-month cliff, then released through 12 months of linear vesting. Nothing unlocks at launch.\"}}]}" }} />
      <FaqView />
    </I18nProvider>
  );
}

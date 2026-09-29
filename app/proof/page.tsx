import type { Metadata } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { getDictionary } from "@/lib/i18n";
import { ProofHubView } from "@/components/views/ProofHubView";

const dict = getDictionary("en");

export const metadata: Metadata = {
  title: dict.meta.proofTitle,
  description: dict.meta.proofDesc,
  openGraph: {
    type: "website",
    siteName: "PlovCoin",
    title: dict.meta.proofTitle,
    description: dict.meta.proofDesc,
    url: "https://plovcoin.com/proof",
    locale: "en_US",
    alternateLocale: "ru_RU",
    images: [{ url: "/og-proof-en.png", width: 1200, height: 630, alt: "PlovCoin Proof-hub — dated facts and evidence" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@PlovTeam",
    title: dict.meta.proofTitle,
    description: dict.meta.proofDesc,
    images: ["/og-proof-en.png"],
  },
  alternates: {
    canonical: "https://plovcoin.com/proof",
    languages: {
      en: "https://plovcoin.com/proof",
      ru: "https://plovcoin.com/ru/proof",
    },
  },
};

export default function Page() {
  return (
    <I18nProvider locale="en" dict={dict}>
      <ProofHubView locale="en" />
    </I18nProvider>
  );
}

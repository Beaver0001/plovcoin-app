import type { Metadata } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { getDictionary } from "@/lib/i18n";
import { ProofHubView } from "@/components/views/ProofHubView";

const dict = getDictionary("ru");

export const metadata: Metadata = {
  title: dict.meta.proofTitle,
  description: dict.meta.proofDesc,
  openGraph: {
    type: "website",
    siteName: "PlovCoin",
    title: dict.meta.proofTitle,
    description: dict.meta.proofDesc,
    url: "https://plovcoin.com/ru/proof",
    locale: "ru_RU",
    alternateLocale: "en_US",
    images: [{ url: "/og-proof-ru.png", width: 1200, height: 630, alt: "PlovCoin Proof-hub — датированные факты и доказательства" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@PlovTeam",
    title: dict.meta.proofTitle,
    description: dict.meta.proofDesc,
    images: ["/og-proof-ru.png"],
  },
  alternates: {
    canonical: "https://plovcoin.com/ru/proof",
    languages: {
      en: "https://plovcoin.com/proof",
      ru: "https://plovcoin.com/ru/proof",
    },
  },
};

export default function Page() {
  return (
    <I18nProvider locale="ru" dict={dict}>
      <ProofHubView locale="ru" />
    </I18nProvider>
  );
}

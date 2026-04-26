import type { Metadata } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { getDictionary } from "@/lib/i18n";
import { HomeView } from "@/components/views/HomeView";

const dict = getDictionary("en");

export const metadata: Metadata = {
  metadataBase: new URL("https://plovcoin.com"),
  title: dict.meta.homeTitle,
  description: dict.meta.homeDesc,
  keywords: [
    "PlovCoin",
    "PLOV",
    "Solana memecoin",
    "fair launch",
    "cultural memecoin",
    "airdrop",
    "Solana",
    "crypto",
  ],
  authors: [{ name: "PlovCoin Team" }],
  creator: "PlovCoin",
  publisher: "PlovCoin",
  alternates: {
    canonical: "https://plovcoin.com/",
    languages: {
      en: "https://plovcoin.com/",
      ru: "https://plovcoin.com/ru",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://plovcoin.com/",
    siteName: "PlovCoin",
    title: dict.meta.homeTitle,
    description: dict.meta.homeDesc,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PlovCoin — The Universal Recipe On-Chain",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: dict.meta.homeTitle,
    description: dict.meta.homeDesc,
    images: ["/og-image.png"],
    creator: "@PlovCoinOfficial",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function Page() {
  return (
    <I18nProvider locale="en" dict={dict}>
      <HomeView />
    </I18nProvider>
  );
}

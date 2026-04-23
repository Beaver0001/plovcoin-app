import type { Metadata } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { getDictionary } from "@/lib/i18n";
import { HomeView } from "@/components/views/HomeView";

const dict = getDictionary("ru");

export const metadata: Metadata = {
  metadataBase: new URL("https://plovcoin.com"),
  title: dict.meta.homeTitle,
  description: dict.meta.homeDesc,
  alternates: {
    canonical: "https://plovcoin.com/ru",
    languages: {
      en: "https://plovcoin.com/",
      ru: "https://plovcoin.com/ru",
    },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://plovcoin.com/ru",
    siteName: "PlovCoin",
    title: dict.meta.homeTitle,
    description: dict.meta.homeDesc,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PlovCoin — Универсальный рецепт в блокчейне",
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
};

export default function Page() {
  return (
    <I18nProvider locale="ru" dict={dict}>
      <HomeView />
    </I18nProvider>
  );
}

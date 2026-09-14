import type { Metadata } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { getDictionary } from "@/lib/i18n";
import { WhitepaperView } from "@/components/views/WhitepaperView";
import { websiteEditionLabel } from "@/lib/website-edition";

const dict = getDictionary("ru");

export const metadata: Metadata = {
  title: dict.meta.whitepaperTitle,
  description: `${dict.meta.whitepaperDesc} ${websiteEditionLabel("ru")}.`,
  alternates: {
    canonical: "https://plovcoin.com/ru/whitepaper",
    languages: {
      en: "https://plovcoin.com/whitepaper",
      ru: "https://plovcoin.com/ru/whitepaper",
    },
  },
};

export default function Page() {
  return (
    <I18nProvider locale="ru" dict={dict}>
      <WhitepaperView />
    </I18nProvider>
  );
}

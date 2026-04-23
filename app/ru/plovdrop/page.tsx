import type { Metadata } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { getDictionary } from "@/lib/i18n";
import { PlovDropView } from "@/components/views/PlovDropView";

const dict = getDictionary("ru");

export const metadata: Metadata = {
  title: dict.meta.plovdropTitle,
  description: dict.meta.plovdropDesc,
  alternates: {
    canonical: "https://plovcoin.com/ru/plovdrop",
    languages: {
      en: "https://plovcoin.com/plovdrop",
      ru: "https://plovcoin.com/ru/plovdrop",
    },
  },
};

export default function Page() {
  return (
    <I18nProvider locale="ru" dict={dict}>
      <PlovDropView />
    </I18nProvider>
  );
}

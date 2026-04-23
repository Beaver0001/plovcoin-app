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
      <FaqView />
    </I18nProvider>
  );
}

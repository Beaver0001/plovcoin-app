import type { Metadata } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { getDictionary } from "@/lib/i18n";
import { ProofHubView } from "@/components/views/ProofHubView";

const dict = getDictionary("ru");

export const metadata: Metadata = {
  title: dict.meta.proofTitle,
  description: dict.meta.proofDesc,
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

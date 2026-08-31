import { SetLangRu } from "@/components/SetLangRu";
import type { Metadata } from "next";

export const metadata: Metadata = {
  other: {
    "content-language": "ru",
  },
};

export default function RuLayout({ children }: { children: React.ReactNode }) {
  return <div lang="ru"><SetLangRu />{children}</div>;
}

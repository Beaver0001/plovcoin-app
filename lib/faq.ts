import content from "./faq-content.json";
import { official } from "./official-config.mjs";
import type { Locale } from "./i18n";

export const faqQuestions = content.questions;
export const faqCategories = content.categories;
export const faqQuickSets = content.quickSets;
export const whitepaperAnswerIds = content.whitepaperAnswerIds;
export type FaqQuestion = (typeof faqQuestions)[number];
export type FaqSelection = "first-time" | "crypto" | "all";

export function getFaqQuestion(id: string): FaqQuestion {
  const question = faqQuestions.find(item => item.id === id);
  if (!question) throw new Error(`Unknown FAQ answer: ${id}`);
  return question;
}

export function normalizeFaqSearch(value: string) {
  return value.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const synonyms = [
  ["газ", "gas", "комиссия", "комиссии", "комиссий", "fee", "fees"],
  ["пресейл", "presale", "alpha"],
  ["не успел", "дедлайн", "deadline", "missed"],
  ["заморозка", "заморозить", "freeze", "frozen"],
  ["скам", "подлинность", "scam", "authenticity"],
];

export function searchFaq(query: string) {
  const normalized = normalizeFaqSearch(query);
  if (!normalized) return faqQuestions.map(question => ({ question, detailsMatch: false }));
  const phrase = synonyms.find(group => group.includes(normalized));
  const groups = phrase ? [phrase] : normalized.split(/\s+/).map(word =>
    synonyms.find(group => group.includes(word)) ?? [word]);
  return faqQuestions.flatMap(question => {
    // Both languages remain searchable when the reader switches EN/RU.
    const summary = normalizeFaqSearch([question.ru.question, question.ru.short, question.en.question, question.en.short].join(" "));
    const details = normalizeFaqSearch(`${question.ru.details} ${question.en.details}`);
    const matches = groups.every(group => group.some(term => `${summary} ${details}`.includes(term)));
    return matches ? [{ question, detailsMatch: groups.some(group => group.some(term => details.includes(term) && !summary.includes(term))) }] : [];
  });
}

export function selectedFaq(selection: FaqSelection) {
  return selection === "all" ? faqQuestions : faqQuickSets[selection].map(getFaqQuestion);
}

export function faqEvidence(ref: string, locale: Locale): { label: string; href: string | null } {
  const prefix = locale === "ru" ? "/ru" : "";
  const proof = (anchor = "") => `${prefix}/proof${anchor ? `#${anchor}` : ""}`;
  const labels: Record<string, [string, string]> = {
    proof: ["Proof-hub", "Proof-hub"], whitepaper: ["Whitepaper", "Whitepaper"],
    mint: ["Official mint · Solscan", "Официальный mint · Solscan"],
    claim: ["Official claim portal", "Официальный портал клейма"],
    channels: ["Official channels and chat", "Официальные каналы и группа"],
    "launch-announcement": ["Official announcements", "Официальные анонсы"],
    "security-contact": [official.securityEmail, official.securityEmail],
    "liquidity-proof": ["Liquidity evidence", "Подтверждения ликвидности"],
    "burn-proof": ["Burn log", "Журнал сжиганий"],
    "security-proof": ["Reviews and scope", "Проверки и их охват"],
    "treasury-proof": ["Treasury and control addresses", "Казна и управляющие адреса"],
    "vesting-proof": ["Vesting evidence", "Подтверждения вестинга"],
    "advertising-proof": ["Ad Registry", "Реестр рекламы"],
    monitoring: ["Monitoring reports", "Отчёты мониторинга"],
    alpha: ["Alpha · terms not published yet", "Alpha · условия ещё не опубликованы"],
    "wave-policy": ["Wave Policy · not published yet", "Правила волны ещё не опубликованы"],
    "loyalty-policy": ["Loyalty Policy · not published yet", "Условия лояльности ещё не опубликованы"],
  };
  const urls: Record<string, string | null> = {
    proof: proof(), whitepaper: `${prefix}/whitepaper`, mint: `https://solscan.io/token/${official.mint}`,
    claim: official.claim, channels: official.channels.find(c => c.id === "telegram_folder")!.href,
    "launch-announcement": official.channels.find(c => c.id === `announcements_${locale}`)!.href,
    "security-contact": `mailto:${official.securityEmail}`,
    "liquidity-proof": proof("liquidity"), "burn-proof": proof("burn-log"),
    "security-proof": proof("security"), "treasury-proof": proof("addresses"),
    "vesting-proof": proof("vesting"), "advertising-proof": proof("advertising"), monitoring: proof("transparency"),
    alpha: null, "wave-policy": null, "loyalty-policy": null,
  };
  if (!(ref in urls)) throw new Error(`Unknown FAQ evidence: ${ref}`);
  return { label: labels[ref][locale === "ru" ? 1 : 0], href: urls[ref] };
}

export function faqStructuredData(locale: Locale) {
  const page = `${official.website}${locale === "ru" ? "/ru" : ""}/faq`;
  return {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqQuestions.map(question => ({
      "@type": "Question", "@id": `${page}#${question.id}`, name: question[locale].question,
      acceptedAnswer: { "@type": "Answer", text: [question[locale].short, question[locale].details].filter(Boolean).join("\n\n") },
    })),
  };
}

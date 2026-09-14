// Fresh status observations belong here, with their actual source and timestamp.
// Null is deliberately not replaced by the build date or website review date.
export type FaqStatus = { id: string; en: string; ru: string; evidenceRef: string; checkedAt: string | null; sourceUrl: string | null; confirmedText: { en: string; ru: string } | null };
export const faqStatuses: FaqStatus[] = [
  { id: "trading", en: "Trading", ru: "Торговля", evidenceRef: "launch-announcement", checkedAt: null, sourceUrl: null, confirmedText: null },
  { id: "alpha", en: "Alpha", ru: "Alpha", evidenceRef: "alpha", checkedAt: null, sourceUrl: null, confirmedText: null },
  { id: "claim", en: "PlovDrop", ru: "PlovDrop", evidenceRef: "claim", checkedAt: null, sourceUrl: null, confirmedText: null },
];

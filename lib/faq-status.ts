// Fresh status observations belong here, with their actual source and timestamp.
// Null is deliberately not replaced by the build date or website review date.
// The project owner confirmed these three closed states on 2026-09-15.
// This dated team statement is separate from a public-source or on-chain check.
export type FaqStatus = { id: string; en: string; ru: string; evidenceRef: string; checkedAt: string | null; sourceUrl: string | null; teamConfirmedOn?: string; confirmedText: { en: string; ru: string } | null };
export const faqStatuses: FaqStatus[] = [
  { id: "trading", en: "Trading", ru: "Торговля", evidenceRef: "launch-announcement", checkedAt: null, sourceUrl: null, teamConfirmedOn: "2026-09-15", confirmedText: { en: "Trading is not open", ru: "Торговля не открыта" } },
  { id: "alpha", en: "Alpha", ru: "Alpha", evidenceRef: "alpha", checkedAt: null, sourceUrl: null, teamConfirmedOn: "2026-09-15", confirmedText: { en: "Deposits are not open", ru: "Приём депозитов не открыт" } },
  { id: "claim", en: "PlovDrop", ru: "PlovDrop", evidenceRef: "claim", checkedAt: null, sourceUrl: null, teamConfirmedOn: "2026-09-15", confirmedText: { en: "Claim is not open", ru: "Клейм не открыт" } },
];

import evidence from "./proof-evidence.json";
import register from "./proof-register.json";
import type { Locale } from "./i18n";

export { evidence as proofEvidence, register as proofRegister };
export const proofGroups = ["token", "addresses", "liquidity", "airdrop", "security", "transparency"] as const;
export const legacyProofAnchors = ["addresses", "liquidity", "airdrop", "burn-log", "vesting", "advertising", "security", "incidents", "transparency"] as const;

export function solscan(type: "token" | "account" | "tx", value: string) {
  return `https://solscan.io/${type}/${value}`;
}

export function formatProofTokens(raw: string, locale: Locale) {
  const value = BigInt(raw);
  const scale = 10n ** BigInt(evidence.decimals);
  const formatter = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US");
  const fraction = (value % scale).toString().padStart(evidence.decimals, "0").replace(/0+$/, "");
  const separator = formatter.formatToParts(1.1).find(part => part.type === "decimal")?.value ?? ".";
  return `${formatter.format(value / scale)}${fraction ? separator + fraction : ""} PLOV`;
}

export function custodyObservation(multisig: string) {
  const observation = evidence.multisigs.find(item => item.address === multisig);
  if (!observation) throw new Error(`Missing dated custody observation for ${multisig}`);
  return observation;
}

export const proofObservedAt = `${evidence.observedAt.slice(0, 19).replace("T", " ")} UTC`;

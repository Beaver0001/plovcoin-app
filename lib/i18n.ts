import en from "./dictionaries/en.json";
import ru from "./dictionaries/ru.json";

export const locales = ["en", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "EN",
  ru: "RU",
};

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
  en: en as Dictionary,
  ru: ru as Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

/**
 * Build a path for the current locale.
 * EN is the default — no prefix.
 * RU uses /ru prefix.
 *
 * localePath("en", "/proof") -> "/proof"
 * localePath("ru", "/proof") -> "/ru/proof"
 * localePath("ru", "/")      -> "/ru"
 */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  if (clean === "/") return `/${locale}`;
  return `/${locale}${clean}`;
}

/**
 * Strip locale prefix from a pathname.
 * "/ru/proof" -> "/proof"
 * "/ru"       -> "/"
 * "/proof"    -> "/proof"
 */
export function stripLocale(pathname: string): string {
  for (const loc of locales) {
    if (loc === defaultLocale) continue;
    if (pathname === `/${loc}`) return "/";
    if (pathname.startsWith(`/${loc}/`)) return pathname.slice(`/${loc}`.length);
  }
  return pathname;
}

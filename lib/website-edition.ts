import config from "./website-edition.json";

// Set once for the actual publication of this whitepaper revision.
// Do not use the review date or the date of an unrelated deployment.
const edition: { publishedOn: string | null } = config;
if (edition.publishedOn && (!/^\d{4}-\d{2}-\d{2}$/.test(edition.publishedOn) ||
    new Date(`${edition.publishedOn}T00:00:00Z`).toISOString().slice(0, 10) !== edition.publishedOn)) {
  throw new Error("Whitepaper publishedOn must be a real UTC date in YYYY-MM-DD format");
}

export function websiteEditionLabel(locale: string) {
  if (!edition.publishedOn) {
    return locale === "ru" ? "Версия для сайта · Предпросмотр" : "Website edition · Preview";
  }
  return locale === "ru"
    ? `Версия для сайта · обновлено ${edition.publishedOn}`
    : `Website edition · updated ${edition.publishedOn}`;
}

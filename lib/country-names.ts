/** ISO 3166-1 alpha-2 → display name (leaderboard & profile). */
const COUNTRY_NAMES: Record<string, string> = {
  tr: "Türkiye",
  us: "United States",
  gb: "United Kingdom",
  de: "Germany",
  fr: "France",
  es: "Spain",
  it: "Italy",
  br: "Brazil",
  jp: "Japan",
  kr: "South Korea",
  in: "India",
  ae: "UAE",
  nl: "Netherlands",
  ca: "Canada",
  au: "Australia",
  ru: "Russia",
  cn: "China",
  mx: "Mexico",
  ar: "Argentina",
  pt: "Portugal",
  pl: "Poland",
  se: "Sweden",
  no: "Norway",
  ch: "Switzerland",
  ct: "Northern Cyprus",
};

export function getCountryName(code: string): string {
  const key = code.trim().toLowerCase();
  return COUNTRY_NAMES[key] ?? key.toUpperCase();
}

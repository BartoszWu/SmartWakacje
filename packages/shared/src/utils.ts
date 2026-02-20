export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

export function normalizeName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*/g, " ").trim();
}

export function abbreviateCount(n: number | null | undefined): string {
  if (!n && n !== 0) return "–";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getRatingClass(rating: number): "high" | "mid" | "low" {
  if (rating >= 8) return "high";
  if (rating >= 6) return "mid";
  return "low";
}

export function getRatingColor(rating: number): string {
  const cls = getRatingClass(rating);
  return cls === "high" ? "#4caf6a" : cls === "mid" ? "#d4a843" : "#cf4444";
}

export const COUNTRY_EN: Record<string, string> = {
  Tunezja: "Tunisia",
  Turcja: "Turkey",
  Egipt: "Egypt",
  Grecja: "Greece",
  Hiszpania: "Spain",
  Chorwacja: "Croatia",
  "Bułgaria": "Bulgaria",
  Cypr: "Cyprus",
  Maroko: "Morocco",
  Portugalia: "Portugal",
  "Włochy": "Italy",
  "Czarnogóra": "Montenegro",
  Albania: "Albania",
  Malta: "Malta",
};

export function countryToEn(plName: string): string {
  return COUNTRY_EN[plName] || plName;
}

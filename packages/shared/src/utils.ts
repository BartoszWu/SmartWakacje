import type { Offer } from "./types";

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

const QUALITY_WEIGHTS = {
  google: 0.45,
  trivago: 0.35,
  tripAdvisor: 0.15,
  wakacje: 0.05,
} as const;

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function confidenceFromCount(count: number | undefined | null): number {
  if (count == null || count <= 0) return 0;
  return clamp01(Math.log10(count + 1) / 3);
}

function withConfidence(score0to10: number, confidence: number): number {
  const confidenceBoost = 0.35 + 0.65 * confidence;
  return score0to10 * confidenceBoost;
}

function validScore(value: number | undefined | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function computeQualityScore(offer: Offer): number | undefined {
  const candidates: { weighted: number; weight: number }[] = [];

  if (validScore(offer.googleRating)) {
    const normalized = offer.googleRating * 2;
    const confidence = confidenceFromCount(offer.googleRatingsTotal);
    candidates.push({
      weighted: withConfidence(normalized, confidence) * QUALITY_WEIGHTS.google,
      weight: QUALITY_WEIGHTS.google,
    });
  }

  if (validScore(offer.trivagoRating)) {
    const confidence = confidenceFromCount(offer.trivagoReviewsCount);
    candidates.push({
      weighted: withConfidence(offer.trivagoRating, confidence) * QUALITY_WEIGHTS.trivago,
      weight: QUALITY_WEIGHTS.trivago,
    });
  }

  if (validScore(offer.taRating)) {
    const normalized = offer.taRating * 2;
    const confidence = confidenceFromCount(offer.taReviewCount);
    candidates.push({
      weighted: withConfidence(normalized, confidence) * QUALITY_WEIGHTS.tripAdvisor,
      weight: QUALITY_WEIGHTS.tripAdvisor,
    });
  }

  if (validScore(offer.ratingValue)) {
    const confidence = confidenceFromCount(offer.ratingReservationCount);
    candidates.push({
      weighted: withConfidence(offer.ratingValue, confidence) * QUALITY_WEIGHTS.wakacje,
      weight: QUALITY_WEIGHTS.wakacje,
    });
  }

  if (candidates.length === 0) return undefined;

  const weightedSum = candidates.reduce((acc, c) => acc + c.weighted, 0);
  const weightSum = candidates.reduce((acc, c) => acc + c.weight, 0);
  return weightSum > 0 ? weightedSum / weightSum : undefined;
}

export function computeValueScore(
  offer: Offer,
  qualityScore = computeQualityScore(offer)
): number | undefined {
  const quality = qualityScore;
  if (quality == null || !offer.price || offer.price <= 0) return undefined;
  return (quality / offer.price) * 1000;
}

export function withComputedScores(offer: Offer): Offer {
  const qualityScore = computeQualityScore(offer);
  const valueScore = computeValueScore(offer, qualityScore);
  return {
    ...offer,
    qualityScore,
    valueScore,
  };
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

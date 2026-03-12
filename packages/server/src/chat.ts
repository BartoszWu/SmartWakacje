import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { loadOffers, loadDescriptionCache } from "./services/cache";
import type { DescriptionCacheEntry } from "@smartwakacje/shared";
import {
  computeQualityScore,
  computeValueScore,
  type Offer,
  type QualityMode,
  type RatingSource,
} from "@smartwakacje/shared";

export const LLM_KEY_MISSING_CODE = "LLM_KEY_MISSING";
export const NO_OFFERS_CODE = "NO_OFFERS";

function fmt(n: number | undefined | null): string {
  if (n == null) return "-";
  return String(n);
}

function compressOffers(
  offers: Offer[],
  options: { includeComputed: boolean; disabledSources?: RatingSource[] }
): string {
  const disabled = options.disabledSources ?? [];
  const countries = [...new Set(offers.map((o) => o.country))];
  const prices = offers.map((o) => o.price).filter(Boolean);
  const dates = offers.map((o) => o.departureDate).filter(Boolean).sort();

  const header = [
    `${offers.length} ofert`,
    countries.join(", "),
    prices.length ? `${Math.min(...prices)}-${Math.max(...prices)} zł` : "",
    dates.length ? `${dates[0]} – ${dates[dates.length - 1]}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const legendParts = ["Nazwa", "Kraj", "Cena"];
  if (!disabled.includes("wakacje")) legendParts.push("W(wakacje.pl)");
  if (!disabled.includes("google")) legendParts.push("G(google,ile)");
  if (!disabled.includes("tripAdvisor")) legendParts.push("TA(tripadvisor,ile)");
  if (!disabled.includes("trivago")) legendParts.push("Tv(trivago,ile)");
  if (options.includeComputed) legendParts.push("Q(quality)", "V(value)");
  legendParts.push("Dni", "Gwiazdki");
  const legend = `Format: ${legendParts.join("|")}`;

  const rows = offers.map((o) => {
    const row: (string | number)[] = [o.name, o.country, o.price];

    if (!disabled.includes("wakacje")) row.push(`W:${o.ratingValue}`);

    if (!disabled.includes("google")) {
      const g =
        o.googleRating != null
          ? `${o.googleRating}(${fmt(o.googleRatingsTotal)})`
          : "-";
      row.push(`G:${g}`);
    }

    if (!disabled.includes("tripAdvisor")) {
      const ta =
        o.taRating != null ? `${o.taRating}(${fmt(o.taReviewCount)})` : "-";
      row.push(`TA:${ta}`);
    }

    if (!disabled.includes("trivago")) {
      const tv =
        o.trivagoRating != null
          ? `${o.trivagoRating}(${fmt(o.trivagoReviewsCount)})`
          : "-";
      row.push(`Tv:${tv}`);
    }

    if (options.includeComputed) {
      const q = computeQualityScore(o, disabled);
      const v = computeValueScore(o, q);
      row.push(
        `Q:${q != null ? q.toFixed(2) : "-"}`,
        `V:${v != null ? v.toFixed(3) : "-"}`
      );
    }

    row.push(`${o.duration}d`, `${o.category}★`);
    return row.join("|");
  });

  return `=== ${header} ===\n${legend}\n${rows.join("\n")}`;
}

const RATING_DESCRIPTIONS: Record<RatingSource, string> = {
  wakacje: "W = wakacje.pl (1-10)",
  google: "G = Google Maps (1-5)",
  tripAdvisor: "TA = TripAdvisor (1-5)",
  trivago: "Tv = Trivago (1-10)",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const DESCRIPTION_LABELS_FOR_CHAT = new Set([
  "Położenie", "Polozenie",
  "Plaża", "Plaza",
  "Wyżywienie", "Wyzywienie",
  "Dzieci",
  "Mocne strony",
]);

function compressDescriptions(
  offers: Offer[],
  descCache: Record<string, DescriptionCacheEntry>
): string {
  const lines: string[] = [];
  for (const o of offers) {
    const entry = descCache[o.name];
    if (!entry?.descriptions?.length) continue;

    const relevant = entry.descriptions.filter((d) =>
      DESCRIPTION_LABELS_FOR_CHAT.has(d.label)
    );
    if (relevant.length === 0) continue;

    const parts = relevant.map((d) => {
      const text = stripHtml(d.value).slice(0, 200);
      return `${d.label}: ${text}`;
    });
    lines.push(`[${o.name}] ${parts.join(" | ")}`);
  }
  return lines.join("\n");
}

function buildSystemPrompt(
  qualityMode: QualityMode,
  disabledSources: RatingSource[] = []
): string {
  const enabledDescs = (Object.keys(RATING_DESCRIPTIONS) as RatingSource[])
    .filter((s) => !disabledSources.includes(s))
    .map((s) => RATING_DESCRIPTIONS[s]);
  const ratingsLine = enabledDescs.length
    ? `Ratingi: ${enabledDescs.join(", ")}. "-" = brak danych.`
    : "";

  const base = `Jesteś ekspertem od wakacji all-inclusive. Analizujesz oferty z wakacje.pl.

Dane ofert są w formacie pipe-delimited.
${ratingsLine}`;

  if (qualityMode === "precomputed") {
    return `${base}
Q to gotowy quality score 0-10 (już wyliczony), V to value score = Q/cena*1000.

Zasady:
- Odpowiadaj po polsku, zwięźle
- Przy porównaniach używaj tabelek markdown
- Przy rankingach podawaj cenę całkowitą, Q, V i kraj
- Nie przeliczaj jakości od nowa z surowych ratingów, używaj Q i V jako głównej metryki
- Nie wymyślaj danych, których nie ma w kontekście`;
  }

  return `${base}

Zasady:
- Odpowiadaj po polsku, zwięźle
- Przy porównaniach używaj tabelek markdown
- Przy rankingach podawaj cenę całkowitą, oceny i kraj
- "Jakość" = średnia ważona dostępnych ocen (G i TA ważone x2 bo skala 1-5, Tv i W bez przeliczenia)
- Stosunek ceny do jakości = jakość / cena_calkowita * 1000
- Jeśli brakuje ocen z jakiegoś źródła, nie traktuj tego jako 0 — po prostu pomiń w obliczeniach
- Nie wymyślaj danych, których nie ma w kontekście`;
}

interface UIMessagePart {
  type: string;
  text?: string;
}

interface UIMessage {
  role: "user" | "assistant";
  parts?: UIMessagePart[];
  content?: string;
}

function toCoreMsgs(msgs: UIMessage[]): { role: "user" | "assistant"; content: string }[] {
  return msgs.map((m) => ({
    role: m.role,
    content:
      m.content ??
      (m.parts ?? [])
        .filter((p) => p.type === "text")
        .map((p) => p.text ?? "")
        .join("") ??
      "",
  }));
}

function createJsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function loadContext(
  snapshotId: string | null,
  offerIds?: string[] | null,
  qualityMode: QualityMode = "precomputed",
  disabledSources: RatingSource[] = [],
  includeDescriptions = false
): Promise<string> {
  let offers = await loadOffers(snapshotId || null);
  if (offers.length === 0) throw new Error(NO_OFFERS_CODE);

  if (offerIds?.length) {
    const idSet = new Set(offerIds);
    offers = offers.filter((o) => idSet.has(o.id));
    if (offers.length === 0) throw new Error(NO_OFFERS_CODE);
  }

  let context = compressOffers(offers, {
    includeComputed: qualityMode === "precomputed",
    disabledSources,
  });

  if (includeDescriptions) {
    const descCache = await loadDescriptionCache();
    const descContext = compressDescriptions(offers, descCache);
    if (descContext) {
      context += `\n\n--- OPISY HOTELI ---\n${descContext}`;
    }
  }

  return context;
}

export async function buildExternalPrompt(
  snapshotId: string | null,
  question: string,
  offerIds?: string[] | null,
  qualityMode: QualityMode = "precomputed",
  disabledSources: RatingSource[] = [],
  includeDescriptions = false
): Promise<string> {
  const context = await loadContext(snapshotId || null, offerIds, qualityMode, disabledSources, includeDescriptions);
  const systemPrompt = buildSystemPrompt(qualityMode, disabledSources);
  const trimmedQuestion = question.trim();

  return `${systemPrompt}\n\n--- OFERTY ---\n${context}\n\n--- PYTANIE UZYTKOWNIKA ---\n${
    trimmedQuestion || "Brak pytania od użytkownika."
  }`;
}

export async function handleChatRequest(req: Request): Promise<Response> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  if (!env?.GOOGLE_GENERATIVE_AI_API_KEY) {
    return createJsonResponse(
      { code: LLM_KEY_MISSING_CODE, error: "Brak klucza Gemini" },
      503
    );
  }

  const body = await req.json();
  const qualityMode: QualityMode =
    body?.qualityMode === "legacy" ? "legacy" : "precomputed";
  const disabledSources: RatingSource[] = Array.isArray(body?.disabledSources)
    ? body.disabledSources
    : [];
  const { messages, snapshotId, offerIds } = body;
  const includeDescriptions: boolean = body?.includeDescriptions === true;
  let context: string;

  try {
    context = await loadContext(snapshotId || null, offerIds, qualityMode, disabledSources, includeDescriptions);
  } catch (error) {
    if (error instanceof Error && error.message === NO_OFFERS_CODE) {
      return createJsonResponse(
        { code: NO_OFFERS_CODE, error: "Brak ofert w snapshocie" },
        400
      );
    }
    throw error;
  }

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: `${buildSystemPrompt(qualityMode, disabledSources)}\n\n--- OFERTY ---\n${context}`,
    messages: toCoreMsgs(messages),
  });

  return result.toUIMessageStreamResponse();
}

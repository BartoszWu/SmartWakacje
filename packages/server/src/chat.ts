import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { loadOffers } from "./services/cache";
import {
  computeQualityScore,
  computeValueScore,
  type Offer,
  type QualityMode,
} from "@smartwakacje/shared";

export const LLM_KEY_MISSING_CODE = "LLM_KEY_MISSING";
export const NO_OFFERS_CODE = "NO_OFFERS";

function fmt(n: number | undefined | null): string {
  if (n == null) return "-";
  return String(n);
}

function compressOffers(
  offers: Offer[],
  options: { includeComputed: boolean }
): string {
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

  const legend = options.includeComputed
    ? "Format: Nazwa|Kraj|Cena|W(wakacje.pl)|G(google,ile)|TA(tripadvisor,ile)|Tv(trivago,ile)|Q(quality)|V(value)|Dni|Gwiazdki"
    : "Format: Nazwa|Kraj|Cena|W(wakacje.pl)|G(google,ile)|TA(tripadvisor,ile)|Tv(trivago,ile)|Dni|Gwiazdki";

  const rows = offers.map((o) => {
    const g =
      o.googleRating != null
        ? `${o.googleRating}(${fmt(o.googleRatingsTotal)})`
        : "-";
    const ta =
      o.taRating != null ? `${o.taRating}(${fmt(o.taReviewCount)})` : "-";
    const tv =
      o.trivagoRating != null
        ? `${o.trivagoRating}(${fmt(o.trivagoReviewsCount)})`
        : "-";

    const row = [
      o.name,
      o.country,
      o.price,
      `W:${o.ratingValue}`,
      `G:${g}`,
      `TA:${ta}`,
      `Tv:${tv}`,
    ];

    if (options.includeComputed) {
      const q = computeQualityScore(o);
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

const SYSTEM_PROMPT_PRECOMPUTED = `Jesteś ekspertem od wakacji all-inclusive. Analizujesz oferty z wakacje.pl.

Dane ofert są w formacie pipe-delimited. Kolumny:
Nazwa|Kraj|Cena(całość zł)|W:ocena_wakacje.pl|G:google(ile_ocen)|TA:tripadvisor(ile)|Tv:trivago(ile)|Q:quality|V:value|Dni|Gwiazdki

Ratingi: W = wakacje.pl (1-10), G = Google Maps (1-5), TA = TripAdvisor (1-5), Tv = Trivago (1-10), "-" = brak danych.
Q to gotowy quality score 0-10 (już wyliczony), V to value score = Q/cena*1000.

Zasady:
- Odpowiadaj po polsku, zwięźle
- Przy porównaniach używaj tabelek markdown
- Przy rankingach podawaj cenę całkowitą, Q, V i kraj
- Nie przeliczaj jakości od nowa z surowych ratingów, używaj Q i V jako głównej metryki
- Nie wymyślaj danych, których nie ma w kontekście`;

const SYSTEM_PROMPT_LEGACY = `Jesteś ekspertem od wakacji all-inclusive. Analizujesz oferty z wakacje.pl.

Dane ofert są w formacie pipe-delimited. Kolumny:
Nazwa|Kraj|Cena(całość zł)|W:ocena_wakacje.pl|G:google(ile_ocen)|TA:tripadvisor(ile)|Tv:trivago(ile)|Dni|Gwiazdki

Ratingi: W = wakacje.pl (skala 1-10), G = Google Maps (1-5), TA = TripAdvisor (1-5), Tv = Trivago (1-10). "-" = brak danych.

Zasady:
- Odpowiadaj po polsku, zwięźle
- Przy porównaniach używaj tabelek markdown
- Przy rankingach podawaj cenę całkowitą, oceny i kraj
- "Jakość" = średnia ważona dostępnych ocen (G i TA ważone x2 bo skala 1-5, Tv i W bez przeliczenia)
- Stosunek ceny do jakości = jakość / cena_calkowita * 1000
- Jeśli brakuje ocen z jakiegoś źródła, nie traktuj tego jako 0 — po prostu pomiń w obliczeniach
- Nie wymyślaj danych, których nie ma w kontekście`;

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
  qualityMode: QualityMode = "precomputed"
): Promise<string> {
  let offers = await loadOffers(snapshotId || null);
  if (offers.length === 0) throw new Error(NO_OFFERS_CODE);

  if (offerIds?.length) {
    const idSet = new Set(offerIds);
    offers = offers.filter((o) => idSet.has(o.id));
    if (offers.length === 0) throw new Error(NO_OFFERS_CODE);
  }

  return compressOffers(offers, {
    includeComputed: qualityMode === "precomputed",
  });
}

export async function buildExternalPrompt(
  snapshotId: string | null,
  question: string,
  offerIds?: string[] | null,
  qualityMode: QualityMode = "precomputed"
): Promise<string> {
  const context = await loadContext(snapshotId || null, offerIds, qualityMode);
  const systemPrompt =
    qualityMode === "legacy" ? SYSTEM_PROMPT_LEGACY : SYSTEM_PROMPT_PRECOMPUTED;
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
  const { messages, snapshotId, offerIds } = body;
  let context: string;

  try {
    context = await loadContext(snapshotId || null, offerIds, qualityMode);
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
    system: `${
      qualityMode === "legacy"
        ? SYSTEM_PROMPT_LEGACY
        : SYSTEM_PROMPT_PRECOMPUTED
    }\n\n--- OFERTY ---\n${context}`,
    messages: toCoreMsgs(messages),
  });

  return result.toUIMessageStreamResponse();
}

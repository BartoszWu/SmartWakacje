import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { loadOffers } from "./services/cache";
import type { Offer } from "@smartwakacje/shared";

export const LLM_KEY_MISSING_CODE = "LLM_KEY_MISSING";
export const NO_OFFERS_CODE = "NO_OFFERS";

function fmt(n: number | undefined | null): string {
  if (n == null) return "-";
  return String(n);
}

function compressOffers(offers: Offer[]): string {
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

  const legend =
    "Format: Nazwa|Kraj|Miasto|Cena|Cena/os|W(wakacje.pl)|G(google,ile)|TA(tripadvisor,ile)|Tv(trivago,ile)|Dni|Wyzywienie|Gwiazdki|Operator";

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

    return [
      o.name,
      o.country,
      o.city,
      o.price,
      o.pricePerPerson,
      `W:${o.ratingValue}`,
      `G:${g}`,
      `TA:${ta}`,
      `Tv:${tv}`,
      `${o.duration}d`,
      o.serviceDesc,
      `${o.category}★`,
      o.tourOperator,
    ].join("|");
  });

  return `=== ${header} ===\n${legend}\n${rows.join("\n")}`;
}

const SYSTEM_PROMPT = `Jesteś ekspertem od wakacji all-inclusive. Analizujesz oferty z wakacje.pl.

Dane ofert są w formacie pipe-delimited. Kolumny:
Nazwa|Kraj|Miasto|Cena(całość zł)|Cena/os|W:ocena_wakacje.pl|G:google(ile_ocen)|TA:tripadvisor(ile)|Tv:trivago(ile)|Dni|Wyżywienie|Gwiazdki|Operator

Ratingi: W = wakacje.pl (skala 1-10), G = Google Maps (1-5), TA = TripAdvisor (1-5), Tv = Trivago (1-10). "-" = brak danych.

Zasady:
- Odpowiadaj po polsku, zwięźle
- Przy porównaniach używaj tabelek markdown
- Przy rankingach podawaj cenę, oceny i kraj
- "Jakość" = średnia ważona dostępnych ocen (G i TA ważone x2 bo skala 1-5, Tv i W bez przeliczenia)
- Stosunek ceny do jakości = jakość / cena_za_osobę * 1000
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

async function loadContext(snapshotId: string | null): Promise<string> {
  const offers = await loadOffers(snapshotId || null);
  if (offers.length === 0) {
    throw new Error(NO_OFFERS_CODE);
  }

  return compressOffers(offers);
}

export async function buildExternalPrompt(
  snapshotId: string | null,
  question: string
): Promise<string> {
  const context = await loadContext(snapshotId || null);
  const trimmedQuestion = question.trim();

  return `${SYSTEM_PROMPT}\n\n--- OFERTY ---\n${context}\n\n--- PYTANIE UZYTKOWNIKA ---\n${
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

  const { messages, snapshotId } = await req.json();
  let context: string;

  try {
    context = await loadContext(snapshotId || null);
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
    system: `${SYSTEM_PROMPT}\n\n--- OFERTY ---\n${context}`,
    messages: toCoreMsgs(messages),
  });

  return result.toUIMessageStreamResponse();
}

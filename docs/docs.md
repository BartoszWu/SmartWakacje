# Dokumentacja funkcjonalności

## Chat AI (`packages/server/src/chat.ts`)

Endpoint `POST /api/chat` — streaming chatbot analizujący oferty wakacyjne.

**Kontekst**: Wszystkie oferty ze snapshotu skompresowane do pipe-delimited (~80 chars/oferta):

```
=== 187 ofert | Tunezja, Turcja | 6200-14800 zł ===
Nazwa|Kraj|Miasto|Cena|Cena/os|W:rating|G:rating(n)|TA:rating(n)|Tv:rating(n)|Dni|Wyżywienie|★|Operator
```

`-` = brak danych. ~4-6K tokenów / 200-300 ofert.

**Stos**: `ai` (streamText) + `@ai-sdk/google` (gemini-2.5-flash) → `toUIMessageStreamResponse`. Frontend: `@ai-sdk/react` (useChat) + `DefaultChatTransport`.

**Przepływ**: useChat → POST `/api/chat` {messages, snapshotId} → loadOffers → compressOffers → toCoreMsgs (UIMessage parts→content) → streamText → stream do frontu.

**Klucz**: `GOOGLE_GENERATIVE_AI_API_KEY` w `.env`.

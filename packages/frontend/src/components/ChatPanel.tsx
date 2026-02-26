import React, { useRef, useEffect, useState, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useStore } from "../store/useStore";
import type { QualityMode } from "@smartwakacje/shared";

const SUGGESTED_PROMPTS = [
  { label: "Top 5 hoteli jakościowo", icon: "🏆" },
  { label: "Najlepszy stosunek ceny do ocen", icon: "💎" },
  { label: "Porównaj Turcję vs Tunezję", icon: "⚖️" },
  { label: "Najtańsze hotele z oceną Google > 4.5", icon: "🔍" },
  { label: "Które hotele mają najlepsze jedzenie?", icon: "🍽️" },
];

const MISSING_KEY_HINTS = [
  "llm_key_missing",
  "brak klucza gemini",
  "api key",
  "ai_loadapikeyerror",
  "status code 503",
];

const QUALITY_MODE_COPY: Record<
  QualityMode,
  { label: string; description: string; title: string }
> = {
  precomputed: {
    label: "Ocena systemowa",
    title: "Ranking oparty o preliczony score quality/value",
    description: "Ocena systemowa = mniej tokenów i stabilniejszy ranking ofert.",
  },
  legacy: {
    label: "Ocena modelu AI",
    title: "Ranking wyliczany dynamicznie przez model AI",
    description: "Ocena modelu AI = większa swoboda odpowiedzi kosztem stabilności.",
  },
};

function isMissingKeyError(error: Error | undefined): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  return MISSING_KEY_HINTS.some((hint) => msg.includes(hint));
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path
        d="M12 2C6.48 2 2 5.92 2 10.66c0 2.75 1.53 5.2 3.93 6.77L4.5 22l4.73-2.23c.88.22 1.81.34 2.77.34 5.52 0 10-3.92 10-8.45C22 6.92 17.52 2 12 2z"
        fill="currentColor"
      />
      <circle cx="8" cy="10.5" r="1.25" fill="#141416" />
      <circle cx="12" cy="10.5" r="1.25" fill="#141416" />
      <circle cx="16" cy="10.5" r="1.25" fill="#141416" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5">
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" fill="currentColor" />
    </svg>
  );
}

function SpinnerDots() {
  return (
    <span className="inline-flex gap-1 items-center h-5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-sand-dim"
          style={{
            animation: "dotBounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </span>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```|\|.*\|)/g);

  return (
    <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const inner = part.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
          return (
            <pre key={i} className="my-2 p-2.5 rounded-sm bg-bg/60 text-xs font-mono overflow-x-auto border border-sand/5">
              {inner}
            </pre>
          );
        }
        if (part.includes("|") && part.trim().startsWith("|")) {
          const rows = part
            .trim()
            .split("\n")
            .filter((r) => !r.match(/^\|[\s-:|]+\|$/));
          return (
            <div key={i} className="my-2 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {rows.map((row, ri) => {
                    const cells = row
                      .split("|")
                      .filter(Boolean)
                      .map((c) => c.trim());
                    const isHeader = ri === 0;
                    return (
                      <tr key={ri} className={isHeader ? "border-b border-sand/10" : ""}>
                        {cells.map((cell, ci) =>
                          isHeader ? (
                            <th key={ci} className="text-left py-1 px-2 font-semibold text-sand-bright">
                              {cell}
                            </th>
                          ) : (
                            <td key={ci} className="py-1 px-2 text-sand-dim">
                              {cell}
                            </td>
                          )
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }

        return <span key={i}>{formatInlineMarkdown(part)}</span>;
      })}
    </div>
  );
}

function formatInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    nodes.push(
      <strong key={match.index} className="font-semibold text-sand-bright">
        {match[0].slice(2, -2)}
      </strong>
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes;
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [fallbackPrompt, setFallbackPrompt] = useState("");
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [isPreparingPrompt, setIsPreparingPrompt] = useState(false);
  const [copyToast, setCopyToast] = useState<null | "success" | "error">(null);
  const [useFiltered, setUseFiltered] = useState(false);
  const [qualityMode, setQualityMode] = useState<QualityMode>("precomputed");
  const snapshotId = useStore((s) => s.activeSnapshotId);
  const offers = useStore((s) => s.offers);
  const filteredOffers = useStore((s) => s.filteredOffers);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copyToastTimeoutRef = useRef<number | null>(null);

  const hasActiveFilters = filteredOffers.length !== offers.length;
  const effectiveUseFiltered = useFiltered && hasActiveFilters;
  const offerIds = effectiveUseFiltered
    ? filteredOffers.map((o) => o.id)
    : undefined;
  const contextCount = effectiveUseFiltered ? filteredOffers.length : offers.length;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { snapshotId, offerIds, qualityMode },
      }),
    [snapshotId, qualityMode, JSON.stringify(offerIds)]
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";
  const missingKeyMode = isMissingKeyError(error);
  const lastMsgText = (msg: typeof messages[number]) => {
    for (const part of msg.parts) {
      if (part.type === "text") return part.text;
    }
    return "";
  };
  const lastUserQuestion = [...messages]
    .reverse()
    .find((msg) => msg.role === "user" && lastMsgText(msg).trim());
  const fallbackQuestion = input.trim() || (lastUserQuestion ? lastMsgText(lastUserQuestion).trim() : "");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(
    () => () => {
      if (copyToastTimeoutRef.current !== null) {
        window.clearTimeout(copyToastTimeoutRef.current);
      }
    },
    []
  );

  const showCopyToast = (kind: "success" | "error") => {
    if (copyToastTimeoutRef.current !== null) {
      window.clearTimeout(copyToastTimeoutRef.current);
    }
    setCopyToast(kind);
    copyToastTimeoutRef.current = window.setTimeout(() => {
      setCopyToast(null);
      copyToastTimeoutRef.current = null;
    }, 1800);
  };

  const prepareFallbackPrompt = async (question: string) => {
    if (!question.trim() || isPreparingPrompt) return;

    setFallbackError(null);
    setIsPreparingPrompt(true);

    try {
      const res = await fetch("/api/chat/fallback-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotId,
          question: question.trim(),
          offerIds,
          qualityMode,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : "Nie udało się przygotować promptu";
        throw new Error(message);
      }

      if (typeof data?.prompt !== "string" || !data.prompt.trim()) {
        throw new Error("Serwer zwrócił pusty prompt");
      }

      setFallbackPrompt(data.prompt);
    } catch (err) {
      setFallbackError(
        err instanceof Error ? err.message : "Nie udało się przygotować promptu"
      );
    } finally {
      setIsPreparingPrompt(false);
    }
  };

  const copyFallbackPrompt = async () => {
    if (!fallbackPrompt.trim()) return;

    try {
      await navigator.clipboard.writeText(fallbackPrompt);
      showCopyToast("success");
    } catch {
      showCopyToast("error");
    }
  };

  const send = (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  const submitPrimaryAction = () => {
    if (!(missingKeyMode ? fallbackQuestion : input.trim())) return;

    if (missingKeyMode) {
      void prepareFallbackPrompt(fallbackQuestion);
      return;
    }

    send(input);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitPrimaryAction();
    }
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(!open)}
        title={open ? "Zamknij czat" : "Asystent AI"}
        className={`fixed right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg group ${
          open
            ? "top-5 bg-bg-card text-sand-dim hover:text-sand border border-sand/10 rotate-0"
            : "bg-accent text-white hover:bg-accent-glow hover:scale-105"
        } ${open ? "" : "bottom-6"}`}
        style={{
          boxShadow: open
            ? "0 4px 24px rgba(0,0,0,.4)"
            : "0 4px 32px rgba(212,98,26,.35), 0 0 0 0 rgba(212,98,26,.2)",
        }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
        {!open && messages.length === 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green border-2 border-bg animate-pulse" />
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-40 h-full w-full sm:w-[440px] flex flex-col transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background: "linear-gradient(180deg, #1a1a1f 0%, #141416 100%)",
          borderLeft: "1px solid rgba(232,220,200,0.06)",
        }}
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-sand/6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-accent">
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 22L12 18.56L5.82 22L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="currentColor"
                  opacity="0.9"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-lg text-sand-bright leading-none">Asystent wakacyjny</h2>
              <p className="text-[11px] text-sand-dim mt-0.5 font-medium">
                Analiza{" "}
                <span className="font-mono text-sand-bright">{contextCount}</span>
                {effectiveUseFiltered && (
                  <span className="text-sand-dim/60"> / {offers.length}</span>
                )}
                {" "}ofert
              </p>
            </div>
          </div>

          {/* Context toggle */}
          <div className="flex items-center gap-1.5 mt-3">
            <button
              type="button"
              onClick={() => setUseFiltered(false)}
              className={`px-3 py-1.5 rounded-sm text-[11px] font-semibold tracking-wide transition-all duration-200 border ${
                !effectiveUseFiltered
                  ? "bg-accent/15 border-accent/40 text-accent"
                  : "bg-transparent border-sand/8 text-sand-dim hover:border-sand/20 hover:text-sand"
              }`}
            >
              Wszystkie
              <span className="ml-1 font-mono opacity-70">{offers.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setUseFiltered(true)}
              disabled={!hasActiveFilters}
              className={`px-3 py-1.5 rounded-sm text-[11px] font-semibold tracking-wide transition-all duration-200 border ${
                effectiveUseFiltered
                  ? "bg-accent/15 border-accent/40 text-accent"
                  : hasActiveFilters
                    ? "bg-transparent border-sand/8 text-sand-dim hover:border-sand/20 hover:text-sand"
                    : "bg-transparent border-sand/5 text-sand-dim/30 cursor-not-allowed"
              }`}
            >
              Filtrowane
              <span className="ml-1 font-mono opacity-70">{filteredOffers.length}</span>
            </button>
          </div>

          <div className="mt-2.5">
            <p className="text-[10px] uppercase tracking-widest text-sand-dim/55 font-semibold mb-1.5 px-0.5">
              Tryb oceny
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setQualityMode("precomputed")}
                title={QUALITY_MODE_COPY.precomputed.title}
                className={`px-2.5 py-1.5 rounded-sm text-[11px] font-semibold border transition-all ${
                  qualityMode === "precomputed"
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "bg-transparent border-sand/8 text-sand-dim hover:border-sand/20 hover:text-sand"
                }`}
              >
                {QUALITY_MODE_COPY.precomputed.label}
              </button>
              <button
                type="button"
                onClick={() => setQualityMode("legacy")}
                title={QUALITY_MODE_COPY.legacy.title}
                className={`px-2.5 py-1.5 rounded-sm text-[11px] font-semibold border transition-all ${
                  qualityMode === "legacy"
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "bg-transparent border-sand/8 text-sand-dim hover:border-sand/20 hover:text-sand"
                }`}
              >
                {QUALITY_MODE_COPY.legacy.label}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-sand-dim/70 px-0.5">
              {QUALITY_MODE_COPY[qualityMode].description}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col h-full">
              <div className="flex-1 flex flex-col items-center justify-center px-2">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-5">
                  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-accent">
                    <path
                      d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-sand-dim text-sm text-center leading-relaxed max-w-[280px]">
                  Zapytaj mnie o oferty wakacyjne. Porównam hotele, oceny i ceny.
                </p>
              </div>

              <div className="mt-auto pt-4">
                <p className="text-[10px] uppercase tracking-widest text-sand-dim/60 font-semibold mb-2.5 px-1">
                  Sugerowane pytania
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        if (missingKeyMode) {
                          setInput(p.label);
                          void prepareFallbackPrompt(p.label);
                          return;
                        }
                        send(p.label);
                      }}
                      className="group/sp flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-sm text-left text-[13px] text-sand-dim font-medium border border-sand/6 bg-bg-card/50 transition-all duration-200 hover:border-accent/30 hover:bg-bg-card hover:text-sand-bright"
                    >
                      <span className="text-base shrink-0 opacity-60 group-hover/sp:opacity-100 transition-opacity">
                        {p.icon}
                      </span>
                      {p.label}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-3.5 h-3.5 ml-auto shrink-0 opacity-0 -translate-x-1 group-hover/sp:opacity-50 group-hover/sp:translate-x-0 transition-all duration-200"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const text = lastMsgText(msg);
                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] px-3.5 py-2.5 rounded-sm ${
                        msg.role === "user"
                          ? "bg-accent text-white/95 rounded-br-[3px]"
                          : "bg-bg-card text-sand border border-sand/5 rounded-bl-[3px]"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <MessageContent content={text} />
                      ) : (
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{text}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-sm bg-bg-card border border-sand/5 rounded-bl-[3px]">
                    <SpinnerDots />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input */}
        <div className="relative shrink-0 px-4 pb-4 pt-2">
          {copyToast && (
            <div
              aria-live="polite"
              className={`absolute left-1/2 -translate-x-1/2 -top-1 z-10 px-3 py-1.5 rounded-sm text-[11px] font-medium border animate-pop-in bg-bg/95 ${
                copyToast === "success"
                  ? "border-green/60 text-green"
                  : "border-red/60 text-red"
              }`}
            >
              {copyToast === "success"
                ? "Skopiowano prompt"
                : "Nie udało się skopiować"}
            </div>
          )}

          {missingKeyMode && (
            <div className="mb-3 p-3 rounded-sm border border-accent/35 bg-accent/8 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-sand-bright tracking-wide uppercase">
                    Brak klucza AI na serwerze
                  </p>
                  <p className="text-[12px] text-sand-dim mt-1 leading-relaxed">
                    Przygotuj prompt i wklej go do zewnętrznego LLM.
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-sm border border-sand/15 text-sand-dim">
                  Zewnętrzny LLM
                </span>
              </div>

              {!input.trim() && lastUserQuestion && (
                <p className="mt-2 text-[11px] text-sand-dim/80">
                  Użyję ostatniego pytania z czatu.
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void prepareFallbackPrompt(fallbackQuestion)}
                  disabled={!fallbackQuestion || isPreparingPrompt}
                  className="px-3 py-2 rounded-sm text-[12px] font-medium bg-accent text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-glow transition-colors"
                >
                  {isPreparingPrompt ? "Przygotowywanie..." : "Przygotuj prompt"}
                </button>
                <button
                  type="button"
                  onClick={() => void copyFallbackPrompt()}
                  disabled={!fallbackPrompt.trim()}
                  className="px-3 py-2 rounded-sm text-[12px] font-medium border border-sand/20 text-sand-bright disabled:opacity-40 disabled:cursor-not-allowed hover:border-sand/40 transition-colors"
                >
                  Kopiuj prompt
                </button>
              </div>

              {fallbackError && (
                <p className="mt-2 text-[12px] text-red">{fallbackError}</p>
              )}

              {fallbackPrompt && (
                <pre className="mt-3 p-3 rounded-sm bg-bg/70 border border-sand/10 text-[11px] leading-relaxed text-sand whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                  {fallbackPrompt}
                </pre>
              )}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitPrimaryAction();
            }}
            className="flex items-end gap-2 p-2 rounded-sm bg-bg-card border border-sand/8 focus-within:border-accent/30 transition-colors"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Zapytaj o oferty..."
              rows={1}
              className="flex-1 bg-transparent text-sand-bright text-[13px] placeholder:text-sand-dim/50 resize-none outline-none max-h-28 py-1.5 px-1 font-body leading-relaxed"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              type="submit"
              disabled={
                !(missingKeyMode ? fallbackQuestion : input.trim()) ||
                isLoading ||
                (missingKeyMode && isPreparingPrompt)
              }
              title={missingKeyMode ? "Przygotuj prompt" : "Wyślij"}
              className="shrink-0 w-8 h-8 rounded-sm flex items-center justify-center bg-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent-glow transition-colors"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  );
}

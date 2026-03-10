import React from "react";
import { trpc } from "../trpc";

interface StepFailure {
  name: string;
  error: string;
}

interface CountryProgress {
  name: string;
  done: number;
  total: number;
  status: "pending" | "active" | "done";
}

interface StepProgress {
  label: string;
  status: "pending" | "active" | "done" | "warning";
  done: number;
  total: number;
  failed: number;
  failures: StepFailure[];
  countryProgress?: CountryProgress[];
}

interface ScrapeProgress {
  active: boolean;
  phase: "running" | "summary" | null;
  snapshotId: string | null;
  steps: StepProgress[];
}

function StepIcon({ status }: { status: StepProgress["status"] }) {
  if (status === "done") {
    return (
      <svg className="w-4 h-4 text-green" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "warning") {
    return (
      <svg className="w-4 h-4 text-gold" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 1.5L14.5 13H1.5L8 1.5z"
          stroke="currentColor"
          strokeWidth="1.3"
          fill="currentColor"
          fillOpacity="0.15"
          strokeLinejoin="round"
        />
        <path d="M8 6.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  if (status === "active") {
    return (
      <div className="w-4 h-4 border-2 border-sand/15 border-t-accent rounded-full animate-spin" />
    );
  }
  return (
    <div className="w-4 h-4 flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-sand/20" />
    </div>
  );
}

function CountrySubRow({ country }: { country: CountryProgress }) {
  const pct = country.total > 0 ? Math.round((country.done / country.total) * 100) : 0;

  const labelColor =
    country.status === "done"
      ? "text-green/70"
      : country.status === "active"
        ? "text-sand"
        : "text-sand-dim/50";

  const barColor = country.status === "done" ? "bg-green/60" : "bg-accent/60";

  return (
    <div className="flex items-center gap-2.5 pl-7">
      {/* Mini status dot */}
      <div className="w-2.5 h-2.5 flex items-center justify-center shrink-0">
        {country.status === "done" ? (
          <div className="w-1.5 h-1.5 rounded-full bg-green/70" />
        ) : country.status === "active" ? (
          <div className="w-2 h-2 border border-sand/20 border-t-accent/80 rounded-full animate-spin" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-sand/15" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-xs ${labelColor} transition-colors duration-300`}>
            {country.name}
          </span>
          {country.total > 0 && (
            <span className="text-[10px] text-sand-dim/60 tabular-nums">
              {country.done}/{country.total}
            </span>
          )}
        </div>
        <div className="h-[3px] bg-sand/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${country.status === "pending" ? 0 : pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StepRow({ step }: { step: StepProgress }) {
  const pct = step.total > 0 ? Math.round((step.done / step.total) * 100) : 0;

  const labelColor =
    step.status === "done"
      ? "text-green"
      : step.status === "warning"
        ? "text-gold"
        : step.status === "active"
          ? "text-sand-bright"
          : "text-sand-dim";

  const barColor =
    step.status === "done"
      ? "bg-green"
      : step.status === "warning"
        ? "bg-gold"
        : "bg-accent";

  const hasCountries = step.countryProgress && step.countryProgress.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <StepIcon status={step.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-medium ${labelColor}`}>
              {step.label}
            </span>
            {step.total > 0 && (
              <span className="text-xs text-sand-dim tabular-nums">
                {step.status === "warning" ? (
                  <>{step.done - step.failed}/{step.done}</>
                ) : (
                  <>{step.done}/{step.total}</>
                )}
              </span>
            )}
          </div>
          {!hasCountries && (
            <div className="h-1 bg-sand/8 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${step.status === "pending" ? 0 : pct}%` }}
              />
            </div>
          )}
          {step.status === "warning" && step.failed > 0 && (
            <p className="text-xs text-gold/80 mt-1">
              {step.failed} {step.failed === 1 ? "hotel nie pobrany" : "hoteli nie pobranych"}
            </p>
          )}
        </div>
      </div>
      {hasCountries && (
        <div className="space-y-1.5">
          {step.countryProgress!.map((cp) => (
            <CountrySubRow key={cp.name} country={cp} />
          ))}
        </div>
      )}
    </div>
  );
}

function FailureDetails({ steps }: { steps: StepProgress[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const warningSteps = steps.filter((s) => s.status === "warning" && s.failures.length > 0);
  if (warningSteps.length === 0) return null;

  const totalFails = warningSteps.reduce((s, st) => s + st.failures.length, 0);

  return (
    <div className="mt-4 border-t border-sand/8 pt-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-sand-dim hover:text-sand transition-colors flex items-center gap-1.5"
      >
        <span
          className="inline-block transition-transform duration-200"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0)" }}
        >
          &#9656;
        </span>
        Szczegoly bledow ({totalFails})
      </button>
      {expanded && (
        <div className="mt-3 max-h-48 overflow-y-auto space-y-3 pr-1">
          {warningSteps.map((step) => (
            <div key={step.label}>
              <p className="text-[11px] uppercase tracking-widest text-sand-dim font-semibold mb-1">
                {step.label}
              </p>
              <div className="space-y-0.5">
                {step.failures.map((f) => (
                  <div key={f.name} className="text-xs text-sand-dim flex gap-2">
                    <span className="text-sand/60 shrink-0">-</span>
                    <span className="text-sand truncate">{f.name}</span>
                    <span className="text-red/70 truncate ml-auto text-right">{f.error}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  /** Called by parent when scrape mutation resolves with SnapshotMeta */
  completedSnapshotId?: string | null;
  onContinue: (snapshotId: string) => void;
}

export function ScrapeProgressOverlay({ completedSnapshotId, onContinue }: Props) {
  // @ts-expect-error - tRPC type inference issue with monorepo
  const progressQuery = trpc.snapshots.scrapeProgress.useQuery(undefined, {
    refetchInterval: 1500,
  });

  // @ts-expect-error - tRPC type inference issue with monorepo
  const retryMutation = trpc.snapshots.retryEnrichment.useMutation();
  // @ts-expect-error - tRPC type inference issue with monorepo
  const dismissMutation = trpc.snapshots.dismissProgress.useMutation();

  const progress: ScrapeProgress | undefined = progressQuery.data;
  const steps: StepProgress[] = progress?.steps ?? [];
  const isSummary = progress?.phase === "summary";
  const hasWarnings = steps.some((s) => s.status === "warning" && s.failures.length > 0);
  const totalFailed = steps.reduce((s, st) => s + (st.failures?.length ?? 0), 0);

  // Auto-navigate when mutation completed and server finished progress cleanly (no warnings)
  const navigatedRef = React.useRef(false);
  React.useEffect(() => {
    if (navigatedRef.current) return;
    if (completedSnapshotId && progress && !progress.active && progress.phase === null) {
      navigatedRef.current = true;
      onContinue(completedSnapshotId);
    }
  }, [completedSnapshotId, progress, onContinue]);

  function handleRetry() {
    if (!progress?.snapshotId) return;
    const phases = steps
      .filter((s) => s.status === "warning" && s.failures.length > 0)
      .map((s) => {
        const map: Record<string, string> = {
          "Pobieranie ocen z Google Maps": "Google Maps",
          "Pobieranie ocen z Trivago": "Trivago",
          "Pobieranie ocen z TripAdvisor": "TripAdvisor",
        };
        return map[s.label];
      })
      .filter(Boolean);

    retryMutation.mutate({ snapshotId: progress.snapshotId, phases });
  }

  function handleContinue() {
    if (progress?.snapshotId) {
      dismissMutation.mutate(undefined, {
        onSuccess: () => {
          onContinue(progress!.snapshotId!);
        },
      });
    }
  }

  const isRetrying = retryMutation.isPending;

  return (
    <div className="min-h-screen bg-bg text-sand flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <p className="font-display text-2xl text-sand-bright mb-2">
            {isSummary && hasWarnings
              ? "Pobieranie zakonczone"
              : "Pobieranie ofert i ocen..."}
          </p>
          <p className="text-sand-dim text-sm">
            {isSummary && hasWarnings
              ? "Czesc danych nie zostala pobrana. Mozesz ponowic lub kontynuowac."
              : "Scraping + enrichment z Google, Trivago, TripAdvisor. Moze potrwac 1-5 min."}
          </p>
        </div>
        <div className="bg-bg-card rounded-[16px] border border-sand/8 p-6 space-y-4">
          {steps.map((step) => (
            <StepRow key={step.label} step={step} />
          ))}
          {steps.length === 0 && (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-sand/15 border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {/* Summary actions — only when done with warnings */}
          {isSummary && hasWarnings && (
            <>
              <FailureDetails steps={steps} />
              <div className="flex gap-3 mt-4 pt-4 border-t border-sand/8">
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={isRetrying}
                  className="flex-1 px-4 py-2.5 rounded-sm text-sm font-medium bg-bg-raised border border-sand/12 text-sand hover:bg-bg-card-hover hover:border-sand/20 transition-all disabled:opacity-50"
                >
                  Kontynuuj
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex-1 px-4 py-2.5 rounded-sm text-sm font-medium bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRetrying && (
                    <div className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  )}
                  Ponow nieudane ({totalFailed})
                </button>
              </div>
            </>
          )}

          {/* All resolved after retry — show success */}
          {isSummary && !hasWarnings && (
            <div className="mt-4 pt-4 border-t border-sand/8">
              <button
                type="button"
                onClick={handleContinue}
                className="w-full px-4 py-2.5 rounded-sm text-sm font-medium bg-green/15 border border-green/30 text-green hover:bg-green/25 transition-all"
              >
                Wszystko pobrane — przejdz do wynikow
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

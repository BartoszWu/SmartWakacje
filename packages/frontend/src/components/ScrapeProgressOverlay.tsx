import { trpc } from "../trpc";

interface StepProgress {
  label: string;
  status: "pending" | "active" | "done";
  done: number;
  total: number;
}

function StepIcon({ status }: { status: StepProgress["status"] }) {
  if (status === "done") {
    return (
      <svg className="w-4 h-4 text-green-400" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

function StepRow({ step }: { step: StepProgress }) {
  const pct = step.total > 0 ? Math.round((step.done / step.total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <StepIcon status={step.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-sm font-medium ${
              step.status === "done"
                ? "text-green-400"
                : step.status === "active"
                  ? "text-sand-bright"
                  : "text-sand-dim"
            }`}
          >
            {step.label}
          </span>
          {step.total > 0 && (
            <span className="text-xs text-sand-dim tabular-nums">
              {step.done}/{step.total}
            </span>
          )}
        </div>
        <div className="h-1 bg-sand/8 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              step.status === "done" ? "bg-green-400" : "bg-accent"
            }`}
            style={{ width: `${step.status === "pending" ? 0 : pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ScrapeProgressOverlay() {
  // @ts-expect-error - tRPC type inference issue with monorepo
  const progressQuery = trpc.snapshots.scrapeProgress.useQuery(undefined, {
    refetchInterval: 1500,
  });

  const steps: StepProgress[] = progressQuery.data?.steps ?? [];

  return (
    <div className="min-h-screen bg-bg text-sand flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <p className="font-display text-2xl text-sand-bright mb-2">Pobieranie ofert i ocen...</p>
          <p className="text-sand-dim text-sm">
            Scraping + enrichment z Google, Trivago, TripAdvisor. Moze potrwac 1-5 min.
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
        </div>
      </div>
    </div>
  );
}

export interface StepFailure {
  name: string;
  error: string;
}

export interface CountryProgress {
  name: string;
  done: number;
  total: number;
  status: "pending" | "active" | "done";
}

export interface StepProgress {
  label: string;
  status: "pending" | "active" | "done" | "warning";
  done: number;
  total: number;
  failed: number;
  failures: StepFailure[];
  countryProgress: CountryProgress[];
}

export interface ScrapeProgress {
  active: boolean;
  /** "running" = in progress, "summary" = done with warnings, null = idle */
  phase: "running" | "summary" | null;
  /** snapshot ID set after save, so UI can navigate on dismiss */
  snapshotId: string | null;
  steps: StepProgress[];
}

const STEP_LABELS = [
  "Pobieranie ofert z Wakacje.pl",
  "Pobieranie ocen z Google Maps",
  "Pobieranie ocen z Trivago",
  "Pobieranie ocen z TripAdvisor",
  "Zapisywanie wyników",
];

let progress: ScrapeProgress = { active: false, phase: null, snapshotId: null, steps: [] };

export function startScrapeProgress(): void {
  progress = {
    active: true,
    phase: "running",
    snapshotId: null,
    steps: STEP_LABELS.map((label) => ({
      label,
      status: "pending" as const,
      done: 0,
      total: 0,
      failed: 0,
      failures: [],
      countryProgress: [],
    })),
  };
}

export function initCountries(stepLabel: string, countryNames: string[]): void {
  const step = progress.steps.find((s) => s.label === stepLabel);
  if (!step) return;
  step.countryProgress = countryNames.map((name) => ({
    name,
    done: 0,
    total: 0,
    status: "pending" as const,
  }));
}

export function updateCountryProgress(stepLabel: string, countryName: string, done: number, total: number): void {
  const step = progress.steps.find((s) => s.label === stepLabel);
  if (!step) return;
  const cp = step.countryProgress.find((c) => c.name === countryName);
  if (!cp) return;
  cp.status = "active";
  cp.done = done;
  cp.total = total;
  if (done >= total && total > 0) cp.status = "done";

  // Aggregate: sum across all countries
  step.done = step.countryProgress.reduce((s, c) => s + c.done, 0);
  step.total = step.countryProgress.reduce((s, c) => s + c.total, 0);
  step.status = "active";
  if (step.countryProgress.every((c) => c.status === "done") && step.total > 0) {
    step.status = "done";
  }
}

export function updateStep(label: string, done: number, total: number): void {
  const step = progress.steps.find((s) => s.label === label);
  if (!step) return;
  step.status = "active";
  step.done = done;
  step.total = total;
  if (done >= total && total > 0) step.status = "done";
}

export function completeStep(label: string): void {
  const step = progress.steps.find((s) => s.label === label);
  if (!step) return;
  step.status = "done";
  if (step.total === 0) step.done = step.total = 1;
}

export function warnStep(label: string, failures: StepFailure[]): void {
  const step = progress.steps.find((s) => s.label === label);
  if (!step) return;
  step.status = "warning";
  step.failed = failures.length;
  step.failures = failures.slice(0, 50); // cap at 50 for transport
}

export function setScrapePhase(phase: "running" | "summary" | null): void {
  progress.phase = phase;
  if (phase === null) {
    progress.active = false;
  }
}

export function setSnapshotId(id: string): void {
  progress.snapshotId = id;
}

export function finishScrapeProgress(): void {
  progress = { active: false, phase: null, snapshotId: null, steps: [] };
}

export function getScrapeProgress(): ScrapeProgress {
  return progress;
}

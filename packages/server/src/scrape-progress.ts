export interface StepProgress {
  label: string;
  status: "pending" | "active" | "done";
  done: number;
  total: number;
}

export interface ScrapeProgress {
  active: boolean;
  steps: StepProgress[];
}

const STEP_LABELS = [
  "Pobieranie ofert z Wakacje.pl",
  "Pobieranie ocen z Google Maps",
  "Pobieranie ocen z Trivago",
  "Pobieranie ocen z TripAdvisor",
  "Zapisywanie wyników",
];

let progress: ScrapeProgress = { active: false, steps: [] };

export function startScrapeProgress(): void {
  progress = {
    active: true,
    steps: STEP_LABELS.map((label) => ({
      label,
      status: "pending",
      done: 0,
      total: 0,
    })),
  };
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

export function finishScrapeProgress(): void {
  progress = { active: false, steps: [] };
}

export function getScrapeProgress(): ScrapeProgress {
  return progress;
}

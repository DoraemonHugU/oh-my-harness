export type WizardStep =
  | "locale"
  | "target"
  | "scope"
  | "force"
  | "dryRun"
  | "confirm"
  | "running"
  | "summary";

const STEP_ORDER: WizardStep[] = [
  "locale",
  "target",
  "scope",
  "force",
  "dryRun",
  "confirm",
];

export function nextWizardStep(step: WizardStep): WizardStep {
  const index = STEP_ORDER.indexOf(step);
  if (index === -1 || index === STEP_ORDER.length - 1) {
    return step;
  }

  return STEP_ORDER[index + 1]!;
}

export function previousWizardStep(step: WizardStep): WizardStep | null {
  const index = STEP_ORDER.indexOf(step);
  if (index <= 0) {
    return null;
  }

  return STEP_ORDER[index - 1]!;
}

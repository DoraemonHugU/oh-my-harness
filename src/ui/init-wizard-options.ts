import { formatText } from "../core/text.js";
import type { InitOptions } from "../core/types.js";
import type { WizardStep } from "./init-wizard-state.js";

export const BACK_OPTION_VALUE = "back";
export const EXIT_OPTION_VALUE = "exit";
export const RUN_OPTION_VALUE = "run";

export type WizardChoiceOption = {
  label: string;
  value: string;
};

type BaseOption = {
  label: string;
  value: string;
};

export function isChoiceScreen(step: WizardStep): boolean {
  return (
    step === "locale"
    || step === "cli"
    || step === "scope"
    || step === "force"
    || step === "dryRun"
    || step === "confirm"
  );
}

export function buildStepOptions(
  step: WizardStep,
  options: InitOptions,
): WizardChoiceOption[] {
  if (step === "locale") {
    return [
      { label: "zh", value: "zh" },
      { label: "en", value: "en" },
      {
        label: formatText(options.locale, "tuiMenuExit"),
        value: EXIT_OPTION_VALUE,
      },
    ];
  }

  if (step === "scope") {
    return [
      {
        label: formatText(options.locale, "tuiScopeProject"),
        value: "project",
      },
      {
        label: formatText(options.locale, "tuiScopeGlobal"),
        value: "global",
      },
      {
        label: formatText(options.locale, "tuiBack"),
        value: BACK_OPTION_VALUE,
      },
    ];
  }

  if (step === "cli") {
    return [
      {
        label: formatText(options.locale, "tuiCliCodex"),
        value: "codex",
      },
      {
        label: formatText(options.locale, "tuiCliClaude"),
        value: "claude",
      },
      {
        label: formatText(options.locale, "tuiCliOpenCode"),
        value: "opencode",
      },
      {
        label: formatText(options.locale, "tuiCliAll"),
        value: "all",
      },
      {
        label: formatText(options.locale, "tuiBack"),
        value: BACK_OPTION_VALUE,
      },
    ];
  }

  if (step === "force") {
    return [
      { label: formatText(options.locale, "tuiForceOn"), value: "on" },
      { label: formatText(options.locale, "tuiForceOff"), value: "off" },
      {
        label: formatText(options.locale, "tuiBack"),
        value: BACK_OPTION_VALUE,
      },
    ];
  }

  if (step === "dryRun") {
    return [
      { label: formatText(options.locale, "tuiDryRunOn"), value: "on" },
      { label: formatText(options.locale, "tuiDryRunOff"), value: "off" },
      {
        label: formatText(options.locale, "tuiBack"),
        value: BACK_OPTION_VALUE,
      },
    ];
  }

  if (step === "confirm") {
    return [
      { label: formatText(options.locale, "tuiConfirmRun"), value: RUN_OPTION_VALUE },
      { label: formatText(options.locale, "tuiBack"), value: BACK_OPTION_VALUE },
      { label: formatText(options.locale, "tuiMenuExit"), value: EXIT_OPTION_VALUE },
    ];
  }

  return [];
}

export function getDefaultChoiceIndex(
  step: WizardStep,
  options: InitOptions,
  stepOptions: WizardChoiceOption[],
): number {
  let currentValue: string | null = null;

  if (step === "locale") {
    currentValue = options.locale;
  } else if (step === "cli") {
    currentValue = options.cliTargets.length === 3
      ? "all"
      : options.cliTargets[0] ?? "codex";
  } else if (step === "scope") {
    currentValue = options.global ? "global" : "project";
  } else if (step === "force") {
    currentValue = options.force ? "on" : "off";
  } else if (step === "dryRun") {
    currentValue = options.dryRun ? "on" : "off";
  } else if (step === "confirm") {
    currentValue = RUN_OPTION_VALUE;
  }

  if (!currentValue) {
    return 0;
  }

  const index = stepOptions.findIndex((option) => option.value === currentValue);
  return index >= 0 ? index : 0;
}

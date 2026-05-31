import assert from "node:assert/strict";
import test from "node:test";

import type { InitOptions } from "../core/types.js";
import {
  BACK_OPTION_VALUE,
  buildStepOptions,
  EXIT_OPTION_VALUE,
  getDefaultChoiceIndex,
  RUN_OPTION_VALUE,
} from "./init-wizard-options.js";

function createOptions(overrides: Partial<InitOptions> = {}): InitOptions {
  return {
    targetRoot: "/tmp/demo",
    force: false,
    global: false,
    dryRun: false,
    locale: "zh",
    cliTargets: ["codex"],
    ...overrides,
  };
}

test("locale step keeps both locales and exit", () => {
  const stepOptions = buildStepOptions("locale", createOptions({ locale: "zh" }));

  assert.deepEqual(
    stepOptions.map((option) => option.value),
    ["zh", "en", EXIT_OPTION_VALUE],
  );
});

test("scope step keeps both scope choices and back", () => {
  const stepOptions = buildStepOptions("scope", createOptions({ global: false }));

  assert.deepEqual(
    stepOptions.map((option) => option.value),
    ["project", "global", BACK_OPTION_VALUE],
  );
});

test("cli step keeps all target choices and back", () => {
  const stepOptions = buildStepOptions("cli", createOptions());

  assert.deepEqual(
    stepOptions.map((option) => option.value),
    ["codex", "claude", "opencode", "all", BACK_OPTION_VALUE],
  );
});

test("force step keeps both toggles and back", () => {
  const stepOptions = buildStepOptions("force", createOptions({ force: true }));

  assert.deepEqual(
    stepOptions.map((option) => option.value),
    ["on", "off", BACK_OPTION_VALUE],
  );
});

test("confirm step keeps explicit run, back, and exit choices", () => {
  const stepOptions = buildStepOptions("confirm", createOptions());

  assert.deepEqual(
    stepOptions.map((option) => option.value),
    [RUN_OPTION_VALUE, BACK_OPTION_VALUE, EXIT_OPTION_VALUE],
  );
});

test("default choice index points at the current locale", () => {
  const options = createOptions({ locale: "en" });
  const stepOptions = buildStepOptions("locale", options);

  assert.equal(getDefaultChoiceIndex("locale", options, stepOptions), 1);
});

test("default choice index points at the current force value", () => {
  const options = createOptions({ force: false });
  const stepOptions = buildStepOptions("force", options);

  assert.equal(getDefaultChoiceIndex("force", options, stepOptions), 1);
});

test("default choice index points at the current CLI target", () => {
  const options = createOptions({ cliTargets: ["opencode"] });
  const stepOptions = buildStepOptions("cli", options);

  assert.equal(getDefaultChoiceIndex("cli", options, stepOptions), 2);
});

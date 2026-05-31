import test from "node:test";
import assert from "node:assert/strict";

import { nextWizardStep, previousWizardStep } from "./init-wizard-state.js";

test("nextWizardStep follows the init flow order", () => {
  assert.equal(nextWizardStep("locale"), "target");
  assert.equal(nextWizardStep("target"), "cli");
  assert.equal(nextWizardStep("cli"), "scope");
  assert.equal(nextWizardStep("scope"), "force");
  assert.equal(nextWizardStep("force"), "dryRun");
  assert.equal(nextWizardStep("dryRun"), "confirm");
  assert.equal(nextWizardStep("confirm"), "confirm");
});

test("previousWizardStep moves backward through the init flow", () => {
  assert.equal(previousWizardStep("confirm"), "dryRun");
  assert.equal(previousWizardStep("dryRun"), "force");
  assert.equal(previousWizardStep("force"), "scope");
  assert.equal(previousWizardStep("scope"), "cli");
  assert.equal(previousWizardStep("cli"), "target");
  assert.equal(previousWizardStep("target"), "locale");
  assert.equal(previousWizardStep("locale"), null);
});

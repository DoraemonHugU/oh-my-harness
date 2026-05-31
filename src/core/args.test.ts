import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { parseArgs } from "./args.js";
import { resolveInitOptions } from "./init.js";

test("parseArgs parses init flags and project name", () => {
  const parsed = parseArgs([
    "init",
    "demo",
    "--force",
    "--global",
    "--dry-run",
    "--no-tui",
    "--lang",
    "en",
  ]);

  assert.equal(parsed.command, "init");
  assert.equal(parsed.projectArg, "demo");
  assert.equal(parsed.force, true);
  assert.equal(parsed.global, true);
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.noTui, true);
  assert.equal(parsed.lang, "en");
});

test("parseArgs parses the target CLI", () => {
  const parsed = parseArgs([
    "init",
    "--cli",
    "claude",
    "--no-tui",
  ]);

  assert.deepEqual(parsed.cliTargets, ["claude"]);
});

test("resolveInitOptions keeps locale and resolves target root", () => {
  const options = resolveInitOptions(
    {
      command: "init",
      projectArg: "demo",
      force: true,
      global: false,
      dryRun: true,
      noTui: false,
      help: false,
      version: false,
      lang: "zh",
      cliTargets: [],
    },
    "zh",
  );

  assert.equal(options.locale, "zh");
  assert.equal(options.force, true);
  assert.equal(options.global, false);
  assert.equal(options.dryRun, true);
  assert.equal(options.targetRoot, path.resolve(process.cwd(), "demo"));
  assert.deepEqual(options.cliTargets, ["codex"]);
});

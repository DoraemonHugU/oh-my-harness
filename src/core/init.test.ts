import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { performInit } from "./init.js";

test("performInit initializes git and generates the initial tree file", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "oh-my-harness-init-"));
  const targetRoot = path.join(tempRoot, "project");
  const fakeHome = path.join(tempRoot, "home");
  await mkdir(targetRoot, { recursive: true });
  await mkdir(fakeHome, { recursive: true });

  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = fakeHome;
  process.env.USERPROFILE = fakeHome;

  try {
    const summary = await performInit({
      targetRoot,
      force: false,
      global: false,
      dryRun: false,
      locale: "zh",
      cliTargets: ["codex"],
    });

    await stat(path.join(targetRoot, ".git"));
    const tree = await readFile(
      path.join(targetRoot, ".oh-my-harness", "tree.md"),
      "utf8",
    );

    assert.match(tree, /# Tree/);
    assert.match(tree, /git ls-files --cached --others --exclude-standard/);
    assert(summary.some((entry) =>
      entry.target.endsWith(`${path.sep}.git`) && entry.kind === "created"
    ));
    assert(summary.some((entry) =>
      entry.target.endsWith(`${path.sep}.oh-my-harness${path.sep}tree.md`)
      && entry.kind === "created"
    ));
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }

    if (previousUserProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = previousUserProfile;
    }
  }
});

test("performInit installs Claude project instructions and skills", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "oh-my-harness-claude-"));
  const targetRoot = path.join(tempRoot, "project");
  const fakeHome = path.join(tempRoot, "home");
  await mkdir(targetRoot, { recursive: true });
  await mkdir(fakeHome, { recursive: true });

  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = fakeHome;
  process.env.USERPROFILE = fakeHome;

  try {
    await performInit({
      targetRoot,
      force: false,
      global: false,
      dryRun: false,
      locale: "zh",
      cliTargets: ["claude"],
    });

    const claudeInstructions = await readFile(
      path.join(targetRoot, "CLAUDE.md"),
      "utf8",
    );
    assert.match(claudeInstructions, /# CLAUDE\.md/);
    assert.doesNotMatch(claudeInstructions, /^@AGENTS\.md\n$/);
    assert.doesNotMatch(claudeInstructions, /# AGENTS\.md/);
    await assert.rejects(
      stat(path.join(targetRoot, "AGENTS.md")),
      /ENOENT/,
    );
    await stat(path.join(targetRoot, ".claude", "skills", "harness", "SKILL.md"));
    await assert.rejects(
      stat(path.join(targetRoot, ".agents", "skills", "harness", "SKILL.md")),
      /ENOENT/,
    );
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }

    if (previousUserProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = previousUserProfile;
    }
  }
});

test("performInit lets Claude import AGENTS when another AGENTS-based CLI is selected", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "oh-my-harness-shared-"));
  const targetRoot = path.join(tempRoot, "project");
  const fakeHome = path.join(tempRoot, "home");
  await mkdir(targetRoot, { recursive: true });
  await mkdir(fakeHome, { recursive: true });

  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = fakeHome;
  process.env.USERPROFILE = fakeHome;

  try {
    await performInit({
      targetRoot,
      force: false,
      global: false,
      dryRun: false,
      locale: "zh",
      cliTargets: ["claude", "opencode"],
    });

    const agentsInstructions = await readFile(
      path.join(targetRoot, "AGENTS.md"),
      "utf8",
    );
    const claudeInstructions = await readFile(
      path.join(targetRoot, "CLAUDE.md"),
      "utf8",
    );
    assert.match(agentsInstructions, /# AGENTS\.md/);
    assert.equal(claudeInstructions, "@AGENTS.md\n");
    await stat(path.join(targetRoot, ".agents", "skills", "harness", "SKILL.md"));
    await stat(path.join(targetRoot, ".claude", "skills", "harness", "SKILL.md"));
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }

    if (previousUserProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = previousUserProfile;
    }
  }
});

test("performInit installs OpenCode project instructions without Codex config", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "oh-my-harness-opencode-"));
  const targetRoot = path.join(tempRoot, "project");
  const fakeHome = path.join(tempRoot, "home");
  await mkdir(targetRoot, { recursive: true });
  await mkdir(fakeHome, { recursive: true });

  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  process.env.HOME = fakeHome;
  process.env.USERPROFILE = fakeHome;

  try {
    await performInit({
      targetRoot,
      force: false,
      global: false,
      dryRun: false,
      locale: "zh",
      cliTargets: ["opencode"],
    });

    await stat(path.join(targetRoot, "AGENTS.md"));
    await stat(path.join(targetRoot, ".agents", "skills", "harness", "SKILL.md"));
    await assert.rejects(
      stat(path.join(fakeHome, ".codex", "config.toml")),
      /ENOENT/,
    );
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }

    if (previousUserProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = previousUserProfile;
    }
  }
});

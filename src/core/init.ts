import os from "node:os";
import path from "node:path";
import { promises as fs, type Dirent } from "node:fs";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

import {
  AGENTS_SOURCE_ROOT,
  CONFIG_TOML_SOURCE,
  GITIGNORE_BEGIN,
  GITIGNORE_END,
  SKILLS_SOURCE_ROOT,
  SOURCE_CODEX_HOME_PREFIX,
  TEMPLATE_REPO_ROOT,
} from "./runtime.js";
import { groupSummaryEntries, hasAgentsBackup, ORDERED_KINDS, summaryHeading } from "./summary.js";
import { formatText } from "./text.js";
import { bold, color } from "./terminal.js";
import type {
  ActionKind,
  InitOptions,
  Locale,
  ParsedArgs,
  SummaryEntry,
} from "./types.js";

export function resolveInitOptions(
  parsed: ParsedArgs,
  locale: Locale,
): InitOptions {
  const targetRoot = parsed.projectArg
    ? path.resolve(process.cwd(), parsed.projectArg)
    : process.cwd();

  return {
    force: parsed.force,
    global: parsed.global,
    dryRun: parsed.dryRun,
    targetRoot,
    locale,
  };
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(dirPath: string, dryRun = false): Promise<void> {
  if (dryRun) {
    return;
  }

  await fs.mkdir(dirPath, { recursive: true });
}

async function ensureTargetRoot(
  options: InitOptions,
  summary: SummaryEntry[],
): Promise<void> {
  const { targetRoot, dryRun } = options;
  const exists = await pathExists(targetRoot);

  if (!exists) {
    if (!dryRun) {
      await fs.mkdir(targetRoot, { recursive: true });
    }
    summary.push({
      kind: "created",
      target: targetRoot,
      detail: formatText(options.locale, "createTargetDir"),
    });
    return;
  }

  const stats = await fs.stat(targetRoot);
  if (!stats.isDirectory()) {
    throw new Error(
      `${formatText(options.locale, "targetNotDirectory")}: ${targetRoot}`,
    );
  }
}

async function patchAgentsFile(
  options: InitOptions,
  summary: SummaryEntry[],
): Promise<void> {
  const { targetRoot, dryRun } = options;
  const sourcePath = path.join(TEMPLATE_REPO_ROOT, "AGENTS.md");
  const targetPath = path.join(targetRoot, "AGENTS.md");
  const backupPath = path.join(targetRoot, "agents.back.md");
  const sourceContent = await fs.readFile(sourcePath, "utf8");
  const templateContent = sourceContent.endsWith("\n")
    ? sourceContent
    : `${sourceContent}\n`;

  if (!(await pathExists(targetPath))) {
    if (!dryRun) {
      await fs.writeFile(targetPath, templateContent, "utf8");
    }
    summary.push({
      kind: "created",
      target: targetPath,
      detail: formatText(options.locale, "writeAgentsTemplate"),
    });
    return;
  }

  const existing = await fs.readFile(targetPath, "utf8");
  const backupExists = await pathExists(backupPath);
  if (!dryRun) {
    await fs.writeFile(backupPath, existing, "utf8");
  }
  summary.push({
    kind: backupExists ? "replaced" : "created",
    target: backupPath,
    detail: backupExists
      ? formatText(options.locale, "replaceAgentsBackup")
      : formatText(options.locale, "createAgentsBackup"),
  });

  if (existing === templateContent) {
    summary.push({
      kind: "skipped",
      target: targetPath,
      detail: formatText(options.locale, "agentsAlreadyLatest"),
    });
    return;
  }

  if (!dryRun) {
    await fs.writeFile(targetPath, templateContent, "utf8");
  }
  summary.push({
    kind: "replaced",
    target: targetPath,
    detail: formatText(options.locale, "replaceAgentsTemplate"),
  });
}

function normalizeBlockContent(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}

function replaceOrAppendBlock(
  existingContent: string,
  beginMarker: string,
  endMarker: string,
  blockContent: string,
): { content: string; changed: boolean } {
  const normalizedBlock = normalizeBlockContent(blockContent);
  const existingBlockPattern = new RegExp(
    `${beginMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`,
    "m",
  );

  if (existingBlockPattern.test(existingContent)) {
    const next = existingContent.replace(existingBlockPattern, normalizedBlock);
    return { content: next, changed: next !== existingContent };
  }

  const trimmed = existingContent.trimEnd();
  const prefix = trimmed.length > 0 ? `${trimmed}\n\n` : "";
  const next = `${prefix}${normalizedBlock}`;
  return { content: next, changed: next !== existingContent };
}

async function patchGitignoreFile(
  options: InitOptions,
  summary: SummaryEntry[],
): Promise<void> {
  const { targetRoot, dryRun } = options;
  const sourcePath = path.join(TEMPLATE_REPO_ROOT, ".gitignore");
  const targetPath = path.join(targetRoot, ".gitignore");
  const sourceContent = normalizeBlockContent(
    await fs.readFile(sourcePath, "utf8"),
  );
  const exists = await pathExists(targetPath);
  const existingContent = exists ? await fs.readFile(targetPath, "utf8") : "";
  const result = replaceOrAppendBlock(
    existingContent,
    GITIGNORE_BEGIN,
    GITIGNORE_END,
    sourceContent,
  );

  if (!result.changed) {
    summary.push({
      kind: "skipped",
      target: targetPath,
      detail: formatText(options.locale, "gitignoreAlreadyLatest"),
    });
    return;
  }

  if (!dryRun) {
    await fs.writeFile(targetPath, result.content, "utf8");
  }
  summary.push({
    kind: exists ? "updated" : "created",
    target: targetPath,
    detail: exists
      ? formatText(options.locale, "updateGitignoreTemplate")
      : formatText(options.locale, "writeGitignoreTemplate"),
  });
}

async function listTemplateFiles(): Promise<string[]> {
  const collected: string[] = [];

  async function walk(dirPath: string): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    entries.sort((a: Dirent, b: Dirent) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const absolutePath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else if (entry.isFile()) {
        collected.push(absolutePath);
      }
    }
  }

  await walk(TEMPLATE_REPO_ROOT);
  return collected;
}

async function installProjectTemplates(
  options: InitOptions,
  summary: SummaryEntry[],
): Promise<void> {
  const templateFiles = await listTemplateFiles();

  for (const sourcePath of templateFiles) {
    const relativePath = path.relative(TEMPLATE_REPO_ROOT, sourcePath);
    if (relativePath === "AGENTS.md" || relativePath === ".gitignore") {
      continue;
    }

    const targetPath = path.join(options.targetRoot, relativePath);
    const exists = await pathExists(targetPath);

    if (exists && !options.force) {
      summary.push({
        kind: "skipped",
        target: targetPath,
        detail: formatText(options.locale, "targetFileExistsNoForce"),
      });
      continue;
    }

    await ensureDirectory(path.dirname(targetPath), options.dryRun);
    if (!options.dryRun) {
      await fs.copyFile(sourcePath, targetPath);
    }
    summary.push({
      kind: exists ? "replaced" : "created",
      target: targetPath,
      detail: exists
        ? formatText(options.locale, "replaceTemplateFile")
        : formatText(options.locale, "createTemplateFile"),
    });
  }

  await patchAgentsFile(options, summary);
  await patchGitignoreFile(options, summary);
}

async function listSkillNames(): Promise<string[]> {
  const entries = await fs.readdir(SKILLS_SOURCE_ROOT, { withFileTypes: true });
  return entries
    .filter((entry: Dirent) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry: Dirent) => entry.name)
    .sort((a: string, b: string) => a.localeCompare(b));
}

async function installSkills(
  options: InitOptions,
  summary: SummaryEntry[],
): Promise<void> {
  const skillsTargetRoot = options.global
    ? path.join(os.homedir(), ".agents", "skills")
    : path.join(options.targetRoot, ".agents", "skills");
  await ensureDirectory(skillsTargetRoot, options.dryRun);

  for (const skillName of await listSkillNames()) {
    const sourceDir = path.join(SKILLS_SOURCE_ROOT, skillName);
    const targetDir = path.join(skillsTargetRoot, skillName);
    const exists = await pathExists(targetDir);

    if (exists && !options.force) {
      summary.push({
        kind: "skipped",
        target: targetDir,
        detail: formatText(options.locale, "skillDirExistsNoForce"),
      });
      continue;
    }

    if (exists && !options.dryRun) {
      await fs.rm(targetDir, { recursive: true, force: true });
    }

    await ensureDirectory(path.dirname(targetDir), options.dryRun);
    if (!options.dryRun) {
      await fs.cp(sourceDir, targetDir, { recursive: true });
    }
    summary.push({
      kind: exists ? "replaced" : "created",
      target: targetDir,
      detail: options.global
        ? formatText(options.locale, "installGlobalSkill")
        : formatText(options.locale, "installProjectSkill"),
    });
  }
}

function deepRewriteCodexPaths<T>(value: T, targetCodexHome: string): T {
  if (typeof value === "string") {
    if (!value.startsWith(SOURCE_CODEX_HOME_PREFIX)) {
      return value;
    }

    const relativeParts = value
      .slice(SOURCE_CODEX_HOME_PREFIX.length)
      .split("/")
      .filter(Boolean);
    return path
      .resolve(targetCodexHome, ...relativeParts)
      .replaceAll(path.sep, "/") as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepRewriteCodexPaths(item, targetCodexHome)) as T;
  }

  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      next[key] = deepRewriteCodexPaths(nestedValue, targetCodexHome);
    }
    return next as T;
  }

  return value;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is not a TOML table object`);
  }
  return value as Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMergeObjects(
  existing: Record<string, unknown>,
  updated: Record<string, unknown>,
): Record<string, unknown> {
  const next = structuredClone(existing);

  for (const [key, updatedValue] of Object.entries(updated)) {
    const existingValue = next[key];
    if (isPlainObject(existingValue) && isPlainObject(updatedValue)) {
      next[key] = deepMergeObjects(existingValue, updatedValue);
      continue;
    }
    next[key] = updatedValue;
  }

  return next;
}

function stringifyTomlDocument(value: Record<string, unknown>): string {
  return `${stringifyToml(value).trim()}\n`;
}

function upsertAgentSections(
  existing: Record<string, unknown>,
  template: Record<string, unknown>,
  force: boolean,
  locale: Locale,
  summary: SummaryEntry[],
  targetConfigPath: string,
): Record<string, unknown> {
  const next = structuredClone(existing);
  const existingAgents = asRecord(next.agents ?? {}, "existing agents");
  const templateAgents = asRecord(template.agents ?? {}, "template agents");
  let changed = false;

  for (const [agentName, agentConfig] of Object.entries(templateAgents)) {
    const hasExisting = Object.prototype.hasOwnProperty.call(
      existingAgents,
      agentName,
    );

    if (hasExisting && !force) {
      summary.push({
        kind: "skipped",
        target: targetConfigPath,
        detail: formatText(locale, "globalConfigAgentExistsNoForce", agentName),
      });
      continue;
    }

    existingAgents[agentName] = agentConfig;
    changed = true;
    summary.push({
      kind: hasExisting ? "patched" : "created",
      target: targetConfigPath,
      detail: hasExisting
        ? formatText(locale, "updateGlobalConfigAgent", agentName)
        : formatText(locale, "createGlobalConfigAgent", agentName),
    });
  }

  if (changed) {
    next.agents = existingAgents;
  }

  return next;
}

async function patchCodexConfig(
  options: InitOptions,
  summary: SummaryEntry[],
): Promise<void> {
  const codexHome = path.join(os.homedir(), ".codex");
  const agentsHome = path.join(codexHome, "agents");
  const configPath = path.join(codexHome, "config.toml");
  await ensureDirectory(codexHome, options.dryRun);
  await ensureDirectory(agentsHome, options.dryRun);

  const sourceTemplate = await fs.readFile(CONFIG_TOML_SOURCE, "utf8");
  const parsedTemplate = deepRewriteCodexPaths(
    parseToml(sourceTemplate),
    codexHome,
  ) as Record<string, unknown>;

  const existingConfig = (await pathExists(configPath))
    ? await fs.readFile(configPath, "utf8")
    : "";
  const existingParsed = existingConfig.trim()
    ? (parseToml(existingConfig) as Record<string, unknown>)
    : {};

  const merged = upsertAgentSections(
    existingParsed,
    parsedTemplate,
    options.force,
    options.locale,
    summary,
    configPath,
  );

  if (JSON.stringify(merged) === JSON.stringify(existingParsed)) {
    if (!existingConfig.trim()) {
      const written = stringifyToml(merged).trim();
      if (written) {
        if (!options.dryRun) {
          await fs.writeFile(configPath, `${written}\n`, "utf8");
        }
        summary.push({
          kind: "created",
          target: configPath,
          detail: formatText(options.locale, "initGlobalCodexConfig"),
        });
      } else {
        summary.push({
          kind: "skipped",
          target: configPath,
          detail: formatText(options.locale, "noGlobalConfigChange"),
        });
      }
    }
  } else {
    const nextConfig = stringifyTomlDocument(merged);
    if (!options.dryRun) {
      await fs.writeFile(configPath, nextConfig, "utf8");
    }
  }
}

async function installAgentFiles(
  options: InitOptions,
  summary: SummaryEntry[],
): Promise<void> {
  const codexHome = path.join(os.homedir(), ".codex");
  const agentsHome = path.join(codexHome, "agents");
  await ensureDirectory(agentsHome, options.dryRun);

  const entries = await fs.readdir(AGENTS_SOURCE_ROOT, { withFileTypes: true });
  entries.sort((a: Dirent, b: Dirent) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const sourcePath = path.join(AGENTS_SOURCE_ROOT, entry.name);
    const targetPath = path.join(agentsHome, entry.name);
    const exists = await pathExists(targetPath);

    if (entry.name.endsWith(".md")) {
      if (exists && !options.force) {
        summary.push({
          kind: "skipped",
          target: targetPath,
          detail: formatText(options.locale, "agentMarkdownExistsNoForce"),
        });
        continue;
      }

      const content = await fs.readFile(sourcePath, "utf8");
      if (!options.dryRun) {
        await fs.writeFile(targetPath, content, "utf8");
      }
      summary.push({
        kind: exists ? "replaced" : "created",
        target: targetPath,
        detail: exists
          ? formatText(options.locale, "replaceAgentMarkdown")
          : formatText(options.locale, "createAgentMarkdown"),
      });
      continue;
    }

    const sourceText = await fs.readFile(sourcePath, "utf8");
    const templateObject = deepRewriteCodexPaths(parseToml(sourceText), codexHome);

    if (exists && !options.force) {
      summary.push({
        kind: "skipped",
        target: targetPath,
        detail: formatText(options.locale, "agentTomlExistsNoForce"),
      });
      continue;
    }

    let nextText: string;
    let actionKind: ActionKind;
    let detail: string;

    if (exists) {
      const existingText = await fs.readFile(targetPath, "utf8");
      const existingObject = parseToml(existingText) as Record<string, unknown>;
      const mergedObject = deepMergeObjects(
        existingObject,
        templateObject as Record<string, unknown>,
      );
      nextText = stringifyTomlDocument(mergedObject);
      actionKind = "patched";
      detail = formatText(options.locale, "patchAgentToml");
    } else {
      nextText = stringifyTomlDocument(templateObject as Record<string, unknown>);
      actionKind = "created";
      detail = formatText(options.locale, "createAgentToml");
    }

    if (!options.dryRun) {
      await fs.writeFile(targetPath, nextText, "utf8");
    }
    summary.push({ kind: actionKind, target: targetPath, detail });
  }
}

export async function performInit(options: InitOptions): Promise<SummaryEntry[]> {
  const summary: SummaryEntry[] = [];
  await ensureTargetRoot(options, summary);
  await installProjectTemplates(options, summary);
  await installSkills(options, summary);
  await patchCodexConfig(options, summary);
  await installAgentFiles(options, summary);
  return summary;
}

export function printSummary(options: InitOptions, summary: SummaryEntry[]): void {
  const groups = groupSummaryEntries(summary);
  const skillsTarget = options.global
    ? path.join(os.homedir(), ".agents", "skills")
    : path.join(options.targetRoot, ".agents", "skills");
  const globalConfig = path.join(os.homedir(), ".codex", "config.toml");

  console.log(`${color(formatText(options.locale, "initTarget"), "cyan")} ${options.targetRoot}`);
  console.log(
    `${color(formatText(options.locale, "mode"), "cyan")} ${
      options.dryRun
        ? color(formatText(options.locale, "modeDryRun"), "yellow")
        : color(formatText(options.locale, "modeApply"), "green")
    }`,
  );
  console.log(
    `${color(formatText(options.locale, "skillsTarget"), "cyan")} ${skillsTarget}`,
  );
  console.log(
    `${color(formatText(options.locale, "globalConfig"), "cyan")} ${globalConfig}`,
  );

  for (const kind of ORDERED_KINDS) {
    const entries = groups.get(kind)!;
    if (entries.length === 0) {
      continue;
    }

    const title =
      kind === "created"
        ? color(summaryHeading(options.locale, kind), "green")
        : kind === "updated"
          ? color(summaryHeading(options.locale, kind), "blue")
          : kind === "replaced"
            ? color(summaryHeading(options.locale, kind), "magenta")
            : kind === "patched"
              ? color(summaryHeading(options.locale, kind), "yellow")
              : color(summaryHeading(options.locale, kind), "gray");

    console.log(`\n${bold(`${title}:`)}`);
    for (const entry of entries) {
      const detail = entry.detail
        ? ` ${color(`(${entry.detail})`, "dim")}`
        : "";
      console.log(`- ${entry.target}${detail}`);
    }
  }

  if (hasAgentsBackup(summary)) {
    console.log(
      `\n${color(formatText(options.locale, "migrationPromptLabel"), "cyan")} ${color(formatText(options.locale, "migrationPrompt"), "yellow")}`,
    );
  }
}

export async function runInit(options: InitOptions): Promise<void> {
  const summary = await performInit(options);
  printSummary(options, summary);
}

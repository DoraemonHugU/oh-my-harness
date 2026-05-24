#!/usr/bin/env node

import { promises as fs, type Dirent } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const TEMPLATE_REPO_ROOT = path.join(PACKAGE_ROOT, "templates", "repo");
const SKILLS_SOURCE_ROOT = path.join(PACKAGE_ROOT, "plugin", "skills");
const CONFIG_TOML_SOURCE = path.join(PACKAGE_ROOT, "config.toml");
const AGENTS_SOURCE_ROOT = path.join(PACKAGE_ROOT, "agents");
const AGENTS_BEGIN = "<!-- oh-my-harness:begin -->";
const AGENTS_END = "<!-- oh-my-harness:end -->";
const SOURCE_CODEX_HOME_PREFIX = "__OH_MY_HARNESS_CODEX_HOME__/";

type ActionKind =
  | "created"
  | "updated"
  | "replaced"
  | "patched"
  | "skipped";

type SummaryEntry = {
  kind: ActionKind;
  target: string;
  detail?: string;
};

type InitOptions = {
  force: boolean;
  global: boolean;
  dryRun: boolean;
  targetRoot: string;
  projectName: string;
};

type ParsedArgs = {
  command: string | null;
  projectArg: string | null;
  force: boolean;
  global: boolean;
  dryRun: boolean;
  help: boolean;
};

function printUsage(): void {
  console.log("Usage: npx oh-my-harness init [projectName] [--force] [--global] [--dry-run]");
}

function parseArgs(argv: string[]): ParsedArgs {
  let command: string | null = null;
  let projectArg: string | null = null;
  let force = false;
  let global = false;
  let dryRun = false;
  let help = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h" || arg === "help") {
      help = true;
      continue;
    }

    if (!command && !arg.startsWith("-")) {
      command = arg;
      continue;
    }

    if (arg === "--force" || arg === "-f") {
      force = true;
      continue;
    }

    if (arg === "--global" || arg === "-g") {
      global = true;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (!projectArg && !arg.startsWith("-")) {
      projectArg = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { command, projectArg, force, global, dryRun, help };
}

function resolveInitOptions(parsed: ParsedArgs): InitOptions {
  const targetRoot = parsed.projectArg
    ? path.resolve(process.cwd(), parsed.projectArg)
    : process.cwd();
  const projectName =
    path.basename(targetRoot) || path.basename(process.cwd()) || "project";

  return {
    force: parsed.force,
    global: parsed.global,
    dryRun: parsed.dryRun,
    targetRoot,
    projectName,
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

async function ensureTargetRoot(options: InitOptions, summary: SummaryEntry[]): Promise<void> {
  const { targetRoot, dryRun } = options;
  const exists = await pathExists(targetRoot);
  if (!exists) {
    if (!dryRun) {
      await fs.mkdir(targetRoot, { recursive: true });
    }
    summary.push({ kind: "created", target: targetRoot, detail: "创建目标项目目录" });
    return;
  }

  const stats = await fs.stat(targetRoot);
  if (!stats.isDirectory()) {
    throw new Error(`Target path is not a directory: ${targetRoot}`);
  }
}

function extractAgentsBlock(content: string): string {
  const escapedBegin = AGENTS_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = AGENTS_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockPattern = new RegExp(`${escapedBegin}[\\s\\S]*?${escapedEnd}\\n?`, "m");
  const matched = content.match(blockPattern);
  if (!matched) {
    throw new Error("templates/repo/AGENTS.md 缺少 oh-my-harness marker block");
  }
  return matched[0].endsWith("\n") ? matched[0] : `${matched[0]}\n`;
}

async function patchAgentsFile(options: InitOptions, summary: SummaryEntry[]): Promise<void> {
  const { targetRoot, dryRun } = options;
  const sourcePath = path.join(TEMPLATE_REPO_ROOT, "AGENTS.md");
  const targetPath = path.join(targetRoot, "AGENTS.md");
  const sourceContent = await fs.readFile(sourcePath, "utf8");
  const block = extractAgentsBlock(sourceContent);

  if (!(await pathExists(targetPath))) {
    if (!dryRun) {
      await fs.writeFile(targetPath, block, "utf8");
    }
    summary.push({ kind: "created", target: targetPath, detail: "新增 oh-my-harness AGENTS block" });
    return;
  }

  const existing = await fs.readFile(targetPath, "utf8");
  const escapedBegin = AGENTS_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = AGENTS_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockPattern = new RegExp(`${escapedBegin}[\\s\\S]*?${escapedEnd}\\n?`, "m");

  if (blockPattern.test(existing)) {
    const next = existing.replace(blockPattern, block);
    if (next !== existing) {
      if (!dryRun) {
        await fs.writeFile(targetPath, next, "utf8");
      }
      summary.push({ kind: "updated", target: targetPath, detail: "替换现有 oh-my-harness AGENTS block" });
    } else {
      summary.push({ kind: "skipped", target: targetPath, detail: "AGENTS block 已是最新" });
    }
    return;
  }

  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  if (!dryRun) {
    await fs.writeFile(targetPath, `${existing}${separator}${block}`, "utf8");
  }
  summary.push({ kind: "updated", target: targetPath, detail: "追加 oh-my-harness AGENTS block" });
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
    if (relativePath === "AGENTS.md") {
      continue;
    }

    const targetPath = path.join(options.targetRoot, relativePath);
    const exists = await pathExists(targetPath);

    if (exists && !options.force) {
      summary.push({ kind: "skipped", target: targetPath, detail: "目标文件已存在，未使用 --force" });
      continue;
    }

    await ensureDirectory(path.dirname(targetPath), options.dryRun);
    if (!options.dryRun) {
      await fs.copyFile(sourcePath, targetPath);
    }
    summary.push({
      kind: exists ? "replaced" : "created",
      target: targetPath,
      detail: exists ? "按文件覆盖模板" : "写入模板文件",
    });
  }

  await patchAgentsFile(options, summary);
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
      summary.push({ kind: "skipped", target: targetDir, detail: "skill 目录已存在，未使用 --force" });
      continue;
    }

    if (exists) {
      if (!options.dryRun) {
        await fs.rm(targetDir, { recursive: true, force: true });
      }
    }

    await ensureDirectory(path.dirname(targetDir), options.dryRun);
    if (!options.dryRun) {
      await fs.cp(sourceDir, targetDir, { recursive: true });
    }
    summary.push({
      kind: exists ? "replaced" : "created",
      target: targetDir,
      detail: options.global ? "安装全局 skill" : "安装项目级 skill",
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
    return path.resolve(targetCodexHome, ...relativeParts) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepRewriteCodexPaths(item, targetCodexHome)) as T;
  }

  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
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
  summary: SummaryEntry[],
  targetConfigPath: string,
): Record<string, unknown> {
  const next = structuredClone(existing);
  const existingAgents = asRecord(next.agents ?? {}, "existing agents");
  const templateAgents = asRecord(template.agents ?? {}, "template agents");

  let changed = false;

  for (const [agentName, agentConfig] of Object.entries(templateAgents)) {
    const hasExisting = Object.prototype.hasOwnProperty.call(existingAgents, agentName);

    if (hasExisting && !force) {
      summary.push({
        kind: "skipped",
        target: targetConfigPath,
        detail: `全局 config 已存在 agents.${agentName}，未使用 --force`,
      });
      continue;
    }

    existingAgents[agentName] = agentConfig;
    changed = true;
    summary.push({
      kind: hasExisting ? "patched" : "created",
      target: targetConfigPath,
      detail: hasExisting ? `更新全局 config 的 agents.${agentName}` : `新增全局 config 的 agents.${agentName}`,
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
        summary.push({ kind: "created", target: configPath, detail: "初始化全局 codex config" });
      } else {
        summary.push({ kind: "skipped", target: configPath, detail: "无全局 config 变更" });
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
        summary.push({ kind: "skipped", target: targetPath, detail: "agent markdown 已存在，未使用 --force" });
        continue;
      }

      const content = await fs.readFile(sourcePath, "utf8");
      if (!options.dryRun) {
        await fs.writeFile(targetPath, content, "utf8");
      }
      summary.push({
        kind: exists ? "replaced" : "created",
        target: targetPath,
        detail: exists ? "覆盖 agent markdown" : "写入 agent markdown",
      });
      continue;
    }

    const sourceText = await fs.readFile(sourcePath, "utf8");
    const templateObject = deepRewriteCodexPaths(
      parseToml(sourceText),
      codexHome,
    );

    if (exists && !options.force) {
      summary.push({ kind: "skipped", target: targetPath, detail: "agent TOML 已存在，未使用 --force" });
      continue;
    }

    let nextText: string;
    let actionKind: ActionKind;
    let detail: string;

    if (exists) {
      const existingText = await fs.readFile(targetPath, "utf8");
      const existingObject = parseToml(existingText) as Record<string, unknown>;
      const mergedObject = deepMergeObjects(existingObject, templateObject as Record<string, unknown>);
      nextText = stringifyTomlDocument(mergedObject);
      actionKind = "patched";
      detail = "patch 覆盖 agent TOML";
    } else {
      nextText = stringifyTomlDocument(templateObject as Record<string, unknown>);
      actionKind = "created";
      detail = "写入 agent TOML";
    }

    if (!options.dryRun) {
      await fs.writeFile(targetPath, nextText, "utf8");
    }
    summary.push({ kind: actionKind, target: targetPath, detail });
  }
}

function printSummary(options: InitOptions, summary: SummaryEntry[]): void {
  const orderedKinds: ActionKind[] = [
    "created",
    "updated",
    "replaced",
    "patched",
    "skipped",
  ];
  const groups = new Map<ActionKind, SummaryEntry[]>();

  for (const kind of orderedKinds) {
    groups.set(kind, []);
  }
  for (const entry of summary) {
    groups.get(entry.kind)!.push(entry);
  }

  console.log(`init target: ${options.targetRoot}`);
  console.log(`mode: ${options.dryRun ? "dry-run" : "apply"}`);
  console.log(`skills target: ${options.global ? path.join(os.homedir(), ".agents", "skills") : path.join(options.targetRoot, ".agents", "skills")}`);
  console.log(`global config: ${path.join(os.homedir(), ".codex", "config.toml")}`);

  for (const kind of orderedKinds) {
    const entries = groups.get(kind)!;
    if (entries.length === 0) {
      continue;
    }

    console.log(`\n${kind}:`);
    for (const entry of entries) {
      console.log(`- ${entry.target}${entry.detail ? ` (${entry.detail})` : ""}`);
    }
  }
}

async function runInit(options: InitOptions): Promise<void> {
  const summary: SummaryEntry[] = [];
  await ensureTargetRoot(options, summary);
  await installProjectTemplates(options, summary);
  await installSkills(options, summary);
  await patchCodexConfig(options, summary);
  await installAgentFiles(options, summary);
  printSummary(options, summary);
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help || !parsed.command) {
    printUsage();
    return;
  }

  if (parsed.command !== "init") {
    throw new Error(`Unknown command: ${parsed.command}`);
  }

  const options = resolveInitOptions(parsed);
  await runInit(options);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

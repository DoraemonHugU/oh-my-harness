#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { promises as fs, type Dirent } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON_PATH = path.join(PACKAGE_ROOT, "package.json");
const TEMPLATE_REPO_ROOT = path.join(PACKAGE_ROOT, "templates", "repo");
const SKILLS_SOURCE_ROOT = path.join(PACKAGE_ROOT, "plugin", "skills");
const CONFIG_TOML_SOURCE = path.join(PACKAGE_ROOT, "config.toml");
const AGENTS_SOURCE_ROOT = path.join(PACKAGE_ROOT, "agents");
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

type Locale = "zh" | "en";

type InitOptions = {
  force: boolean;
  global: boolean;
  dryRun: boolean;
  targetRoot: string;
  projectName: string;
  locale: Locale;
};

type ParsedArgs = {
  command: string | null;
  projectArg: string | null;
  force: boolean;
  global: boolean;
  dryRun: boolean;
  help: boolean;
  version: boolean;
  lang: Locale | null;
};

const TEXT = {
  zh: {
    usage: "用法：",
    commands: "命令：",
    options: "参数：",
    initDesc: "初始化当前目录或指定项目目录",
    helpDesc: "显示帮助",
    helpFlag: "显示帮助",
    versionFlag: "显示版本",
    forceFlag: "覆盖同名模板、skill 和全局 agent/config 条目",
    globalFlag: "将 skills 安装到用户目录下的 .agents/skills/",
    dryRunFlag: "只预演，不落盘",
    langFlag: "输出语言：zh | en",
    unknownArg: "未知参数",
    missingLang: "缺少语言参数",
    unknownCommand: "未知命令",
    targetNotDirectory: "目标路径不是目录",
    initTarget: "目标目录:",
    mode: "模式:",
    modeDryRun: "预演",
    modeApply: "应用",
    skillsTarget: "skills 目录:",
    globalConfig: "全局配置:",
    created: "创建",
    updated: "更新",
    replaced: "覆盖",
    patched: "补丁",
    skipped: "跳过",
    createTargetDir: "创建目标项目目录",
    writeAgentsTemplate: "写入 AGENTS.md 模板",
    replaceAgentsBackup: "覆盖现有 AGENTS.md 备份文件",
    createAgentsBackup: "备份现有 AGENTS.md 到 agents.back.md",
    agentsAlreadyLatest: "AGENTS.md 已是最新模板",
    replaceAgentsTemplate: "直接覆盖 AGENTS.md 模板",
    targetFileExistsNoForce: "目标文件已存在，未使用 --force",
    replaceTemplateFile: "按文件覆盖模板",
    createTemplateFile: "写入模板文件",
    skillDirExistsNoForce: "skill 目录已存在，未使用 --force",
    installGlobalSkill: "安装全局 skill",
    installProjectSkill: "安装项目级 skill",
    globalConfigAgentExistsNoForce: "全局 config 已存在 agents.%s，未使用 --force",
    updateGlobalConfigAgent: "更新全局 config 的 agents.%s",
    createGlobalConfigAgent: "新增全局 config 的 agents.%s",
    initGlobalCodexConfig: "初始化全局 codex config",
    noGlobalConfigChange: "无全局 config 变更",
    agentMarkdownExistsNoForce: "agent markdown 已存在，未使用 --force",
    replaceAgentMarkdown: "覆盖 agent markdown",
    createAgentMarkdown: "写入 agent markdown",
    agentTomlExistsNoForce: "agent TOML 已存在，未使用 --force",
    patchAgentToml: "patch 覆盖 agent TOML",
    createAgentToml: "写入 agent TOML",
    migrationPromptLabel: "后续提示:",
    migrationPrompt:
      "请对比 `AGENTS.md` 与 `agents.back.md`，只迁移仍有价值的项目级规则到新的 `AGENTS.md`，然后清理 `agents.back.md`。",
  },
  en: {
    usage: "Usage:",
    commands: "Commands:",
    options: "Options:",
    initDesc: "Initialize the current directory or a target project directory",
    helpDesc: "Show help",
    helpFlag: "Show help",
    versionFlag: "Show version",
    forceFlag: "Overwrite same-name templates, skills, and global agent/config entries",
    globalFlag: "Install skills into the user's .agents/skills/ directory",
    dryRunFlag: "Preview only; do not write files",
    langFlag: "Output language: zh | en",
    unknownArg: "Unknown argument",
    missingLang: "Missing language argument",
    unknownCommand: "Unknown command",
    targetNotDirectory: "Target path is not a directory",
    initTarget: "init target:",
    mode: "mode:",
    modeDryRun: "dry-run",
    modeApply: "apply",
    skillsTarget: "skills target:",
    globalConfig: "global config:",
    created: "created",
    updated: "updated",
    replaced: "replaced",
    patched: "patched",
    skipped: "skipped",
    createTargetDir: "create target project directory",
    writeAgentsTemplate: "write AGENTS.md template",
    replaceAgentsBackup: "replace existing AGENTS.md backup file",
    createAgentsBackup: "backup existing AGENTS.md to agents.back.md",
    agentsAlreadyLatest: "AGENTS.md is already up to date",
    replaceAgentsTemplate: "replace AGENTS.md directly",
    targetFileExistsNoForce: "target file already exists; --force not set",
    replaceTemplateFile: "replace template file",
    createTemplateFile: "write template file",
    skillDirExistsNoForce: "skill directory already exists; --force not set",
    installGlobalSkill: "install global skill",
    installProjectSkill: "install project skill",
    globalConfigAgentExistsNoForce: "global config already has agents.%s; --force not set",
    updateGlobalConfigAgent: "update global config agents.%s",
    createGlobalConfigAgent: "create global config agents.%s",
    initGlobalCodexConfig: "initialize global codex config",
    noGlobalConfigChange: "no global config changes",
    agentMarkdownExistsNoForce: "agent markdown already exists; --force not set",
    replaceAgentMarkdown: "replace agent markdown",
    createAgentMarkdown: "write agent markdown",
    agentTomlExistsNoForce: "agent TOML already exists; --force not set",
    patchAgentToml: "patch agent TOML",
    createAgentToml: "write agent TOML",
    migrationPromptLabel: "next step:",
    migrationPrompt:
      "Compare `AGENTS.md` with `agents.back.md`, migrate only still-useful project-level rules into the new `AGENTS.md`, then remove `agents.back.md`.",
  },
} as const;

function formatText(locale: Locale, key: keyof typeof TEXT.zh, ...args: string[]): string {
  let value: string = TEXT[locale][key];
  for (const arg of args) {
    value = value.replace("%s", arg);
  }
  return value;
}

function terminalSupportsUtf8(): boolean {
  const localeHints = [
    process.env.LC_ALL,
    process.env.LC_CTYPE,
    process.env.LANG,
    process.env.TERM,
    process.env.WT_SESSION ? "WT_SESSION" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (/utf-?8/i.test(localeHints)) {
    return true;
  }

  if (localeHints.trim()) {
    return false;
  }

  return true;
}

function detectWindowsCodePage(): string | null {
  if (process.platform !== "win32") {
    return null;
  }

  try {
    const output = execFileSync("cmd.exe", ["/d", "/s", "/c", "chcp"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    const match = output.match(/(\d{3,5})/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function prefersChineseOutput(): boolean {
  const localeHints = [
    process.env.LC_ALL,
    process.env.LC_CTYPE,
    process.env.LANG,
    Intl.DateTimeFormat().resolvedOptions().locale,
  ]
    .filter(Boolean)
    .join(" ");

  if (/\bzh\b|zh[-_](CN|SG|Hans)/i.test(localeHints)) {
    return true;
  }

  const windowsCodePage = detectWindowsCodePage();
  if (windowsCodePage && ["936", "20936", "54936", "65001"].includes(windowsCodePage)) {
    return true;
  }

  return false;
}

function resolveLocale(parsedLang: Locale | null): Locale {
  if (parsedLang) {
    return parsedLang;
  }

  if (terminalSupportsUtf8()) {
    return "zh";
  }

  return prefersChineseOutput() ? "zh" : "en";
}

function printUsage(locale: Locale): void {
  console.log(formatText(locale, "usage"));
  console.log("  npx @doraemon-hug-u/oh-my-harness <command> [options]");
  console.log("  oh-my-harness <command> [options]");
  console.log("");
  console.log(formatText(locale, "commands"));
  console.log(`  init [projectName]       ${formatText(locale, "initDesc")}`);
  console.log(`  help                     ${formatText(locale, "helpDesc")}`);
  console.log("");
  console.log(formatText(locale, "options"));
  console.log(`  -h, --help               ${formatText(locale, "helpFlag")}`);
  console.log(`  -v, --version            ${formatText(locale, "versionFlag")}`);
  console.log(`  -f, --force              ${formatText(locale, "forceFlag")}`);
  console.log(`  -g, --global             ${formatText(locale, "globalFlag")}`);
  console.log(`      --dry-run            ${formatText(locale, "dryRunFlag")}`);
  console.log(`      --lang <zh|en>       ${formatText(locale, "langFlag")}`);
}

async function printVersion(): Promise<void> {
  const packageJson = JSON.parse(await fs.readFile(PACKAGE_JSON_PATH, "utf8")) as { version?: string };
  console.log(packageJson.version ?? "unknown");
}

const ANSI = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  blue: "\u001b[34m",
  magenta: "\u001b[35m",
  cyan: "\u001b[36m",
  gray: "\u001b[90m",
};

function useColor(): boolean {
  if (!process.stdout.isTTY || process.env.NO_COLOR) {
    return false;
  }

  if (process.env.FORCE_COLOR) {
    return true;
  }

  if (process.platform !== "win32") {
    return true;
  }

  return Boolean(
    process.env.WT_SESSION
    || process.env.ANSICON
    || process.env.ConEmuANSI === "ON"
    || process.env.TERM_PROGRAM
    || /xterm|ansi|color|cygwin|msys/i.test(process.env.TERM ?? ""),
  );
}

function color(text: string, tone: keyof typeof ANSI): string {
  if (!useColor()) {
    return text;
  }
  return `${ANSI[tone]}${text}${ANSI.reset}`;
}

function parseArgs(argv: string[]): ParsedArgs {
  let command: string | null = null;
  let projectArg: string | null = null;
  let force = false;
  let global = false;
  let dryRun = false;
  let help = false;
  let version = false;
  let lang: Locale | null = null;
  const defaultLocale = resolveLocale(null);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "--help" || arg === "-h" || arg === "help") {
      help = true;
      continue;
    }

    if (arg === "--version" || arg === "-v" || arg === "version") {
      version = true;
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

    if (arg === "--lang") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(formatText(lang ?? defaultLocale, "missingLang"));
      }
      if (value !== "zh" && value !== "en") {
        throw new Error(`${formatText(lang ?? defaultLocale, "unknownArg")}: ${value}`);
      }
      lang = value;
      index += 1;
      continue;
    }

    if (!projectArg && !arg.startsWith("-")) {
      projectArg = arg;
      continue;
    }

    throw new Error(`${formatText(lang ?? defaultLocale, "unknownArg")}: ${arg}`);
  }

  return { command, projectArg, force, global, dryRun, help, version, lang };
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
    locale: resolveLocale(parsed.lang),
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
    summary.push({ kind: "created", target: targetRoot, detail: formatText(options.locale, "createTargetDir") });
    return;
  }

  const stats = await fs.stat(targetRoot);
  if (!stats.isDirectory()) {
    throw new Error(`${formatText(options.locale, "targetNotDirectory")}: ${targetRoot}`);
  }
}

async function patchAgentsFile(options: InitOptions, summary: SummaryEntry[]): Promise<void> {
  const { targetRoot, dryRun } = options;
  const sourcePath = path.join(TEMPLATE_REPO_ROOT, "AGENTS.md");
  const targetPath = path.join(targetRoot, "AGENTS.md");
  const backupPath = path.join(targetRoot, "agents.back.md");
  const sourceContent = await fs.readFile(sourcePath, "utf8");
  const templateContent = sourceContent.endsWith("\n") ? sourceContent : `${sourceContent}\n`;

  if (!(await pathExists(targetPath))) {
    if (!dryRun) {
      await fs.writeFile(targetPath, templateContent, "utf8");
    }
    summary.push({ kind: "created", target: targetPath, detail: formatText(options.locale, "writeAgentsTemplate") });
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
    summary.push({ kind: "skipped", target: targetPath, detail: formatText(options.locale, "agentsAlreadyLatest") });
    return;
  }

  if (!dryRun) {
    await fs.writeFile(targetPath, templateContent, "utf8");
  }
  summary.push({ kind: "replaced", target: targetPath, detail: formatText(options.locale, "replaceAgentsTemplate") });
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
      summary.push({ kind: "skipped", target: targetPath, detail: formatText(options.locale, "targetFileExistsNoForce") });
      continue;
    }

    await ensureDirectory(path.dirname(targetPath), options.dryRun);
    if (!options.dryRun) {
      await fs.copyFile(sourcePath, targetPath);
    }
    summary.push({
      kind: exists ? "replaced" : "created",
      target: targetPath,
      detail: exists ? formatText(options.locale, "replaceTemplateFile") : formatText(options.locale, "createTemplateFile"),
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
      summary.push({ kind: "skipped", target: targetDir, detail: formatText(options.locale, "skillDirExistsNoForce") });
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
    return path.resolve(targetCodexHome, ...relativeParts).replaceAll(path.sep, "/") as T;
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
  locale: Locale,
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
        summary.push({ kind: "created", target: configPath, detail: formatText(options.locale, "initGlobalCodexConfig") });
      } else {
        summary.push({ kind: "skipped", target: configPath, detail: formatText(options.locale, "noGlobalConfigChange") });
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
        summary.push({ kind: "skipped", target: targetPath, detail: formatText(options.locale, "agentMarkdownExistsNoForce") });
        continue;
      }

      const content = await fs.readFile(sourcePath, "utf8");
      if (!options.dryRun) {
        await fs.writeFile(targetPath, content, "utf8");
      }
      summary.push({
        kind: exists ? "replaced" : "created",
        target: targetPath,
        detail: exists ? formatText(options.locale, "replaceAgentMarkdown") : formatText(options.locale, "createAgentMarkdown"),
      });
      continue;
    }

    const sourceText = await fs.readFile(sourcePath, "utf8");
    const templateObject = deepRewriteCodexPaths(
      parseToml(sourceText),
      codexHome,
    );

    if (exists && !options.force) {
      summary.push({ kind: "skipped", target: targetPath, detail: formatText(options.locale, "agentTomlExistsNoForce") });
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

function printSummary(options: InitOptions, summary: SummaryEntry[]): void {
  const { locale } = options;
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

  console.log(`${color(formatText(locale, "initTarget"), "cyan")} ${options.targetRoot}`);
  console.log(
    `${color(formatText(locale, "mode"), "cyan")} ${
      options.dryRun ? color(formatText(locale, "modeDryRun"), "yellow") : color(formatText(locale, "modeApply"), "green")
    }`,
  );
  console.log(
    `${color(formatText(locale, "skillsTarget"), "cyan")} ${
      options.global ? path.join(os.homedir(), ".agents", "skills") : path.join(options.targetRoot, ".agents", "skills")
    }`,
  );
  console.log(`${color(formatText(locale, "globalConfig"), "cyan")} ${path.join(os.homedir(), ".codex", "config.toml")}`);

  for (const kind of orderedKinds) {
    const entries = groups.get(kind)!;
    if (entries.length === 0) {
      continue;
    }

    const title =
      kind === "created" ? color(formatText(locale, "created"), "green")
      : kind === "updated" ? color(formatText(locale, "updated"), "blue")
      : kind === "replaced" ? color(formatText(locale, "replaced"), "magenta")
      : kind === "patched" ? color(formatText(locale, "patched"), "yellow")
      : color(formatText(locale, "skipped"), "gray");
    const boldStart = useColor() ? ANSI.bold : "";
    const boldEnd = useColor() ? ANSI.reset : "";
    console.log(`\n${boldStart}${title}:${boldEnd}`);
    for (const entry of entries) {
      const detail = entry.detail ? ` ${color(`(${entry.detail})`, "dim")}` : "";
      console.log(`- ${entry.target}${detail}`);
    }
  }

  const hasAgentsBackup = summary.some((entry) => entry.target.endsWith(`${path.sep}agents.back.md`));
  if (hasAgentsBackup) {
    console.log(
      `\n${color(formatText(locale, "migrationPromptLabel"), "cyan")} ${color(formatText(locale, "migrationPrompt"), "yellow")}`,
    );
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
  const locale = resolveLocale(parsed.lang);
  if (parsed.version) {
    await printVersion();
    return;
  }

  if (parsed.help || !parsed.command) {
    printUsage(locale);
    return;
  }

  if (parsed.command !== "init") {
    throw new Error(`${formatText(locale, "unknownCommand")}: ${parsed.command}`);
  }

  const options = resolveInitOptions(parsed);
  await runInit(options);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

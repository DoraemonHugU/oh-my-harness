import { formatText } from "./text.js";
import { resolveLocale } from "./terminal.js";
import type { Locale, ParsedArgs } from "./types.js";

export function parseArgs(argv: string[]): ParsedArgs {
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
        throw new Error(
          `${formatText(lang ?? defaultLocale, "unknownArg")}: ${value}`,
        );
      }
      lang = value;
      index += 1;
      continue;
    }

    if (!projectArg && !arg.startsWith("-")) {
      projectArg = arg;
      continue;
    }

    throw new Error(
      `${formatText(lang ?? defaultLocale, "unknownArg")}: ${arg}`,
    );
  }

  return {
    command,
    projectArg,
    force,
    global,
    dryRun,
    help,
    version,
    lang,
  };
}

export function printUsage(locale: Locale): void {
  console.log(formatText(locale, "usage"));
  console.log("  npx @doraemon-hug-u/oh-my-harness [command] [options]");
  console.log("  oh-my-harness [command] [options]");
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
  console.log("");
  console.log(formatText(locale, "notes"));
  console.log(`  - ${formatText(locale, "tuiNote")}`);
  console.log(`  - ${formatText(locale, "seedNote")}`);
}

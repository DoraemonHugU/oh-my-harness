#!/usr/bin/env node

import { parseArgs, printUsage } from "./core/args.js";
import { resolveInitOptions, runInit } from "./core/init.js";
import { readPackageVersion } from "./core/runtime.js";
import { formatText } from "./core/text.js";
import { isInteractiveTerminal, resolveLocale } from "./core/terminal.js";
import { runInitWizard } from "./ui/init-wizard.js";

async function printVersion(): Promise<void> {
  console.log(await readPackageVersion());
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const locale = resolveLocale(parsed.lang);

  if (parsed.version) {
    await printVersion();
    return;
  }

  if (parsed.help) {
    printUsage(locale);
    return;
  }

  if (parsed.command && parsed.command !== "init") {
    throw new Error(`${formatText(locale, "unknownCommand")}: ${parsed.command}`);
  }

  const hasStandaloneOptions =
    parsed.force || parsed.global || parsed.dryRun || parsed.lang !== null;
  const interactive = isInteractiveTerminal();

  if (!parsed.command) {
    if (interactive) {
      const options = resolveInitOptions({ ...parsed, command: "init" }, locale);
      await runInitWizard(options);
      return;
    }

    if (hasStandaloneOptions) {
      console.error(`${formatText(locale, "missingCommand")}: init`);
      console.error(formatText(locale, "initHint"));
      console.error("");
      printUsage(locale);
      process.exitCode = 1;
      return;
    }

    printUsage(locale);
    return;
  }

  const options = resolveInitOptions(parsed, locale);
  if (interactive) {
    await runInitWizard(options);
    return;
  }

  await runInit(options);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

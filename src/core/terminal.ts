import { execFileSync } from "node:child_process";

import type { Locale } from "./types.js";

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

export function terminalSupportsUtf8(): boolean {
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
  if (
    windowsCodePage
    && ["936", "20936", "54936", "65001"].includes(windowsCodePage)
  ) {
    return true;
  }

  return false;
}

export function resolveLocale(parsedLang: Locale | null): Locale {
  if (parsedLang) {
    return parsedLang;
  }

  if (terminalSupportsUtf8()) {
    return "zh";
  }

  return prefersChineseOutput() ? "zh" : "en";
}

export function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export function useColor(): boolean {
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

export function color(text: string, tone: keyof typeof ANSI): string {
  if (!useColor()) {
    return text;
  }
  return `${ANSI[tone]}${text}${ANSI.reset}`;
}

export function bold(text: string): string {
  if (!useColor()) {
    return text;
  }
  return `${ANSI.bold}${text}${ANSI.reset}`;
}

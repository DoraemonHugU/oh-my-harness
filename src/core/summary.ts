import path from "node:path";

import { formatText } from "./text.js";
import type { ActionKind, Locale, SummaryEntry } from "./types.js";

export const ORDERED_KINDS: ActionKind[] = [
  "created",
  "updated",
  "replaced",
  "patched",
  "skipped",
];

export function groupSummaryEntries(
  summary: SummaryEntry[],
): Map<ActionKind, SummaryEntry[]> {
  const groups = new Map<ActionKind, SummaryEntry[]>();

  for (const kind of ORDERED_KINDS) {
    groups.set(kind, []);
  }

  for (const entry of summary) {
    groups.get(entry.kind)!.push(entry);
  }

  return groups;
}

export function hasAgentsBackup(summary: SummaryEntry[]): boolean {
  return summary.some((entry) =>
    entry.target.endsWith(`${path.sep}agents.back.md`)
    || entry.target.endsWith(`${path.sep}claude.back.md`),
  );
}

export function summaryHeading(locale: Locale, kind: ActionKind): string {
  if (kind === "created") {
    return formatText(locale, "created");
  }
  if (kind === "updated") {
    return formatText(locale, "updated");
  }
  if (kind === "replaced") {
    return formatText(locale, "replaced");
  }
  if (kind === "patched") {
    return formatText(locale, "patched");
  }
  return formatText(locale, "skipped");
}

import { ORDERED_KINDS, groupSummaryEntries, summaryHeading } from "../core/summary.js";
import type { ActionKind, Locale, SummaryEntry } from "../core/types.js";

export type PreviewSection = {
  kind: ActionKind;
  heading: string;
  entries: SummaryEntry[];
  remainingCount: number;
};

export function buildPreviewSections(
  summary: SummaryEntry[],
  locale: Locale,
  limitPerKind = 4,
): PreviewSection[] {
  const groups = groupSummaryEntries(summary);
  const sections: PreviewSection[] = [];

  for (const kind of ORDERED_KINDS) {
    const entries = groups.get(kind)!;
    if (entries.length === 0) {
      continue;
    }

    sections.push({
      kind,
      heading: summaryHeading(locale, kind),
      entries: entries.slice(0, limitPerKind),
      remainingCount: Math.max(0, entries.length - limitPerKind),
    });
  }

  return sections;
}

export type ActionKind =
  | "created"
  | "updated"
  | "replaced"
  | "patched"
  | "skipped";

export type SummaryEntry = {
  kind: ActionKind;
  target: string;
  detail?: string;
};

export type Locale = "zh" | "en";

export type InitOptions = {
  force: boolean;
  global: boolean;
  dryRun: boolean;
  targetRoot: string;
  locale: Locale;
};

export type ParsedArgs = {
  command: string | null;
  projectArg: string | null;
  force: boolean;
  global: boolean;
  dryRun: boolean;
  help: boolean;
  version: boolean;
  lang: Locale | null;
};

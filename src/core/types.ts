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

export type AgentCli = "codex" | "claude" | "opencode";

export type InitOptions = {
  force: boolean;
  global: boolean;
  dryRun: boolean;
  targetRoot: string;
  locale: Locale;
  cliTargets: AgentCli[];
};

export type ParsedArgs = {
  command: string | null;
  projectArg: string | null;
  force: boolean;
  global: boolean;
  dryRun: boolean;
  noTui: boolean;
  help: boolean;
  version: boolean;
  lang: Locale | null;
  cliTargets: AgentCli[];
};

import os from "node:os";
import path from "node:path";
import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, render, useApp, useInput } from "ink";
import { TextInput } from "@inkjs/ui";

import { performInit, resolveSkillsTargetRoots } from "../core/init.js";
import {
  checkForPackageUpdate,
  type PackageUpdateInfo,
  readPackageMetadata,
} from "../core/runtime.js";
import { groupSummaryEntries, hasAgentsBackup, ORDERED_KINDS, summaryHeading } from "../core/summary.js";
import { formatText } from "../core/text.js";
import type { AgentCli, InitOptions, Locale, SummaryEntry } from "../core/types.js";
import {
  BACK_OPTION_VALUE,
  buildStepOptions,
  EXIT_OPTION_VALUE,
  getDefaultChoiceIndex,
  isChoiceScreen,
  RUN_OPTION_VALUE,
  type WizardChoiceOption,
} from "./init-wizard-options.js";
import {
  nextWizardStep,
  previousWizardStep,
  type WizardStep,
} from "./init-wizard-state.js";
import { buildPreviewSections } from "./preview.js";

type InitWizardProps = {
  initialOptions: InitOptions;
  packageName: string;
  packageVersion: string;
  onExit: () => void;
};

function sectionColor(kind: string): string {
  if (kind === "created") {
    return "green";
  }
  if (kind === "updated") {
    return "blue";
  }
  if (kind === "replaced") {
    return "magenta";
  }
  if (kind === "patched") {
    return "yellow";
  }
  return "gray";
}

function resolveCliTargets(value: string): AgentCli[] {
  if (value === "all") {
    return ["codex", "claude", "opencode"];
  }
  return [value as AgentCli];
}

function formatCliTargets(targets: AgentCli[]): string {
  return targets.join(", ");
}

function InitWizard({
  initialOptions,
  packageName,
  packageVersion,
  onExit,
}: InitWizardProps): React.JSX.Element {
  const { exit } = useApp();
  const stdoutWidth = process.stdout.columns ?? 120;
  const [screen, setScreen] = useState<WizardStep>("locale");
  const [options, setOptions] = useState<InitOptions>(initialOptions);
  const [draftPath, setDraftPath] = useState(initialOptions.targetRoot);
  const [draftKey, setDraftKey] = useState(0);
  const [summary, setSummary] = useState<SummaryEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<PackageUpdateInfo | null>(null);
  const [previewSummary, setPreviewSummary] = useState<SummaryEntry[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [choiceIndex, setChoiceIndex] = useState(0);

  const close = (): void => {
    onExit();
    exit();
  };
  const isWideLayout = stdoutWidth >= 120;
  const leftWidth = isWideLayout ? Math.max(42, Math.floor(stdoutWidth * 0.42)) : undefined;
  const rightWidth = isWideLayout ? Math.max(48, stdoutWidth - (leftWidth ?? 0) - 4) : undefined;
  const stepOptions = useMemo<WizardChoiceOption[]>(
    () => buildStepOptions(screen, options),
    [screen, options],
  );

  useEffect(() => {
    setChoiceIndex(getDefaultChoiceIndex(screen, options, stepOptions));
  }, [screen, options, stepOptions]);

  const handleChoice = (value: string): void => {
    if (screen === "locale") {
      if (value === EXIT_OPTION_VALUE || value === BACK_OPTION_VALUE) {
        close();
        return;
      }
      setOptions((previous) => ({
        ...previous,
        locale: value as Locale,
      }));
      setScreen(nextWizardStep("locale"));
      return;
    }

    if (screen === "scope") {
      if (value === BACK_OPTION_VALUE) {
        setScreen(previousWizardStep("scope") ?? "target");
        return;
      }
      setOptions((previous) => ({
        ...previous,
        global: value === "global",
      }));
      setScreen(nextWizardStep("scope"));
      return;
    }

    if (screen === "cli") {
      if (value === BACK_OPTION_VALUE) {
        setScreen(previousWizardStep("cli") ?? "target");
        return;
      }
      setOptions((previous) => ({
        ...previous,
        cliTargets: resolveCliTargets(value),
      }));
      setScreen(nextWizardStep("cli"));
      return;
    }

    if (screen === "force") {
      if (value === BACK_OPTION_VALUE) {
        setScreen(previousWizardStep("force") ?? "scope");
        return;
      }
      setOptions((previous) => ({
        ...previous,
        force: value === "on",
      }));
      setScreen(nextWizardStep("force"));
      return;
    }

    if (screen === "dryRun") {
      if (value === BACK_OPTION_VALUE) {
        setScreen(previousWizardStep("dryRun") ?? "force");
        return;
      }
      setOptions((previous) => ({
        ...previous,
        dryRun: value === "on",
      }));
      setScreen(nextWizardStep("dryRun"));
      return;
    }

    if (screen === "confirm") {
      if (value === BACK_OPTION_VALUE) {
        setScreen(previousWizardStep("confirm") ?? "dryRun");
        return;
      }
      if (value === EXIT_OPTION_VALUE) {
        close();
        return;
      }
      if (value !== RUN_OPTION_VALUE) {
        return;
      }

      setErrorMessage(null);
      setSummary([]);
      setScreen("running");
      void performInit(options)
        .then((nextSummary) => {
          setSummary(nextSummary);
          setScreen("summary");
        })
        .catch((error: unknown) => {
          setErrorMessage(error instanceof Error ? error.message : String(error));
          setScreen("summary");
        });
    }
  };

  const renderChoiceList = (
    title: string,
    optionsForStep: WizardChoiceOption[],
  ): React.JSX.Element => (
    <Box flexDirection="column" width={leftWidth}>
      <Text>{title}</Text>
      <Box flexDirection="column" marginTop={1}>
        {optionsForStep.map((option, index) => {
          const selected = index === choiceIndex;
          return (
            <Text key={option.value} color={selected ? "cyan" : undefined}>
              {`${selected ? "❯" : " "} ${option.label}`}
            </Text>
          );
        })}
      </Box>
    </Box>
  );

  useInput((input, key) => {
    if (input === "q") {
      close();
      return;
    }

    if (
      key.escape
      && screen !== "running"
      && screen !== "summary"
    ) {
      const previous = previousWizardStep(screen);
      if (!previous) {
        close();
        return;
      }
      setScreen(previous);
      return;
    }

    if (isChoiceScreen(screen)) {
      if (key.upArrow) {
        setChoiceIndex((previous) => Math.max(0, previous - 1));
        return;
      }

      if (key.downArrow) {
        setChoiceIndex((previous) => Math.min(stepOptions.length - 1, previous + 1));
        return;
      }

      if (key.return) {
        const option = stepOptions[choiceIndex];
        if (option) {
          handleChoice(option.value);
        }
        return;
      }
    }

    if (screen === "summary" && (input === "q" || key.escape || key.return)) {
      close();
    }
  }, { isActive: screen !== "running" });

  useEffect(() => {
    let active = true;

    void checkForPackageUpdate(packageName, packageVersion).then((info) => {
      if (!active) {
        return;
      }
      setUpdateInfo(info);
    });

    return () => {
      active = false;
    };
  }, [packageName, packageVersion]);

  useEffect(() => {
    if (screen === "running" || screen === "summary") {
      return;
    }

    let active = true;
    setPreviewLoading(true);
    setPreviewError(null);

    void performInit({ ...options, dryRun: true })
      .then((nextSummary) => {
        if (!active) {
          return;
        }
        setPreviewSummary(nextSummary);
        setPreviewLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setPreviewSummary([]);
        setPreviewError(error instanceof Error ? error.message : String(error));
        setPreviewLoading(false);
      });

    return () => {
      active = false;
    };
  }, [options, screen]);

  const renderSummary = (): React.JSX.Element => {
    const groups = groupSummaryEntries(summary);
    const skillsTarget = resolveSkillsTargetRoots(options).join(", ");
    const globalConfig = options.cliTargets.includes("codex")
      ? path.join(os.homedir(), ".codex", "config.toml")
      : formatText(options.locale, "codexConfigSkipped");

    return (
      <Box flexDirection="column">
        <Text>{`${formatText(options.locale, "initTarget")} ${options.targetRoot}`}</Text>
        <Text>{`${formatText(options.locale, "cliTargets")} ${formatCliTargets(options.cliTargets)}`}</Text>
        <Text>{`${formatText(options.locale, "mode")} ${
          options.dryRun
            ? formatText(options.locale, "modeDryRun")
            : formatText(options.locale, "modeApply")
        }`}</Text>
        <Text>{`${formatText(options.locale, "skillsTarget")} ${skillsTarget}`}</Text>
        <Text>{`${formatText(options.locale, "globalConfig")} ${globalConfig}`}</Text>
        {ORDERED_KINDS.map((kind) => {
          const entries = groups.get(kind)!;
          if (entries.length === 0) {
            return null;
          }

          return (
            <Box key={kind} flexDirection="column" marginTop={1}>
              <Text color={sectionColor(kind)}>{`${summaryHeading(options.locale, kind)}:`}</Text>
              {entries.map((entry, index) => (
                <Text key={`${kind}-${index}`}>
                  {`- ${entry.target}${entry.detail ? ` (${entry.detail})` : ""}`}
                </Text>
              ))}
            </Box>
          );
        })}
        {hasAgentsBackup(summary) ? (
          <Box marginTop={1} flexDirection="column">
            <Text color="cyan">{formatText(options.locale, "migrationPromptLabel")}</Text>
            <Text color="yellow">{formatText(options.locale, "migrationPrompt")}</Text>
          </Box>
        ) : null}
        <Box marginTop={1}>
          <Text dimColor>
            {errorMessage
              ? formatText(options.locale, "tuiFailed")
              : formatText(options.locale, "tuiDone")}
          </Text>
        </Box>
        {errorMessage ? (
          <Box marginTop={1}>
            <Text color="red">{errorMessage}</Text>
          </Box>
        ) : null}
      </Box>
    );
  };

  const renderPreview = (): React.JSX.Element => {
    const sections = buildPreviewSections(previewSummary, options.locale);

    return (
      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">{formatText(options.locale, "tuiPreviewTitle")}</Text>
        <Text dimColor>{formatText(options.locale, "tuiPreviewHint")}</Text>
        {previewLoading ? (
          <Text color="yellow">{formatText(options.locale, "tuiPreviewLoading")}</Text>
        ) : null}
        {previewError ? (
          <Box flexDirection="column">
            <Text color="red">{`${formatText(options.locale, "tuiPreviewError")}: ${previewError}`}</Text>
          </Box>
        ) : null}
        {!previewLoading && !previewError
          ? sections.map((section) => (
            <Box key={section.kind} flexDirection="column" marginTop={1}>
              <Text color={sectionColor(section.kind)}>{`${section.heading}:`}</Text>
              {section.entries.map((entry, index) => (
                <Text key={`${section.kind}-${index}`}>
                  {`- ${entry.target}${entry.detail ? ` (${entry.detail})` : ""}`}
                </Text>
              ))}
            </Box>
          ))
          : null}
      </Box>
    );
  };

  const currentStepDescription = (): string => {
    if (screen === "locale") {
      return formatText(options.locale, "tuiStepLocaleDesc");
    }
    if (screen === "target") {
      return `${formatText(options.locale, "tuiStepTargetDesc")} ${formatText(options.locale, "tuiEditPathHint")}`;
    }
    if (screen === "cli") {
      return formatText(options.locale, "tuiStepCliDesc");
    }
    if (screen === "scope") {
      return formatText(options.locale, "tuiStepScopeDesc");
    }
    if (screen === "force") {
      return formatText(options.locale, "tuiStepForceDesc");
    }
    if (screen === "dryRun") {
      return formatText(options.locale, "tuiStepDryRunDesc");
    }
    if (screen === "confirm") {
      return formatText(options.locale, "tuiStepConfirmDesc");
    }
    return "";
  };

  const renderSidebar = (): React.JSX.Element | null => {
    if (screen === "running" || screen === "summary") {
      return null;
    }

    return (
      <Box flexDirection="column" width={rightWidth}>
        <Text dimColor>{formatText(options.locale, "tuiVersionCurrent", packageVersion)}</Text>
        {updateInfo ? (
          <Box marginTop={1} flexDirection="column">
            <Text color="yellow">
              {formatText(
                options.locale,
                "tuiUpdateAvailable",
                packageVersion,
                updateInfo.latestVersion,
              )}
            </Text>
            <Text dimColor>
              {formatText(
                options.locale,
                "tuiUpdateCommand",
                updateInfo.updateCommand,
              )}
            </Text>
          </Box>
        ) : null}
        <Box marginTop={1} flexDirection="column">
        <Text color="cyan">{formatText(options.locale, "tuiSidebarTitle")}</Text>
          <Text dimColor>{currentStepDescription()}</Text>
        </Box>
        {renderPreview()}
      </Box>
    );
  };

  const renderStepContent = (): React.JSX.Element | null => {
    if (screen === "locale") {
      return renderChoiceList(formatText(options.locale, "tuiStepLocale"), stepOptions);
    }

    if (screen === "target") {
      return (
        <Box flexDirection="column" width={leftWidth}>
          <Text>{formatText(options.locale, "tuiStepTarget")}</Text>
          <TextInput
            key={draftKey}
            defaultValue={draftPath}
            onChange={setDraftPath}
            onSubmit={(value) => {
              const nextTarget = value.trim()
                ? path.resolve(process.cwd(), value.trim())
                : process.cwd();
              setOptions((previous) => ({ ...previous, targetRoot: nextTarget }));
              setScreen(nextWizardStep("target"));
            }}
          />
        </Box>
      );
    }

    if (screen === "scope") {
      return renderChoiceList(formatText(options.locale, "tuiStepScope"), stepOptions);
    }

    if (screen === "cli") {
      return renderChoiceList(formatText(options.locale, "tuiStepCli"), stepOptions);
    }

    if (screen === "force") {
      return renderChoiceList(formatText(options.locale, "tuiStepForce"), stepOptions);
    }

    if (screen === "dryRun") {
      return renderChoiceList(formatText(options.locale, "tuiStepDryRun"), stepOptions);
    }

    if (screen === "confirm") {
      return (
        <Box flexDirection="column" width={leftWidth}>
          <Text>{formatText(options.locale, "tuiStepConfirm")}</Text>
          <Text>{`${formatText(options.locale, "tuiMenuTarget")}: ${options.targetRoot}`}</Text>
          <Text>{`${formatText(options.locale, "tuiMenuCli")}: ${formatCliTargets(options.cliTargets)}`}</Text>
          <Text>{`${formatText(options.locale, "tuiMenuScope")}: ${
            options.global
              ? formatText(options.locale, "tuiScopeGlobal")
              : formatText(options.locale, "tuiScopeProject")
          }`}</Text>
          <Text>{`${formatText(options.locale, "tuiMenuForce")}: ${
            options.force
              ? formatText(options.locale, "tuiForceOn")
              : formatText(options.locale, "tuiForceOff")
          }`}</Text>
          <Text>{`${formatText(options.locale, "tuiMenuDryRun")}: ${
            options.dryRun
              ? formatText(options.locale, "tuiDryRunOn")
              : formatText(options.locale, "tuiDryRunOff")
          }`}</Text>
          <Text>{`${formatText(options.locale, "tuiMenuLocale")}: ${options.locale}`}</Text>
          <Box marginTop={1}>
            {renderChoiceList(formatText(options.locale, "tuiStepConfirm"), stepOptions)}
          </Box>
        </Box>
      );
    }

    if (screen === "running") {
      return <Text color="cyan">{formatText(options.locale, "tuiRunning")}</Text>;
    }

    if (screen === "summary") {
      return renderSummary();
    }

    return null;
  };

  return (
    <Box flexDirection="column">
      <Text bold>{formatText(options.locale, "tuiTitle", packageVersion)}</Text>
      <Text dimColor>{formatText(options.locale, "tuiSubtitle")}</Text>
      <Box marginTop={1} flexDirection={isWideLayout ? "row" : "column"}>
        <Box flexDirection="column" width={leftWidth}>
          {renderStepContent()}
        </Box>
        {screen !== "running" && screen !== "summary" ? (
          <Box
            marginLeft={isWideLayout ? 2 : 0}
            marginTop={isWideLayout ? 0 : 1}
            flexDirection="column"
            width={rightWidth}
          >
            {renderSidebar()}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export async function runInitWizard(initialOptions: InitOptions): Promise<void> {
  const { name, version } = await readPackageMetadata();

  await new Promise<void>((resolve) => {
    const instance = render(
      <InitWizard
        initialOptions={initialOptions}
        packageName={name}
        packageVersion={version}
        onExit={() => {
          resolve();
        }}
      />,
    );

    void instance.waitUntilExit().then(() => {
      resolve();
    });
  });
}

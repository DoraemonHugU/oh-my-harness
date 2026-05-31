# oh-my-harness

![npm version](https://img.shields.io/npm/v/%40doraemon-hug-u%2Foh-my-harness)
![npm downloads](https://img.shields.io/npm/dm/%40doraemon-hug-u%2Foh-my-harness)
![license](https://img.shields.io/npm/l/%40doraemon-hug-u%2Foh-my-harness)
![node](https://img.shields.io/badge/Node.js-%3E%3D18-43853d)
![typescript](https://img.shields.io/badge/TypeScript-6.0%2B-3178c6)

Languages: [简体中文](./README.md) | [English](./README.en.md)

`oh-my-harness` is a Chinese-first Codex / Claude Code / OpenCode `PR-first / plan-first` implementation harness. It initializes a project with workflow templates, skills, reviewer agents, and optional global configuration so agents can move from research to implementation PRs with a repeatable local workflow.

## Supported CLIs

Codex remains the default target. Use `--cli claude`, `--cli opencode`, or `--cli all` to initialize Claude Code, OpenCode, or all supported targets.

The target-specific behavior is intentionally minimal:

- Codex and OpenCode use `AGENTS.md` and `.agents/skills/`.
- Claude Code alone uses `CLAUDE.md` and `.claude/skills/`.
- When Claude Code is installed together with Codex or OpenCode, `AGENTS.md` is the shared instruction source and `CLAUDE.md` only contains `@AGENTS.md`.
- Codex-only global configuration, including `~/.codex/config.toml` and `~/.codex/agents/*`, is installed only when Codex is selected.
- Claude Code and OpenCode install only the `reviewer` subagent. They do not install an `explorer` subagent.
- The Claude Code reviewer uses `model: opus`; the OpenCode reviewer does not set a model and inherits the current session model.
- The reviewer prompt body is copied from `agents/reviewer.md`; platform files only add their own frontmatter.

## Installation

Use `npx` for one-off initialization:

```bash
npx @doraemon-hug-u/oh-my-harness
```

Or install it globally:

```bash
npm install -g @doraemon-hug-u/oh-my-harness
oh-my-harness
```

## Quick Start

In an interactive terminal, run the TUI:

```bash
npx @doraemon-hug-u/oh-my-harness
```

You can also call `init` explicitly:

```bash
npx @doraemon-hug-u/oh-my-harness init
```

Seed the target directory and CLI selection:

```bash
npx @doraemon-hug-u/oh-my-harness init my-project --cli all
```

In non-interactive agent runs, use `--no-tui`:

```bash
npx @doraemon-hug-u/oh-my-harness init my-project --cli claude --dry-run --no-tui --lang en
```

Useful options:

| Option | Description |
| --- | --- |
| `projectName` | Target directory. Defaults to the current directory. |
| `--cli <codex\|claude\|opencode\|all>` | Target CLI. Defaults to `codex`. |
| `--dry-run` | Preview changes without writing files. |
| `--no-tui` | Execute directly instead of opening the TUI. |
| `--force` | Overwrite same-name templates and skills; patch existing global config. |
| `--global` | Install skills into the selected target CLI global skills directory. |
| `--lang <zh\|en>` | Force CLI output language. |

## TUI Flow

The `init` wizard has seven steps:

1. Output language
2. Target directory
3. Target CLI
4. Skills destination
5. `--force`
6. `--dry-run`
7. Confirm

CLI options seed the TUI defaults. In non-interactive environments, or when `--no-tui` is set, `init` runs directly.

## What Init Writes

Project-level files:

- `<target>/AGENTS.md` for Codex, OpenCode, or shared multi-target instructions.
- `<target>/CLAUDE.md` for Claude Code. Claude-only gets the full template; shared multi-target installs use `@AGENTS.md`.
- `<target>/agents.back.md` or `<target>/claude.back.md` when an existing instruction file is replaced.
- `<target>/.github/**` and `<target>/docs/specs/**` workflow templates.
- `<target>/.agents/skills/**` for Codex and OpenCode.
- `<target>/.claude/skills/**` for Claude Code.
- `<target>/.oh-my-harness/hooks/tree.mjs` and `<target>/.oh-my-harness/tree.md`.
- `<target>/.claude/agents/reviewer.md` for Claude Code.
- `<target>/.opencode/agents/reviewer.md` for OpenCode.

Global files:

- `~/.codex/config.toml` and `~/.codex/agents/*` when Codex is selected.
- `~/.agents/skills/*` when `--global` is used with Codex or OpenCode.
- `~/.claude/skills/*` when `--global` is used with Claude Code.
- `~/.claude/agents/reviewer.md` when `--global` is used with Claude Code.
- `~/.config/opencode/agents/reviewer.md` when `--global` is used with OpenCode.

Hook triggers:

- `<target>/.codex/hooks.json` for Codex.
- `<target>/.claude/skills/oh-my-harness-hooks/` as a Claude Code skills-directory plugin.
- `<target>/.opencode/plugins/oh-my-harness-tree.js` as an OpenCode plugin.

## Prompt-Driven Installation

Agents can install this workflow by turning a user prompt into an explicit command such as:

```bash
oh-my-harness init . --cli all --no-tui
```

This does not allow arbitrary prompt bodies to become reviewer agents. The reviewer body always comes from the package's `agents/reviewer.md`, which keeps installed behavior auditable.

## Uninstall / Cleanup

There is no automatic `uninstall` command yet. Remove the files written for the selected target CLI.

Project-level cleanup:

- Codex: remove `AGENTS.md`, `.agents/skills/`, and `.codex/hooks.json`.
- Claude Code: remove `CLAUDE.md`, `.claude/agents/reviewer.md`, and the skills written under `.claude/skills/`. To remove only the tree hook plugin, remove `.claude/skills/oh-my-harness-hooks/`.
- OpenCode: remove `AGENTS.md`, `.agents/skills/`, `.opencode/agents/reviewer.md`, and `.opencode/plugins/oh-my-harness-tree.js`.
- Shared workflow files: remove `.github/PULL_REQUEST_TEMPLATE/`, `.github/writing-plan.md`, `.github/pr-review-comment.md`, `docs/specs/`, `.oh-my-harness/hooks/tree.mjs`, `.oh-my-harness/tree.md`, and the `oh-my-harness` block in `.gitignore` as needed.

Global cleanup:

- Codex: remove package-written entries from `~/.codex/agents/*` and `~/.codex/config.toml`.
- Claude Code: remove package-written skills from `~/.claude/skills/` and remove `~/.claude/agents/reviewer.md`.
- OpenCode: remove package-written skills from `~/.agents/skills/` and remove `~/.config/opencode/agents/reviewer.md`.

## Development

Requirements:

- Node.js >= 18
- npm

Local checks:

```bash
npm run test
npm run check
npm run build
npm pack --dry-run
```

The package entrypoint is `dist/cli.js`; source code lives in `src/`.

## License

MIT. Third-party notices are listed in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

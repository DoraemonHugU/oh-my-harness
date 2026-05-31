# Agent `init`（`--no-tui`）

这个文档只说明一件事：当 agent 需要稳定驱动 `oh-my-harness init` 时，如何绕过 TUI，直接按参数执行。

## 何时使用

在下面这些场景里，优先使用 `--no-tui`：

- 当前终端是交互式 TTY，但你不希望进入 TUI。
- 你希望 agent 根据 prompt 直接拼出命令并执行。
- 你希望保留 CLI summary 回显，作为后续动作依据。

## 基本规则

- 只增加一个显式开关：`--no-tui`
- 其余行为保持不变：
  - 默认目标目录仍然是当前目录
  - 默认目标 CLI 仍然是 Codex
  - 默认 skills 安装位置仍然是目标 CLI 对应的项目级 skills 目录
  - `runInit` 的 summary 仍然会完整输出
- `--no-tui` 不会引入新的配置文件格式，也不会改变现有参数语义

## 推荐命令

最小执行：

```bash
npx @doraemon-hug-u/oh-my-harness init --no-tui
```

只预演，不落盘：

```bash
npx @doraemon-hug-u/oh-my-harness init --dry-run --no-tui
```

指定目录并直接执行：

```bash
npx @doraemon-hug-u/oh-my-harness init my-project --no-tui
```

指定目录并预设完整参数：

```bash
npx @doraemon-hug-u/oh-my-harness init my-project --cli all --force --global --lang en --no-tui
```

指定目标 CLI：

```bash
npx @doraemon-hug-u/oh-my-harness init my-project --cli codex --no-tui
npx @doraemon-hug-u/oh-my-harness init my-project --cli claude --no-tui
npx @doraemon-hug-u/oh-my-harness init my-project --cli opencode --no-tui
npx @doraemon-hug-u/oh-my-harness init my-project --cli all --no-tui
```

## Agent 使用建议

如果用户已经明确了目标目录、目标 CLI、语言和是否需要 `dry-run / force / global`，agent 应直接执行命令，不要进入 TUI 再模拟选择。

典型 prompt：

```text
帮我把当前仓库按项目级配置初始化，先 dry-run，不要进入 TUI。
```

对应命令：

```bash
npx @doraemon-hug-u/oh-my-harness init --dry-run --no-tui
```

如果用户要求全局 skills：

```bash
npx @doraemon-hug-u/oh-my-harness init --global --no-tui
```

如果用户要求 Claude Code 项目初始化：

```bash
npx @doraemon-hug-u/oh-my-harness init --cli claude --no-tui
```

如果用户要求 OpenCode 项目初始化：

```bash
npx @doraemon-hug-u/oh-my-harness init --cli opencode --no-tui
```

`--cli claude` 只写入 `CLAUDE.md` + `.claude/skills/` + `.claude/agents/reviewer.md`，不会新建或覆盖 `AGENTS.md`。

`--cli opencode` 会写入 `AGENTS.md` + `.agents/skills/` + `.opencode/agents/reviewer.md`，不会处理 Codex 专用 config。

`--cli all` 会写入共享的 `AGENTS.md` + `.agents/skills/`，同时为 Claude Code 写入只引用 `AGENTS.md` 的 `CLAUDE.md` + `.claude/skills/` + `.claude/agents/reviewer.md`，并为 OpenCode 写入 `.opencode/agents/reviewer.md`。Codex 专用 `~/.codex/config.toml` 与 `~/.codex/agents/*` 只在目标包含 Codex 时处理。

当前不会安装 Claude/OpenCode 的 explorer 子代理；两者使用各自 CLI 自带 explorer 能力。

## 输出约定

`--no-tui` 仍然走和非交互模式相同的执行路径，因此会保留现有 summary：

- `目标目录`
- `目标 CLI`
- `模式`
- `skills 目录`
- `全局配置`
- `创建 / 更新 / 覆盖 / 补丁 / 跳过`
- `后续给 prompt 的提示`

这意味着 agent 可以直接根据 summary 决定下一步，例如：

- 继续真实执行
- 提交初始化结果
- 对比 `AGENTS.md` 与 `agents.back.md`，或对比 `CLAUDE.md` 与 `claude.back.md`

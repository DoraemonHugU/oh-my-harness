# oh-my-harness

![npm version](https://img.shields.io/npm/v/%40doraemon-hug-u%2Foh-my-harness)
![npm downloads](https://img.shields.io/npm/dm/%40doraemon-hug-u%2Foh-my-harness)
![license](https://img.shields.io/npm/l/%40doraemon-hug-u%2Foh-my-harness)
![node](https://img.shields.io/badge/Node.js-%3E%3D18-43853d)
![typescript](https://img.shields.io/badge/TypeScript-6.0%2B-3178c6)

中文优先的 Codex `PR-first / plan-first` implementation harness。

它提供一个可发布的 CLI：

- 将 `AGENTS.md`、`.github/`、`docs/specs/` 等模板写入目标仓库
- 安装项目级或全局级 skills
- patch 全局 `~/.codex/config.toml` 和 `~/.codex/agents/*`
- 用统一工作流把需求收敛到 `Implementation PR / Implementation Plan`

## 安装

```bash
npm install -g @doraemon-hug-u/oh-my-harness
```

安装后命令名仍然是：

```bash
oh-my-harness init
```

也可以直接运行：

```bash
npx @doraemon-hug-u/oh-my-harness init
```

## 快速开始

在当前项目目录初始化：

```bash
oh-my-harness init
```

为指定目录初始化：

```bash
oh-my-harness init my-project
```

只预演，不实际写文件：

```bash
oh-my-harness init my-project --dry-run
```

强制覆盖同名模板文件、skill 目录和可 patch 的全局配置：

```bash
oh-my-harness init my-project --force
```

把 skills 安装到全局 `~/.agents/skills/`：

```bash
oh-my-harness init my-project --global
```

指定输出语言：

```bash
oh-my-harness init my-project --lang zh
oh-my-harness init my-project --lang en
```

## `init` 会写入什么

项目级：

- `<target>/AGENTS.md`
- `<target>/agents.back.md`（仅目标已存在 `AGENTS.md` 时）
- `<target>/.github/**`
- `<target>/docs/specs/**`
- `<target>/.agents/skills/**`

全局级：

- `~/.codex/config.toml`
- `~/.codex/agents/*`
- `~/.agents/skills/*`（仅 `--global` 时）

## 命令参数

| 参数 | 作用 |
| --- | --- |
| `projectName` | 目标目录；不传时使用当前目录 |
| `--dry-run` | 只读取和计算变更，不落盘 |
| `--force` | 覆盖同名模板文件和 skill 目录，并 patch 已有全局配置 |
| `--global` | 将 skills 安装到 `~/.agents/skills/` |
| `--lang <zh\|en>` | 强制指定 CLI 输出语言 |

## `AGENTS.md` 覆盖行为

- 如果目标项目不存在 `AGENTS.md`，直接写入模板。
- 如果目标项目已存在 `AGENTS.md`，先备份为 `agents.back.md`，再覆盖为新模板。
- CLI 会额外提示一条精简后续操作：对比 `AGENTS.md` 与 `agents.back.md`，只迁移仍有价值的项目级规则，再清理备份文件。

## 当前设计

- `oh-my-harness init [projectName?]`：向目标仓库写入项目模板。
- `plugin/`：分发 Codex plugin 与核心 harness skill。
- `templates/repo/`：需要落到项目仓库中的模板。

## 当前核心 skill

- `harness`：主入口，接手 Implementation PR、Implementation Plan 或直接需求；内置计划、worktree、验证和审查流程。
- `tdd`：按当前 plan 接入的 TDD 实现策略 skill。
- `systematic-debugging`：独立的专项调试 skill。

## 项目模板

- `.github/PULL_REQUEST_TEMPLATE/implementation.md`：实现型 PR 模板。
- `.github/PULL_REQUEST_TEMPLATE/research.md`：研究型 PR 模板。
- `.github/codex-review-comment.md`：云端 Codex review 评论模板。
- `docs/specs/*`：项目级长期规范。

## 开源与许可证

- 主项目许可证：`MIT`
- 上游 vendored skills 的许可证和来源见：
  - `THIRD_PARTY_NOTICES.md`

## 发布（维护者）

在包目录执行：

```bash
cd oh-my-harness
npm run check
npm pack --dry-run
npm publish
```

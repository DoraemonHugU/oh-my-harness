# oh-my-harness

![npm version](https://img.shields.io/npm/v/%40doraemon-hug-u%2Foh-my-harness)
![npm downloads](https://img.shields.io/npm/dm/%40doraemon-hug-u%2Foh-my-harness)
![license](https://img.shields.io/npm/l/%40doraemon-hug-u%2Foh-my-harness)
![node](https://img.shields.io/badge/Node.js-%3E%3D18-43853d)
![typescript](https://img.shields.io/badge/TypeScript-6.0%2B-3178c6)

中文优先的 Codex `PR-first / plan-first` implementation harness。

`oh-my-harness` 是一个用于初始化和运行 Codex `PR-first / plan-first` 工作流的轻量 harness：它提供 CLI、仓库模板、skills 和可选的全局配置 patch，把 research、plan、PR 准备和 review 尽量放到更低成本的环境里，再把必要的本地代码编写、验证和交付留给 Codex。

## 优先支持 Codex , CC和OC支持正在路上

## 从现在开始,合理利用你的订阅

**把不能编码的额度花在 research、plan 和 review 上**

**把 Codex 编码额度留给真正的代码修改。**

**别把 Codex 浪费在重复读代码和审查上，把本地额度主要用于实现、验证和交付。**

## harness 核心循环

`research -> plan -> implementation -> review -> follow-up -> repeat`

- `research`：确定研究问题,收集所需的上下文信息
- `plan`：产出可执行的 `Implementation Plan`
- `implementation`：在本地仓库中修改代码
- `review`：验证是否满足plan
- `follow-up`：接受、修复、补研究、重规划或拆分

## 为什么选择 `@doraemon-hug-u/oh-my-harness`

- **把只读工作移出本地 Codex**：先在 `ChatGPT`、`Grok` 等 Web 平台结合 `GitHub connector` 阅读仓库、收敛问题、整理 plan，再把本地 Codex 留给真正的实现。参考：[Connecting GitHub to ChatGPT](https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt)
- **把 plan 和实现解耦**：plan 可以来自 Research PR、Issue、外部分析或人工整理；本地 Codex 只负责接手并实现。
- **让云端和本地额度分工**：研究、plan 和 review 尽量放到更低成本的环境里；本地 Codex 专注实现、验证和交付。参考：[Codex pricing](https://developers.openai.com/codex/pricing)、[Codex code review in GitHub](https://developers.openai.com/codex/integrations/github)

![云端研究与本地实现分工](https://raw.githubusercontent.com/DoraemonHugU/oh-my-harness/main/docs/images/workflow-overview.png)

## 工作流示例

### 完整闭环示例：大任务先研究，再拆实现

1. 在 `ChatGPT` 网页版中，通过 `GitHub connector` 连接当前仓库，阅读代码、找问题、判断下一步推进方向。
2. 如果任务较大，先创建一个 `Research PR`，再拆成 `1-3` 个 `Implementation PR`；如果任务较小，直接创建 `Implementation PR`。
3. 在 `Implementation PR` 中带上对应的 `Implementation Plan`。
4. 切换回本地 `Codex`，触发 `$harness` 直接接手这个 `PR / plan`。
5. 由 `harness` 完成必要的本地代码编写、验证和交付。
6. 审查优先交给云端 reviewer（例如 `@codex review`）；如果需要，也可以切到本地审查。参考：[Codex code review in GitHub](https://developers.openai.com/codex/integrations/github)
7. 后续修复、补充验证和再次审查，继续在这条链路里收口，直到任务完成。

### 最小闭环示例：小任务直接进入实现

1. 在任何更低成本的环境里完成 research、边界收敛和 `Implementation Plan` 编写。
2. 如果需要，就顺手创建 `Research PR` 或 `Implementation PR`。
3. 回到本地 `Codex`，让 `$harness` 接手 plan。
4. 本地只做必要的代码修改、验证、审查和交付，不再重复做一轮大范围只读研究。

## 相关参考

- [Codex code review in GitHub](https://developers.openai.com/codex/integrations/github)：`@codex review`、自动审查和 `AGENTS.md` review guidance 的官方说明
- [Codex pricing](https://developers.openai.com/codex/pricing)：Codex Web / CLI / 云端审查能力与额度说明
- [Connecting GitHub to ChatGPT](https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt)：将 GitHub 仓库连接到 ChatGPT 的官方教程


## 主要功能
它提供一套可初始化到目标仓库中的工作流骨架，包括 CLI、仓库模板、skills 和可选的全局配置 patch：

- 将 `AGENTS.md`、`.github/`、`docs/specs/` 等模板写入目标仓库
- 安装项目级或全局级 skills
- patch 全局 `~/.codex/config.toml` 和 `~/.codex/agents/*`
- 用统一工作流把需求收敛到 `Implementation PR / Implementation Plan`

## 安装

推荐直接使用 `npx`：

```bash
npx @doraemon-hug-u/oh-my-harness
```

如果你希望全局安装，再使用：

```bash
npm install -g @doraemon-hug-u/oh-my-harness
```

安装后命令名仍然是：

```bash
oh-my-harness
```

## 快速开始

在交互终端里，推荐直接运行：

```bash
npx @doraemon-hug-u/oh-my-harness
```

也可以显式写 `init`：

```bash
npx @doraemon-hug-u/oh-my-harness init
```

为指定目录预设目标路径，再进入多步向导：

```bash
npx @doraemon-hug-u/oh-my-harness init my-project
```

命令行参数不会绕过 TUI，而是作为默认值带入向导。例如：

```bash
npx @doraemon-hug-u/oh-my-harness init my-project --force --global --dry-run --lang en
```

在非交互环境中，`init` 会直接执行，不进入 TUI。例如：

```bash
npx @doraemon-hug-u/oh-my-harness init my-project --dry-run </dev/null
```

如果你要让 agent 在交互终端中也直接按参数执行，而不是进入 TUI，可以显式加上 `--no-tui`：

```bash
npx @doraemon-hug-u/oh-my-harness init my-project --dry-run --no-tui
```

给 agent 单独看的说明见：[`docs/agent-init-no-tui.md`](./docs/agent-init-no-tui.md)

`init` 还会自动完成两件基础初始化：

- 如果目标目录还不是 Git 仓库，则自动执行 `git init`
- 在目标项目中生成首个 `.oh-my-harness/tree.md`

完成 `init` 后，在 Codex 中打开目标仓库，然后让 `$harness` 接手当前的 `Implementation PR` 或 `Implementation Plan`。例如：

```text
Use $harness to pick up the current implementation plan and complete the implementation PR.
```

## 首次配置流程

如果你要把“低成本环境做 research / plan / review，本地 Codex 做实现”的完整闭环真正跑起来，建议按下面这条链路配置：

1. 先确认本地 `gh` 已登录：

   ```bash
   gh auth status
   ```

   如果尚未登录，再执行 `gh auth login`。

2. 准备 GitHub 私有仓库，并确保当前项目已经推送到该仓库。必要时可以直接在本地 Codex 中下达：

   ```text
   帮我提交当前的项目到 GitHub 的私有仓库中
   ```

3. 在目标仓库执行 `init`，把工作流模板、skills 和基础配置写入当前项目：

   ```bash
   npx @doraemon-hug-u/oh-my-harness init
   ```

   然后把这批初始化文件提交并 push。云端侧后续会直接依赖这些文件，尤其是 `AGENTS.md`、`docs/specs/agent-workflow.md` 和 `.oh-my-harness/tree.md`。

4. 打开 [Connecting GitHub to ChatGPT](https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt)，在 `https://chatgpt.com/codex/cloud/settings/connectors` 把你的 GitHub 账号连接到 ChatGPT，并选择当前开发仓库。

5. 打开 [Codex code review in GitHub](https://developers.openai.com/codex/integrations/github)，在 `https://chatgpt.com/codex/cloud/settings/code-review` 启用代码审查，但不要启用自动审查。配置方式可参考下图：

   ![云端代码审查配置示意图](https://raw.githubusercontent.com/DoraemonHugU/oh-my-harness/main/docs/images/code-review-settings.png)

6. 回到 ChatGPT Web，通过 GitHub connector 连接到当前仓库，先让它阅读 `docs/specs/agent-workflow.md`，再分析下一步方向。常用提示词可以直接写成：

   ```text
   通过 GitHub connector 连接到 {仓库}，先阅读 docs/specs/agent-workflow.md，然后分析我们的下一步方向。
   ```

7. 根据分析结果，在云端侧提交 `Research PR` 或直接提交 `Implementation PR`。大任务通常先创建一个 `Research PR`，再拆成 `2-3` 个 `Implementation PR`；小任务可以直接创建 `Implementation PR`。常用提示词可以写成：

   ```text
   根据分析结果，帮我提交一个研究性 PR，涵盖 1、2、3、4、5 问题，并分成 2-3 个实现 PR。
   ```

8. 在云端侧确认 PR 创建、文件写入和 plan 更新；如果有 `Implementation PR`，先在对应 PR 中自检和审查 plan。

9. 回到本地 Codex 或其他本地编程环境，让 `$harness` 接手实现 PR。你的常用输入可以直接写成：

   ```text
   $harness 接手实现 pr2、pr3、pr4，其中研究性 pr 是 pr1
   ```

10. 本地实现进行中时，云端侧可以继续研究其他模块、补充后续 `Research PR / Implementation PR / Plan`。最终收集所有结果，合并实现 PR，并同步本地仓库。

## TUI 向导

`init` 向导当前是固定 6 步：

1. 输出语言
2. 目标目录
3. skills 安装位置
4. `--force`
5. `--dry-run`
6. 确认执行

说明：

- `Esc` 返回上一步；在第一步按 `Esc` 或任意步骤按 `q` 退出。
- `npx @doraemon-hug-u/oh-my-harness` 与 `oh-my-harness init` 在交互终端里都会进入这个向导。
- 命令行参数仍然保留，因为在脚本化或快速预设默认值时更方便。
- 每一步下方都会显示当前配置对应的 dry-run 预览；该预览不会实际写文件。
- 宽终端会把“当前步骤”和“说明 / dry-run 预览”并排显示；窄终端会自动回退成上下布局。
- 顶部会显示当前版本；如果 npm registry 上有更新版本，右侧会给出非强制的更新提示和命令。

## 参数预设

```bash
npx @doraemon-hug-u/oh-my-harness init my-project --lang zh
npx @doraemon-hug-u/oh-my-harness init my-project --lang en
```

这些参数在交互终端里会变成 TUI 的默认值：

- `projectName`
- `--dry-run`
- `--force`
- `--global`
- `--lang <zh|en>`

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
| `--no-tui` | 即使在交互终端中也直接执行，不进入 TUI |
| `--force` | 覆盖同名模板文件和 skill 目录，并 patch 已有全局配置 |
| `--global` | 将 skills 安装到 `~/.agents/skills/` |
| `--lang <zh\|en>` | 强制指定 CLI 输出语言 |

## `AGENTS.md` 覆盖行为

- 如果目标项目不存在 `AGENTS.md`，直接写入模板。
- 如果目标项目已存在 `AGENTS.md`，先备份为 `agents.back.md`，再覆盖为新模板。
- CLI 会额外提示一条精简后续操作：对比 `AGENTS.md` 与 `agents.back.md`，只迁移仍有价值的项目级规则，再清理备份文件。

## Safety and rollback

- 作用到已有仓库前，先运行 `--dry-run`
- 已有 `AGENTS.md` 会先备份为 `agents.back.md`
- 只有选择全局安装时，才会修改 `~/.codex/config.toml` 和 `~/.codex/agents/*`
- 如需回滚项目模板，可恢复 `agents.back.md` 并删除本次新增的模板文件

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

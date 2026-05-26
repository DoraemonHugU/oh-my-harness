# Agent 工作流规范

## 定位

本项目采用 PR-first agent 工作流。GitHub PR 是任务执行、上下文承载、审查和追踪的主要单元。

本文件用于给不能直接使用本地 harness skill 的 agent 提供最小桥接协议。具体运行时步骤以相关 `AGENTS.md`、PR 模板和审查评论模板为准。

当只有一个开发者进行项目开发时, 
研究性pr并不是必须的. 可以直接生成对应的实现pr.
但如果该任务较大,需要拆分成多个实现pr时,此时应该有一个研究性pr总领多个实现pr.

## PR 类型

### Research PR

Research PR 是临时研究容器。

规则：

- 默认使用 draft。
- 使用 `.github/PULL_REQUEST_TEMPLATE/research.md`。
- 不修改业务代码。
- 不合并到 `main`。
- 不在 Research PR 分支上做实现开发。
- 研究结论写在 PR 描述、评论和 `docs/prs/` 研究报告里。
- 可以产出 0-N 个 Implementation PR，也可以得出“不实现”的结论。
- 后续 implementation PR 可以引用 research PR。

### Implementation Plan

Implementation Plan 是实现执行协议。

规则：

- 默认路径：`docs/harness/plans/YYYY-MM-DD-<slug>-plan.md`
- 用于承载实现步骤、测试组织和执行边界。
- 可以直接从需求生成，也可以从 Research PR 导出。
- 每个 Implementation PR 必须绑定一个 Implementation Plan。

### Implementation PR

Implementation PR 是真实变更单元。

规则：

- 默认使用普通 PR（非 draft）。
- 使用 `.github/PULL_REQUEST_TEMPLATE/implementation.md`。
- 必须引用 `docs/harness/plans/YYYY-MM-DD-<slug>-plan.md`。
- 如果来自 research PR，必须引用对应 PR。
- 创建或更新后，按 `.github/codex-review-comment.md` 准备审查评论。

### Spec PR

Spec PR 只用于更新稳定规范。

规则：

- 只在同类问题重复出现，或某条流程稳定且影响后续 agent 时创建。
- 不和业务实现混在一起。
- 优先更新相关 `AGENTS.md` 或 `docs/specs/*.md`。

## 能力边界

- 本地编程 agent 负责接手 `Implementation PR` / `Implementation Plan`，并在本地仓库、`.worktrees/<slug>` 和 `harness` 流程中完成实现、验证、审查和交付。
- 通过 GitHub connector / 云端项目接入的 agent，不直接实现业务代码；只负责研究、边界收敛、提交或更新 `Research PR`、`Implementation PR`、`Implementation Plan` 及相关上下文。
- 如果当前 agent 是通过 GitHub connector / 云端项目接入的，进入实现路径时应停在“PR + plan 已准备完成”，而不是继续修改业务代码。

## 路由规则

```mermaid
flowchart TD
    A["用户需求 / Issue / Research 结论"] --> B{"任务是否需要总领研究?"}
    B -- "是" --> C["创建或更新 Research PR"]
    B -- "否" --> D["直接进入 Implementation 路径"]
    C --> E["收敛边界并准备 Implementation Plan"]
    D --> E
    E --> F["创建或更新 Implementation PR"]
    F --> G{"当前 agent 是否通过 GitHub connector / 云端项目接入?"}
    G -- "是" --> H["停在 PR + plan 已准备完成"]
    G -- "否" --> I["本地编程 agent 接手实现"]
    I --> J["@codex review / 本地 reviewer"]
    J --> K["修复反馈并重新验证"]
    K --> L["合并 Implementation PR"]
    L --> M["必要时单独固化 Spec / AGENTS"]
```

## 审查与交付

- 模板：`.github/codex-review-comment.md`。
- 必须包含明确 `<base_sha>..<head_sha>`。
- 评论发送前只要带有了@codex review前缀且满足模版需求则无需展示给用户并取得批准。
- research PR 如需审查，仍使用同一模板，并在背景或补充信息中明确研究性质和审查重点。
- implementation PR 聚焦实际 diff 和非目标边界。

## 事实来源

| 内容 | 事实来源 |
|---|---|
| 工程硬约束 | 根级和相关子目录 `AGENTS.md` |
| 当前 agent 工作流 | `docs/specs/agent-workflow.md` |
| 单次任务上下文 | PR 描述和 PR 评论 |
| 研究结论 | Research PR 描述、评论和 `docs/prs/` 研究报告；不作为长期规范 |
| 代码变更 | implementation PR |

## 维护边界

- 不为临时发现建立长期文档。
- 不把 Research PR 或 `docs/prs/` 研究报告视作长期规范，除非已经通过独立 Spec PR 固化。
- 不让 workflow 文档数量膨胀；优先保持本文件短、准、可执行。

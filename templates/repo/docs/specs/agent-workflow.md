# Agent 工作流规范

## 定位

- 本项目采用 PR-first agent 工作流。GitHub PR 是任务上下文、审查和追踪的主要单元。
- 本文件主要服务于不能直接进入本地 `harness` 的 agent，例如通过 GitHub connector / 云端项目接入的 agent。
- 如果当前环境可以直接使用本地 `harness`，实现类任务从一开始就应进入 `harness`；本文件只作为 artifact 关系、云端边界和交接规则参考。

## Artifact 关系

### Research PR

Research PR 是临时研究容器。

规则：

- 默认使用 `draft`。
- 使用 `.github/PULL_REQUEST_TEMPLATE/research.md`。
- 用于研究、判断、共享边界收敛和后续 Implementation PR 拆分。
- 不修改业务代码。
- 不合并到 `main`。
- 不在该分支上做实现开发。
- 默认新增一份研究报告文件：`docs/prs/{yyyyMMdd-HHmm}-{pr_title_snake_case}.md`；目录不存在时，在当前 PR 分支中一并创建。
- 可以产出 `0-N` 个 `Implementation PR`，也可以得出“不实现”的结论。

### Implementation Plan

Implementation Plan 是实现执行协议。

规则：

- 默认路径：`docs/harness/plans/YYYY-MM-DD-<slug>-plan.md`
- 写 plan 前先阅读 `.github/writing-plan.md`。
- 用于承载实现步骤、测试组织和执行边界。
- 可以直接从需求生成，也可以从 Research PR 导出。
- 目录不存在时，在当前 PR 分支中一并创建。
- 每个 `Implementation PR` 必须绑定一个 `Implementation Plan`。
- “绑定”的最低标准是：
  - PR 描述中明确引用该 plan 路径；
  - plan 文件已存在于当前 PR 分支，或将随当前 PR 一起提交。

### Implementation PR

Implementation PR 是真实代码交付容器。

规则：

- 默认使用普通 PR（非 `draft`）。
- 使用 `.github/PULL_REQUEST_TEMPLATE/implementation.md`。
- 承载代码实现、验证摘要和风险摘要；不承载研究正文。
- 必须引用绑定的 `Implementation Plan`。
- 如果来自 Research PR，必须 mention 对应 Research PR。
- 创建或更新后，按 `.github/codex-review-comment.md` 准备审查评论。
- `.oh-my-harness/tree.md` 由项目 hook 自动刷新，不需要手工维护；如果当前提交让该文件发生变化，需要与当前改动一起提交。
- 当当前 agent 不能直接获取目录树时，可把 `.oh-my-harness/tree.md` 作为目录索引读取。

### Spec PR

Spec PR 只用于更新稳定规范。

规则：

- 只在同类问题重复出现，或某条流程稳定且影响后续 agent 时创建。
- 不与业务实现混在一起。
- 优先更新相关 `AGENTS.md` 或 `docs/specs/*.md`。

## 云端能力边界

- 通过 GitHub connector / 云端项目接入的 agent，不直接实现业务代码。
- 这类 agent 不直接修改业务实现代码、测试代码或生产配置。
- 这类 agent 可以创建或更新：
  - `Research PR`
  - `Implementation PR` 的标题、描述、评论和上下文
  - `Implementation Plan`
  - `docs/prs/` 下的研究报告
  - 为上述工件服务的文档型文件
- 这类 agent 在实现路径中的终点是：`PR + plan 已准备完成`。

## 路由规则

- `Research PR` 不是必须的。
- 满足以下任一条件时，先创建或更新 `Research PR`：
  - 需要判断问题是否成立；
  - 需要共享目标表现或验收边界；
  - 需要拆分成多个 `Implementation PR`。
- 任务边界清楚、只需要一个实现单元时，可以直接准备 `Implementation Plan + Implementation PR`。

```mermaid
flowchart TD
    A["用户需求 / Issue / Research 结论"] --> B{"当前 agent 能否直接使用本地 harness?"}
    B -- "是" --> C["立即进入 harness"]
    C --> D["harness 判断是否已有可执行 plan"]
    D --> E["必要时补齐 / 更新 Research PR、Implementation Plan、Implementation PR"]
    E --> F["本地实现、验证、审查、交付"]
    B -- "否" --> G{"是否需要总领研究?"}
    G -- "是" --> H["创建或更新 Research PR"]
    G -- "否" --> I["直接准备 Implementation Plan"]
    H --> I
    I --> J["创建或更新 Implementation PR"]
    J --> K["确保 PR 描述与 plan 文件已绑定"]
    K --> L["PR + plan 已准备完成"]
    L --> M["交接给本地编程 agent + harness"]
```

## 交接给 harness

- 当本地编程 agent 可用时，实现类任务从一开始就进入 `harness`。
- `harness` 可接手：
  - `Implementation PR`
  - `Implementation Plan`
  - 原始需求 / Issue / Research 结论 / 外部分析
- `harness` 负责判断是否已有可执行 plan，以及是否需要补齐或更新 `Research PR`、`Implementation Plan`、`Implementation PR`。
- 后续实现、验证、审查和交付由 `harness` 负责。

## 审查与交付

- 审查评论模板：`.github/codex-review-comment.md`
- 审查评论必须包含明确的 `<base_sha>..<head_sha>`。
- Research PR 如需审查，仍使用同一模板，并在背景或补充信息中明确研究性质和审查重点。
- 本地实现路径中的验证、review、merge 由 `harness` 负责；本文件不展开这些运行时细节。

## 事实来源

| 内容 | 事实来源 |
|---|---|
| 工程硬约束 | 根级和相关子目录 `AGENTS.md` |
| 云端桥接规则 | `docs/specs/agent-workflow.md` |
| 本地实现流程 | `harness` |
| 单次任务上下文 | PR 描述和 PR 评论 |
| 研究结论 | Research PR 描述、评论和 `docs/prs/` 研究报告；不作为长期规范 |
| 代码变更 | Implementation PR |

## 维护边界

- 不为临时发现建立长期文档。
- 不把 Research PR 或 `docs/prs/` 研究报告视作长期规范，除非已经通过独立 Spec PR 固化。
- 不把本地 `harness` 的运行时细节复制到本文件。
- 优先保持本文件短、准、可执行。

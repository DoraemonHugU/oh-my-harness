---
name: harness
description: 用于在 Git 仓库中接手带实现 plan 的实现任务，或将无 plan 的复杂需求收敛为实现 plan 后继续实现。不用于纯问答、纯研究、大型多阶段项目、用户要求跳过流程，或无 plan 的简短任务。
---

# 中文 Harness 工作流

## 定位

- 处理两类任务：已有实现 plan 的实现任务；无 plan 但需要先生成实现 plan 的复杂需求。
- 无可执行 plan 且任务简短时，终止本 skill，回到默认 Codex 模式。
- 只保留执行当前任务所需的最小可靠步骤。

```mermaid
flowchart TD
    A["进入任务"] --> B{"是否有可执行 plan?"}
    B -- "是" --> C["接手 Implementation PR / Plan"]
    B -- "否且简短\n目标/边界/验收清楚，改动局部" --> Z["退出 harness，回到默认 Codex 模式"]
    B -- "否且不简短" --> D["需求对齐并生成 Implementation Plan"]
    D --> C
    C --> E["Worktree 与基线检查"]
    E --> F["只读事实探索"]
    F --> G["需求对齐"]
    G --> H["按计划实现"]
    H --> I["验证"]
    I --> J{"是否支持云端仓库 / PR 审查?"}
    J -- "是且未要求本地审查" --> K["建立或更新 PR\n@codex review"]
    J -- "否或用户要求本地审查" --> L["本地 reviewer 审查"]
    K --> M["处理反馈并重新验证"]
    L --> M
    M --> N["交付"]
```

---

## 硬规则

- Implementation PR 必须带实现 plan。
- 不在 `main` / `master` 上直接实现。
- Research PR 不合并，不在其分支上实现。
- 继续使用 harness 的实现阶段默认使用 `.worktrees/<slug>`。
- 无可执行 plan 且任务简短时，不进入后续 harness 阶段。
- dirty 状态必须先停下汇报；不得默默纳入当前任务。
- 不自动提交、stash、reset、clean 或丢弃文件。
- PR / Plan 是任务边界；不得顺手扩大范围。
- explorer 只读；实现由主智能体完成。
- 没有验证结果和 reviewer 审查结论，不得声称任务完整完成。

---

# 第一阶段：启动与收敛

目标：用最少步骤确认仓库事实、是否继续使用 harness、隔离目录和基线验证入口。

## 1. 仓库状态观测

```bash
git rev-parse --show-toplevel
git status --short --branch
git worktree list --porcelain
```

处理规则：

- 不在 Git 仓库内：停止并说明。
- 工作区 dirty：停止并汇报文件列表；不 stash、不 commit、不 reset、不 clean。
- 当前分支、当前 worktree 和目标任务是否匹配，只记录为后续判断事实；不要在本步骤直接开始实现。

dirty 时再获取必要文件列表：

```bash
git diff --name-status
git diff --cached --name-status
```

## 2. 执行入口确认

先判断是否有可执行 plan。

最小输出：

```md
### 执行入口确认
- 是否有可执行 plan：是 / 否
- plan 来源：Implementation Plan / Implementation PR 引用的 plan / 无
- 上下文来源：Research PR / Issue / 外部分析 / 直接需求 / 无
- 是否继续使用 harness：是 / 否
- 任务边界：
- 阻塞问题：无 / <具体问题>
```

规则：

- 有可执行 plan：Implementation Plan，或带 plan 的 Implementation PR；审阅后执行，不重新生成 plan。
- 无可执行 plan 且任务简短：终止本 skill，回到默认 Codex 模式；不要进入后续 harness 阶段。
- 简短任务同时满足：
  - 目标清楚；
  - 实现边界清楚；
  - 验收方式清楚；
  - 改动局部且可在短上下文内稳定完成。
- 无可执行 plan 且任务不简短：Research PR、Issue、外部分析和直接需求都只作为上下文来源；先做最小需求对齐，再阅读 `refs/writing-plan.md` 生成 `docs/harness/plans/YYYY-MM-DD-<slug>-plan.md`。
- 只有任务边界、目标或验收存在阻塞时才提问；最多 3 个。
- 非阻塞不确定性写入计划的假设或风险；若未生成计划，则写入交付摘要或 PR 描述。

## 3. Worktree 前置

继续使用 harness 时，唯一策略是 `.worktrees/<slug>`。

当前 cwd 已经是目标 implementation worktree 且工作区干净：继续使用当前目录。

其他情况都新建或接手 implementation worktree：

```bash
mkdir -p .worktrees
grep -qxF '.worktrees/' .gitignore 2>/dev/null || printf '\n.worktrees/\n' >> .gitignore
git worktree add ".worktrees/<slug>" -b "<branch-name>" "<base-ref>"
```

```bash
mkdir -p .worktrees
grep -qxF '.worktrees/' .gitignore 2>/dev/null || printf '\n.worktrees/\n' >> .gitignore
git worktree add ".worktrees/<slug>" "<branch-name>"
```

Research PR、`main` / `master` 或明显不匹配任务的分支，都不直接实现；从目标 base 进入 implementation worktree。

后续命令都以 `.worktrees/<slug>` 为工作目录执行；不要依赖 `cd` 持久化。

## 4. 依赖安装与基线检查

进入目标 implementation worktree 后，按项目事实安装依赖。默认示例：

```bash
pnpm install
```

如果 `AGENTS.md`、lockfile 或 README 指定其他命令，以项目事实为准。

安装后运行项目指定的最小基线命令；没有明确命令时，先读取 `package.json`、README、CI 或项目 `AGENTS.md`。

## 5. 进度追踪

继续使用 harness 的实现任务都使用 `update_plan` 维护会话任务列表。

- `update_plan` 只映射当前 plan 文件中的任务；完成步骤后小范围 patch 对应 checkbox。
- 不把 `update_plan` 当长期事实来源；长期事实只写入 PR 描述、计划文件、验证结果或审查结果。

## 6. 只读事实探索

优先使用内置 `explorer` 子智能体做只读事实探索。主智能体可先做少量低噪声预检，例如读取用户点名的文件、搜索明确的符号、确认相关 scripts，再把这些线索交给 explorer。(可并发一至二个)
`explorer`的作用是1. 帮助你收集相关上下文信息 2.可以与你收集的信息进行交叉验证补充

视情况可以跳过 explorer 的，只限于：

- 用户明确禁止使用子智能体；
- 一行级 trivial 修改；
- dirty 边界尚未处理；
- 当前环境无法调用 explorer。

给 explorer 的请求保持清晰，简要充分的上下文背景信息。包含已知背景和目标，不要求固定输出格式。

推荐句式：

```md
你在仓库 `<repo root>/.worktrees/{feature}-xxx` 中，只做只读调研。已知背景：<用户请求、主智能体已确认的线索、dirty/非目标边界>。目标：<需要定位、盘点或核实的内容>。请核实与目标直接相关的文件、调用路径、测试或验证入口，以及仍缺失的事实。不要改代码，不要设计实现方案。
```

示例：

```md
你在仓库 `/path/to/repo/{.worktrees/{feature}-xxx}` 中，只做只读调研。已知背景：用户要迁移小程序 mock 数据；主智能体已定位到 `src/shared/fixtures.ts`、`src/services/mock-api.ts`、`src/services/runtime.ts`，当前不改代码。目标：盘点 `apps/miniprogram` 当前所有 fixtures/mock 假数据入口及其消费路径。请核实真实入口文件、各入口提供的业务数据、被哪些页面/服务消费、哪些已有后端 API 可替换、哪些仍缺后端契约。不要改代码，不要设计实现方案。
```

主智能体收到 explorer 结果后，必须亲自阅读关键文件并自行分析。explorer 的结果是事实索引，不是计划或实现依据。

## 7. 需求对齐

完成事实探索和关键代码阅读后，把事实收敛为执行边界：

```md
### 需求对齐
- 目标：
- 范围：
- 非目标：
- 验收标准：
- 阻塞未确认点：
```

结束条件：

- 目标清楚
- 范围清楚
- 验收标准清楚
- 没有阻塞未确认点

如果探索结果推翻了初始理解，先更新需求对齐；必要时向用户确认。完成需求对齐后，确保已有 plan 文件，再进入第二阶段。

---

# 第二阶段：按计划实现

目标：接管已有实现计划，并由主智能体按计划小步实现。

## 1. 接管实现计划

- 输入是 Implementation Plan：先审阅该计划，再执行。
- 输入是带 plan 的 Implementation PR：先读取 PR 描述和引用的计划，再执行。
- 第一阶段刚生成了 plan：回到该计划文件并执行。

## 2. 实现策略

按当前 plan 的测试策略执行。

> plan 明确采用 TDD 时，加载 `tdd` skill 继续任务

## 3. 主智能体实现

实现阶段由主智能体负责。

执行规则：

```md
# 流程
## 步骤 1：加载并审阅计划
  1. 读取计划文件
  2. 批判性审查 - 确定计划中是否有任何疑问或担忧
  3. 如果有担忧：在开始前与你的人类伙伴提出
  4. 如果没有担忧：调用 `update_plan` 创建或更新会话任务列表并继续

## 步骤2：执行任务
对于每个任务：
  1. 标记为 in_progress
  2. 严格遵循每个步骤（计划包含小步骤）
  3. 同步 `update_plan` 和 plan 文件 checkbox
  4. 运行该步骤要求的局部验证
  5. 标记为完成

## 步骤 3：完成开发
完成所有任务并通过对应局部验证后：

  - 汇总实际变更、验证结果和未解决风险。
  - 对齐实现计划和 Implementation PR 目标，检查是否存在范围漂移。
  - 进入第三阶段进行最终验证、审查和交付。
```
---

# 第三阶段：任务验证和交付

目标：验证改动、审查 diff、处理反馈并交付清晰结果。

## 1. 验证

从直接受影响的代码单元测试开始，再逐步扩展到相关模块的集成测试。验证命令从项目事实中取得，而不是凭空编造。

常见来源：

- `AGENTS.md`
- `package.json` scripts
- `Makefile`
- README
- CI 配置
- 相关测试文件

汇报格式：

```md
### 验证结果
| 命令 | 结果 | 说明 |
|---|---|---|
| `<command>` | pass / fail / not run | <关键输出或原因> |
```

失败处理：

| 情况 | 行为 |
|---|---|
| 相关测试失败 | 回到实现阶段，修复后重跑 |
| 环境缺依赖 | 标记 blocked，不声称完成 |
| 明显既有失败 | 给出证据、命令和影响范围 |
| 验证命令不确定 | 回到第一阶段补充事实 |
| 验证范围不足 | 补充最相关的验证，或明确说明未覆盖风险 |

成功则进入 Reviewer 审查阶段

## 2. Reviewer 审查

### 审查模式选择

- 默认优先云端 PR 审查：仓库支持云端审查，且用户未明确要求本地审查时，建立或更新 PR 后触发云端审查。
- 用户明确要求本地审查：读取 `refs/local-review.md` 并调用 `reviewer` 子智能体。
- 仓库不支持云端审查：回退到本地 `reviewer` 子智能体。

### 通用审查规则

- reviewer 不可用时，Review Gate 未完成；不要以内联自审替代。
- reviewer 判断 patch 不正确时，回到第二阶段修复，然后重新验证和审查。

### 云端 PR 审查

在支持云端审查的仓库中，根据项目要求云端审查评论格式(`.github/codex-review-comment.md`,必须要带有`@codex review`前缀),建立或更新 PR 后提交评论并调用 @codex 进行 review.

#### 接受云端审查评论

发送评论后按以下顺序等待:

1. 必须先等待触发评论出现 `👀 reaction`。未出现 `👀` 前, 不能视为已触发。
2. `👀` 出现后, 继续等待 `chatgpt-codex-connector[bot]` 返回结果评论。等待期间可继续其他 PR 工作, 不要中途停止等待.
3. 结果评论是审查完成的主信号; 没有结果评论时, 不能提前判定“无问题”。
4. 收到结果评论后, 再确认是否产生对应的行内审查评论。
5. 如果结果评论已返回但尚未看到行内审查评论, 先再拉取一次 review / review comments 后再下结论。
6. 如果结果评论明确未发现主要问题, 且没有行内审查评论, 视为云端审查通过。
7. 如果存在行内审查评论, 按 `P0-P3` 规则处理并回到第二阶段修复。

##### 等待评论
```bash
for i in {1..40}; do
  {等待操作}
  sleep 30
done
```
`👀` 出现后继续耐心等待; 云端审查通常在 20 分钟内返回. 若 30 s内没有出现`👀 reaction` 则重发 comment。


### 本地审查(用户要求时使用)

用户要求本地审查时，读取 `refs/local-review.md` 并按其中内容调用 `reviewer` 子智能体。

### 修复规则
1. 先验真并确认 `P0-P3` 级别。 如果怀疑 reviewer 误报，主智能体必须用代码、测试或明确逻辑反证；不能直接忽略。
2. 再按级别处理：
   - `P0/P1`：成立则必须修复。
   - `P2/P3`：默认选修。可顺手修复异味、噪音和低成本一致性问题；如果该问题已阻塞当前 plan 执行，则也必须修复。若不阻塞实现效果，且修复会扩大范围或引入额外复杂度，则可以暂缓，不阻塞当前 PR plan 执行，但最终必须记录。

## 3. 失败回路

失败不是交付说明的一部分，而是回到对应阶段继续处理。

| 触发 | 行为 |
|---|---|
| 分支、dirty、目标、需求或事实定位存在问题 | 回到第一阶段，重新对齐边界、事实和需求 |
| 计划无法覆盖实际问题，或实现、验证、review 发现需要修改代码 | 回到第二阶段修复；必要时更新计划，然后重新验证并重新审查 |
| reviewer 不可用 | 停止完整交付，标记 Review Gate pending |
| 用户改变目标 | 回到第一阶段，重新收敛需求和 diff 边界 |

## 4. 交付

最终交付用结构化 Markdown，汇报事实结果，不输出大段 diff。

```md
## 交付结果

**状态**：done 🎉 / blocked ⛔ / review pending 👀 / implementation complete 🛠️

### 变更摘要
<自然语言描述摘要内容>

### 验证
| 命令 | 结果 | 说明 |
|---|---|---|
| `<command>` | pass / fail / not run | <关键输出或原因> |

### 审查
- Reviewer Gate：passed / failed / pending
- reviewer 结论：
- 已处理的 reviewer 发现：
- 未处理项及原因：

### 后续
- 未解决项：
- 风险或限制：
- 建议下一步：
```

交付规则：

- 验证未运行，就写明未运行原因。
- reviewer 未通过，就不能写 `done`。
- 如果用户只要求实现，可以停在 `implementation complete`，但必须明确验证和审查未完成。
- 不把失败包装成成功。

## 子智能体使用约束

- 默认启用子智能体系统处理只读探索、审查或其他单次无状态工作。
- 在相关子智能体返回前，主智能体不要开始会影响任务边界或实现方向的代码修改。
- 等待子智能体期间，可以继续做只读事实收集，但不要直接开始实现。
- 如果只读任务已完成而相关子智能体仍未返回，可使用 `wait_agent` 长阻塞等待，不要空转。
- 向用户交付前，必须收齐仍相关的子智能体结果；不要带着未收口的子任务结束本轮工作。

**Related skills:**
- **`tdd`** - plan 明确采用 TDD 时，使用 red-green-refactor 循环继续实现
- **`systematic-debugging`** - 遇到 bug、测试失败或异常行为时，先诊断再修复

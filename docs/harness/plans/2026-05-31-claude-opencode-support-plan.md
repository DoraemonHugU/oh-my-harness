# Claude/OpenCode Support Implementation Plan

> **For agentic workers:** 步骤使用复选框（`- [ ]`）语法进行跟踪。

**Goal:** 让 `oh-my-harness init` 能按目标 CLI 初始化 Codex、Claude Code、OpenCode 或全部三者，同时保持 Codex 现有默认行为。

**Architecture:** 在现有 init pipeline 上增加一个 `cli` 目标维度，不重写模板系统。Project instruction 文件按目标 CLI 自动选择：Codex/OpenCode 写 `AGENTS.md`；Claude-only 只写 `CLAUDE.md`；多目标同时包含 Claude Code 和 Codex/OpenCode 时，写共享 `AGENTS.md`，并让 `CLAUDE.md` 只包含 `@AGENTS.md` 引用入口。Skills 按最小交集复制到目标 CLI 能发现的位置；Claude/OpenCode 只安装 reviewer 子代理，不安装 explorer。Codex 专用 agent/config 只在目标包含 Codex 时安装。

**Tech Stack:** Node.js `node:test`、TypeScript、Ink TUI、现有 `performInit` public API。

---

## 文件结构

- 修改 `src/core/types.ts`：新增 `AgentCli` 和 `cliTargets`。
- 修改 `src/core/args.ts`：解析 `--cli <codex|claude|opencode|all>`。
- 修改 `src/core/init.ts`：按目标 CLI 写 instruction 文件、skills 和 Codex 专用 config。
- 修改 `src/core/text.ts`：补充 CLI 选择与 summary 文案。
- 修改 `src/ui/init-wizard-state.ts`、`src/ui/init-wizard-options.ts`、`src/ui/init-wizard.tsx`：新增 TUI CLI 选择步骤。
- 修改测试：`src/core/args.test.ts`、`src/core/init.test.ts`、`src/ui/init-wizard-options.test.ts`、`src/ui/init-wizard-state.test.ts`。
- 修改文档：`README.md`、`docs/agent-init-no-tui.md`。
- reviewer prompt body 真实来源：`agents/reviewer.md`。

## 任务 1：CLI 目标参数

**文件：**
- 修改：`src/core/types.ts`
- 修改：`src/core/args.ts`
- 修改：`src/core/init.ts`
- 测试：`src/core/args.test.ts`

- [x] **步骤 1：写失败测试**

在 `src/core/args.test.ts` 增加测试：`parseArgs(["init", "--cli", "claude", "--no-tui"])` 应得到 `cliTargets: ["claude"]`；未传 `--cli` 时 `resolveInitOptions` 应默认 `["codex"]`。

- [x] **步骤 2：运行测试确认失败**

运行：`npm run test -- src/core/args.test.ts`
预期：TypeScript 或断言失败，因为 `cliTargets` 尚不存在。

- [x] **步骤 3：最小实现**

新增 `AgentCli = "codex" | "claude" | "opencode"`；`ParsedArgs` 和 `InitOptions` 增加 `cliTargets: AgentCli[]`。`--cli all` 展开为三者；未知值抛 `unknownArg`。

- [x] **步骤 4：运行测试确认通过**

运行：`npm run test -- src/core/args.test.ts`
预期：通过。

## 任务 2：按 CLI 安装 instruction 文件和 skills

**文件：**
- 修改：`src/core/init.ts`
- 修改：`src/core/text.ts`
- 测试：`src/core/init.test.ts`

- [x] **步骤 1：写失败测试**

在 `src/core/init.test.ts` 增加两个行为测试：
- `cliTargets: ["claude"]` 时只生成 `CLAUDE.md` 和 `.claude/skills/harness/SKILL.md`，不生成 `AGENTS.md` 或 `.agents/skills/harness/SKILL.md`。
- `cliTargets: ["opencode"]` 时生成 `AGENTS.md` 和 `.agents/skills/harness/SKILL.md`，不 patch `~/.codex/config.toml`。

- [x] **步骤 2：运行测试确认失败**

运行：`npm run test -- src/core/init.test.ts`
预期：失败，因为当前只写 `AGENTS.md` 和 `.agents/skills`，且总是 patch Codex config。

- [x] **步骤 3：最小实现**

把现有 `patchAgentsFile` 泛化为 instruction 文件写入：Codex/OpenCode 写 `AGENTS.md`；Claude-only 写完整 `CLAUDE.md`；Claude 与 AGENTS 系目标共存时，`CLAUDE.md` 写薄引用入口。把现有 `installSkills` 泛化为多个目标根：Codex/OpenCode 使用 `.agents/skills` 或 `~/.agents/skills`；Claude 使用 `.claude/skills` 或 `~/.claude/skills`。`patchCodexConfig` 和 `installAgentFiles` 只在目标包含 Codex 时执行。

- [x] **步骤 4：运行测试确认通过**

运行：`npm run test -- src/core/init.test.ts`
预期：通过。

## 任务 3：TUI 和文档

**文件：**
- 修改：`src/ui/init-wizard-state.ts`
- 修改：`src/ui/init-wizard-options.ts`
- 修改：`src/ui/init-wizard.tsx`
- 修改：`src/core/text.ts`
- 修改：`README.md`
- 修改：`docs/agent-init-no-tui.md`
- 测试：`src/ui/init-wizard-state.test.ts`
- 测试：`src/ui/init-wizard-options.test.ts`

- [x] **步骤 1：写失败测试**

更新 wizard 顺序测试，期望 `target -> cli -> scope`；新增 options 测试，期望 CLI 步骤值为 `codex`、`claude`、`opencode`、`all`、`back`，默认选择当前 `cliTargets`。

- [x] **步骤 2：运行测试确认失败**

运行：`npm run test -- src/ui/init-wizard-state.test.ts src/ui/init-wizard-options.test.ts`
预期：失败，因为尚无 `cli` wizard step。

- [x] **步骤 3：最小实现**

在 TUI 中新增 CLI 选择步骤，并在 confirm/summary/preview 中展示目标 CLI 与多个 skills 目录。README 和 `docs/agent-init-no-tui.md` 增加 `--cli` 示例和最小交集说明。

- [x] **步骤 4：运行测试确认通过**

运行：`npm run test -- src/ui/init-wizard-state.test.ts src/ui/init-wizard-options.test.ts`
预期：通过。

## 任务 4：整体验证

**文件：**
- 修改：计划中的所有文件

- [x] **步骤 1：运行全量测试**

运行：`npm run test`
预期：通过。

- [x] **步骤 2：运行类型检查**

运行：`npm run check`
预期：通过。

- [x] **步骤 3：运行构建**

运行：`npm run build`
预期：通过。

- [x] **步骤 4：dry-run 验证 CLI 输出**

运行：`node dist/cli.js init --cli all --dry-run --no-tui`
预期：summary 中能看到 `AGENTS.md`、`CLAUDE.md`、`.agents/skills`、`.claude/skills`，并保留 Codex config/agents patch 预览。

## 任务 5：Claude instruction 薄入口修正

**文件：**
- 修改：`src/core/init.ts`
- 修改：`src/core/init.test.ts`
- 修改：`README.md`
- 修改：`docs/agent-init-no-tui.md`

- [x] **步骤 1：按 Claude Code import 语义调整生成策略**

`CLAUDE.md` 在多目标共享场景不再复制或 patch `AGENTS.md` 内容，只写入 `@AGENTS.md`。Claude-only 场景没有 `AGENTS.md`，因此直接写入 `CLAUDE.md` 完整模板。

- [x] **步骤 2：补充行为测试**

`cliTargets: ["claude"]` 应只生成 `CLAUDE.md`，不生成 `AGENTS.md`；`cliTargets: ["claude", "opencode"]` 应同时生成 `AGENTS.md` 和内容精确等于 `@AGENTS.md\n` 的 `CLAUDE.md`。

- [x] **步骤 3：同步文档**

README 和 no-TUI 文档区分 Claude-only 与多目标共享场景，不再把所有 Claude 目标都描述为薄入口。

## 任务 6：Claude-only 与多目标自动分流

**文件：**
- 修改：`src/core/init.ts`
- 修改：`src/core/init.test.ts`
- 修改：`README.md`
- 修改：`docs/agent-init-no-tui.md`

- [x] **步骤 1：区分 instruction 文件目标**

Codex/OpenCode 参与时才写 `AGENTS.md`；Claude-only 不写 `AGENTS.md`。

- [x] **步骤 2：按组合生成 Claude instruction**

Claude-only 写完整 `CLAUDE.md`；Claude 与 Codex/OpenCode 共存时，`CLAUDE.md` 写 `@AGENTS.md`。

- [x] **步骤 3：补充组合测试**

测试覆盖 `cliTargets: ["claude"]` 不生成 `AGENTS.md`，以及 `cliTargets: ["claude", "opencode"]` 使用 `@AGENTS.md` 引用共享文件。

## 任务 7：Claude/OpenCode reviewer 子代理

**文件：**
- 修改：`src/core/init.ts`
- 修改：`src/core/init.test.ts`
- 修改：`README.md`
- 修改：`docs/agent-init-no-tui.md`

- [x] **步骤 1：安装 reviewer 而不是 explorer**

Claude Code 目标写 `.claude/agents/reviewer.md` 或 `~/.claude/agents/reviewer.md`；OpenCode 目标写 `.opencode/agents/reviewer.md` 或 `~/.config/opencode/agents/reviewer.md`。不生成 explorer agent 文件。

- [x] **步骤 2：保持 reviewer prompt body 不变**

Claude/OpenCode reviewer 文件只增加平台 frontmatter，正文尾部必须精确等于 `agents/reviewer.md` 的内容。

- [x] **步骤 3：平台模型策略**

Claude reviewer frontmatter 设置 `model: opus`；OpenCode reviewer 不写 `model`，让它继承当前会话模型。

- [x] **步骤 4：补充测试**

测试覆盖 Claude-only、Claude+OpenCode、OpenCode-only 的 reviewer 文件生成，不生成 explorer，并检查 reviewer prompt body 不变。

## 任务 8：非 Codex 模式隔离和卸载文档

**文件：**
- 修改：`src/core/init.ts`
- 修改：`src/core/init.test.ts`
- 修改：`README.md`
- 修改：`docs/agent-init-no-tui.md`

- [x] **步骤 1：过滤 Codex-only 模板**

`--cli claude` 和 `--cli opencode` 不写 `.codex/hooks.json`。`.github/pr-review-comment.md` 是通用 PR review 模板，所有目标 CLI 都会写入。

- [x] **步骤 2：动态生成 `.gitignore` block**

`.gitignore` 只放行当前目标 CLI 会写入的 dot directories：Codex 放行 `.codex`，Claude 放行 `.claude`，OpenCode 放行 `.opencode`，Codex/OpenCode 放行 `.agents`。

- [x] **步骤 3：补删除 / 卸载文档**

当前不实现自动 `uninstall` 子命令；README 和 no-TUI 文档列出按目标 CLI 删除的项目级和全局级路径。

- [x] **步骤 4：明确 prompt 驱动安装边界**

支持 agent 根据 prompt 执行 `init --no-tui`；不支持把任意用户 prompt body 写成 reviewer agent，reviewer 正文固定来自 `agents/reviewer.md`。

## 任务 9：跨平台树刷新 hook

**文件：**
- 修改：`src/core/init.ts`
- 修改：`src/core/init.test.ts`
- 移动：`templates/repo/.codex/hooks/tree.mjs` -> `templates/repo/.oh-my-harness/hooks/tree.mjs`
- 修改：`templates/repo/.codex/hooks.json`
- 新增：`templates/repo/.claude/skills/oh-my-harness-hooks/.claude-plugin/plugin.json`
- 新增：`templates/repo/.claude/skills/oh-my-harness-hooks/hooks/hooks.json`
- 新增：`templates/repo/.opencode/plugins/oh-my-harness-tree.js`
- 修改：`README.md`
- 修改：`docs/agent-init-no-tui.md`

- [x] **步骤 1：迁移共享脚本**

树索引生成逻辑从 Codex 专属 `.codex/hooks/tree.mjs` 迁移到 `.oh-my-harness/hooks/tree.mjs`，`refreshInitialTree()` 也改为调用共享脚本。

- [x] **步骤 2：保留平台触发器**

Codex 保留 `.codex/hooks.json`，Claude Code 使用项目级 `.claude/skills/oh-my-harness-hooks/` skills-directory plugin，OpenCode 使用项目级 `.opencode/plugins/oh-my-harness-tree.js` 本地 plugin。三者触发同一个共享脚本。

- [x] **步骤 3：更新过滤和卸载文档**

非目标 CLI 不写入对应平台触发器；所有目标都会写入 `.oh-my-harness/hooks/tree.mjs`。删除文档补充 `.claude/skills/oh-my-harness-hooks/`、`.opencode/plugins/oh-my-harness-tree.js` 和共享 hook 脚本。

<!--
oh-my-harness: implementation-pr-template
类型：Implementation PR（实现型 PR）
用途：承载最终代码交付。PR 描述用于稳定摘要、边界、验证和风险；详细执行步骤应放在实现计划文件中。

实现计划：
- Implementation PR 必须引用实现计划文件。
- 默认计划路径：docs/harness/plans/YYYY-MM-DD-<slug>-plan.md

边界：
- 本 PR 应是一个原子任务。
- Implementation PR 默认使用普通 PR（非 draft）。
- 不把无关修复、研究备忘或长期讨论塞进本 PR。
- 来源可以是用户需求、Issue、Research PR、外部模型分析或已有计划。
-->

# 实现型 PR

## 概览

<!-- 简述目标、背景、默认行为影响。 -->

本 PR 主要实现：

- 
- 
- 

默认行为：

- 不变 / 有变化：

影响范围：

- 

## 实现计划

<!--
Implementation PR 必须引用实现计划文件。
默认命名：docs/harness/plans/YYYY-MM-DD-<slug>-plan.md
-->

- 计划文件：

## 实现边界

<!-- 描述本 PR 计划覆盖的实现边界，不需要逐行解释代码。 -->

- 
- 
- 

涉及模块 / 文件：

- `path/to/module`
- `path/to/file`

## 非目标

<!-- 明确不在本 PR 中解决的问题。 -->

- 
- 
- 

## 来源上下文

<!-- 用户需求、Issue、Research PR、外部模型分析、历史讨论或已有计划。没有则写“无”。 -->

- 无 / #
- 

## 验证

- [ ] 未运行；原因：
- [ ] `pnpm api:lint`
- [ ] `pnpm verify`
- [ ] `mvn -f apps/backend/pom.xml -B spotless:check pmd:check test`
- [ ] 其他：

手动验证：

- [ ] 
- [ ] 

回归验证：

- [ ] 默认路径行为不变
- [ ] 新增路径按预期生效
- [ ] 异常路径已验证
- [ ] 权限 / 安全边界已验证
- [ ] 不适用；原因：

## 风险与回滚

风险：

- 
- 

缓解措施：

- 

回滚：

- 

## Review 关注点

1. 
2. 
3. 

## Checklist

- [ ] PR 范围清晰，无无关改动
- [ ] 默认行为影响已说明
- [ ] 验证结果已说明
- [ ] 风险与回滚路径已说明

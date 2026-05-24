# AGENTS.md

Telegraph style. Root rules only. Read scoped AGENTS.md before subtree work. Skills own workflows; root owns hard policy and routing.
频繁变化的信息不要复制到这里；改用 `@path/to/file` 指向真实来源。

## 项目定位

- 项目定位：`...`
- 核心技术栈：`...`
- 关键入口：`...`

## 命令

- 非显然的 build 命令：`...`
- 非显然的 test 命令：`...`
- 非显然的 lint / format / typecheck 命令：`...`
- 真实来源：`@package.json` `@Makefile` `@justfile` `...`

## 架构边界

- 关键架构边界：`...`
- 跨目录共享规范：`...`
- 关键入口和不可绕过的边界：`...`

## 地图 MAP

<!-- 默认全量维持一级目录,部分维护重要的二级目录. -->
目录树 tree :

```text
.
```

## 代码边界

- 生成代码目录：`...`
- vendor 目录：`...`
- nested repo / submodule：`...`
- 这些目录允许或禁止的操作：`...`

## 测试约束

- 全仓库 testing quirks：`...`
- 必需的本地依赖、fixture、service 或测试前置：`...`
- 测试真实来源：`@...`

## 环境与初始化

- 必需 setup：`...`
- 必需 env var：`...`
- 本地开发和 CI 共用的初始化前提：`...`

## Repo etiquette

- 提交、PR、review、docs、changelog 的仓库级约定：`...`

## Notes

- 偏好队列中目标为项目级 `AGENTS.md` 的 note 项：`...`


## 工作流

项目开发采用 `PR-FIRST` 工作流。优先加载`$harness` skill 。
相关文件是: `@docs/specs/agent-workflow.md` 


## Review guidelines

如果你是审查者，审查规则在 `@docs/specs/review-guidelines.md`。
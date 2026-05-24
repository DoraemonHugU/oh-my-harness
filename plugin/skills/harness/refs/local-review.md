# 本地审查

完成实现和验证后，必须调用配置好的 `reviewer` 子智能体。

审查请求只需要给 reviewer 必要上下文，不重复规定它的输出格式：

```md
请审查当前仓库 /path/(所在分支) 的未提交变更。

任务目标：<需求对齐摘要>
实现计划：<最终采用或审阅的实现计划>
实现摘要：<实际改了什么>
变更范围：<uncommitted / staged / commit / branch diff>
建议 diff 命令：<例如 git diff HEAD / git diff --cached / git show <sha> / git diff <base>...HEAD> (包含正确的worktree信息)
验证结果：<已运行命令和结果>
特别关注：<用户指定重点；可选>
```

审查规则：

- reviewer 不可用时，Review Gate 未完成；不要以内联自审替代。
- reviewer 判断 patch 不正确时，回到实现阶段修复，然后重新验证和审查。
- 连续审查情况下，优先复用现有的`reviewer`进行审查，但当超过二次连续对话，必须要重新发起一个审查子代理.

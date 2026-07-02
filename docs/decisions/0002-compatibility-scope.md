# 0002 compatibility scope

## Title

把 antd 兼容性定义为真实 API 与行为兼容，而不是无限制复刻所有历史接口

## Status

Accepted

## Context

data-grid 的产品目标是迁移 antd Table 使用场景，但源实现已经改成 CSS Grid。项目既要覆盖 antd demo 和常见业务能力，也要避免为无正常业务价值的历史接口付出长期维护成本。

## Decision

- 兼容目标以 antd v6 的公共 React API、demo 行为和主题生态为主。
- 交付顺序分两步：先覆盖 demo 中实际使用的 API 子集，再补齐剩余公共接口。
- 不实现纯调试或无明确业务用例的兼容接口，例如 `measureRowRender` 一类隐藏测量 API。

## Consequences

- 需要长期维护 [`../reference/compat-matrix.md`](../reference/compat-matrix.md) 和 [`../reference/known-limitations.md`](../reference/known-limitations.md)。
- 某些字段保持“同名但有适配差异”，需要在功能文档中明确指出。
- 与 antd 存在明确分歧时，应优先形成 ADR 或参考文档，而不是把历史任务说明继续留在源码里。

## Related docs

- [`../architecture/overview.md`](../architecture/overview.md)
- [`../reference/compat-matrix.md`](../reference/compat-matrix.md)
- [`../reference/known-limitations.md`](../reference/known-limitations.md)

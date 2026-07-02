# 0010 semantic DOM limits

## Title

semantic DOM 追求槽位和关键 a11y 兼容，但不伪造无效的原生表格结构

## Status

Accepted

## Context

data-grid 采用 CSS Grid 渲染，没有原生 `thead` / `tbody` / `tr` 层级。若为了表面兼容而强行补零散 role 或不存在的 wrapper，只会制造无效 ARIA 和误导性的 DOM 语义。

## Decision

- 保留 `classNames` / `styles` 的大部分逻辑槽位，并在可能范围内对齐 antd。
- 对 `aria-sort`、`aria-colspan`、`aria-rowspan` 等关键属性做实质性补齐。
- 对 `header.wrapper`、`body.wrapper` 和完整 `rowgroup` / `row` 层级保持明确“不完全兼容”的记录，不伪造结构。

## Consequences

- 文档必须同时说明“支持哪些槽位”和“为什么不能再进一步”。
- 语义兼容边界应被视为架构限制，而不是临时任务遗漏。
- 若未来要补全原生 role 层级，需要评估引入逻辑行容器或更大规模重构。

## Related docs

- [`../features/styling/semantic-dom.md`](../features/styling/semantic-dom.md)
- [`../architecture/rendering-model.md`](../architecture/rendering-model.md)
- [`../reference/known-limitations.md`](../reference/known-limitations.md)

# 0001 CSS Grid table architecture

## Title

使用 CSS Grid 作为 data-grid 的表格渲染架构

## Status

Accepted

## Context

项目需要在 React 中重做 antd Table，并同时覆盖列宽、固定列、合并、多级表头、树形、虚拟化和主题 token。原生 `<table>` 结构对显式轨道控制、复杂 sticky 组合和虚拟化布局的约束较多。

## Decision

渲染层采用 React + CSS Grid：

- 使用单一 `.dg-grid` 容器承载表头和表体单元格。
- 不使用原生 `<table>` 作为主渲染结构。
- 对外继续暴露 antd 风格的 React API，而不是把 CSS Grid 细节暴露给调用方。

## Consequences

- 列轨道、隐藏列、固定列、summary 和虚拟化可以共享同一套定位模型。
- semantic DOM 无法完全等价于原生表格，需要单独记录兼容边界。
- `components`、`classNames` / `styles` 和 a11y 需要做 CSS Grid 语义适配。

## Related docs

- [`../architecture/rendering-model.md`](../architecture/rendering-model.md)
- [`../features/layout/layout.md`](../features/layout/layout.md)
- [`0010-semantic-dom-limits.md`](0010-semantic-dom-limits.md)

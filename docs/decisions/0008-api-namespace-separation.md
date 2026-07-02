# 0008 API namespace separation

## Title

把 data-grid 专属 API 收入 `gridOptions` / `gridColumnOptions`

## Status

Accepted

## Context

CSS Grid 架构和拖拽增强引入了一批 antd Table 不存在的能力。如果把这些字段继续放在顶层 `TableProps` / `ColumnType`，会污染兼容层，也会让调用方误以为这些字段可以直接迁回 antd。

## Decision

- 顶层 `TableProps` / `ColumnType` 只保留与 antd 同名同义或同名但必须适配的字段。
- data-grid 专属能力统一进入 `gridOptions` 或 `gridColumnOptions`。
- 第三方能力借鉴后的新命名也只能落在命名空间内。

## Consequences

- 兼容矩阵和类型定义更容易维护。
- 顶层 API 更接近 antd，专属增强的边界也更清楚。
- 迁移现有字段时需要同步更新 demo 和文档，不能只改类型定义。

## Related docs

- [`../reference/grid-options-namespace.md`](../reference/grid-options-namespace.md)
- [`../reference/compat-matrix.md`](../reference/compat-matrix.md)

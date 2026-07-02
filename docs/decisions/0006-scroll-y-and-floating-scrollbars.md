# 0006 scroll y and floating scrollbars

## Title

`scroll.y` 采用数据区模式，横纵滚动统一走悬浮滚动条路径

## Status

Accepted

## Context

CSS Grid 表格需要同时处理固定表头、数据区滚动、summary 和 sticky。把 `scroll.y` 继续解释成 antd 那种数字 `max-height` 会让布局链和滚动条承载点变得混乱。

## Decision

- `scroll.y` 在 data-grid 中表示“启用数据区模式”，取值为 `true` 或未开启。
- 横向滚动条统一使用自定义 FloatingScrollBar，定位在数据区内部。
- sticky 场景下继续走同一条滚动条同步路径，而不是退回原生条。

## Consequences

- 布局模型更稳定，便于处理 fixed header、summary 和虚拟化组合。
- 与 antd 的 `scroll.y = number|string` 语义产生明确差异，需要放进兼容矩阵和限制清单。
- 滚动条定位、hover 和 hit 区规则成为独立功能面，需要专项文档。

## Related docs

- [`../features/scrolling/scrollbar.md`](../features/scrolling/scrollbar.md)
- [`../features/layout/sticky.md`](../features/layout/sticky.md)
- [`../reference/compat-matrix.md`](../reference/compat-matrix.md)

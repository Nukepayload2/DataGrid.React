# 0003 virtualization measurement

## Title

虚拟滚动采用 ResizeObserver 动态测量和 measured-first 行高模型

## Status

Accepted

## Context

data-grid 需要同时支持动态行高、树形、展开和大数据量滚动。只靠固定行高会让展开、合并和复杂内容场景失真，而完全同步测量又会放大滚动成本。

## Decision

- 使用 `ResizeObserver` 测量真实行高。
- 用 `rowSizeSystem`、AATree 和 offsetTree 维护 O(log n) 的尺寸和偏移查询。
- 虚拟窗口采用 measured-first：已测量行优先使用实测值，未测量行回退到 `gridOptions.rowHeight`。
- 展开内容不参与虚拟窗口尺寸计算，窗口仍按收起态行高估算。

## Consequences

- 大部分动态高度场景得到稳定滚动和定位。
- “展开内容不进入窗口尺寸”的策略会留下少量精度和性能权衡，需要在限制文档中保留说明。
- 行高相关 API 和实现细节集中到虚拟化与行高文档。

## Related docs

- [`../features/scrolling/virtualization.md`](../features/scrolling/virtualization.md)
- [`../features/layout/row-height.md`](../features/layout/row-height.md)
- [`../reference/known-limitations.md`](../reference/known-limitations.md)

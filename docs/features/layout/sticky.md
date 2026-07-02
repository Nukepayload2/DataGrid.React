# 页面级 sticky（sticky）

`<Table sticky>` 启用页面级 sticky（表头随页面滚动钉顶，固定列随页面横向滚动钉左/右）。本文说明 sticky 上下文穿透、StickyScrollBar，以及与 antd 的差异。

## sticky 上下文穿透

`.dg-wrapper` 默认 `overflow: hidden`（圆角裁剪）+ `width: 100%`（容器约束），两条都会破坏页面级 sticky：

1. `overflow: hidden` 使 `.dg-wrapper` 成为表头 `position: sticky` 的"非 visible 溢出祖先"（CSS Sticky 规范：sticky 元素相对最近的"可滚动祖先/非 visible 溢出祖先"固定）。`.dg-wrapper` 自身不内部滚动 → 表头 sticky 相对它永不触发，相对 viewport 更不会触发。→ 改 `overflow: visible`，让 sticky 上下文穿透到 window（页面），表头相对 viewport 固定。
2. `width: 100%` 裁切内部 `.dg-grid` 的 `min-width: scrollX`（横向滚动），导致页面横向不滚动（`documentElement.scrollWidth === clientWidth`），fixed-end 列与 StickyScrollBar 全失效。→ 改 `width: auto`，让 `.dg-grid min-width` 撑宽页面，触发页面原生横向滚动。

```css
.dg-wrapper.dg-sticky {
  overflow: visible;
  width: auto;
}
```

## 圆角降级

`overflow: visible` 后 `.dg-wrapper` 不再裁剪，顶部圆角视觉降级（圆角处不再裁切子节点溢出）。优先 sticky 功能正确，圆角视觉可接受降级。

## StickyScrollBar

页面横向滚动时，data-grid 渲染 `StickyScrollBar`（GridTable 内），其 thumb 加 `.dg-sticky-scroll-bar-thumb` 类。hover 变 `--ant-table-scroll-thumb-bg-hover`（fallback `rgba(0,0,0,0.88)`），对齐 antd `sticky.ts:55-57` 的 `&:hover, &-active → backgroundColor: tableScrollThumbBgHover`。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| sticky 实现 | `.dg-wrapper.dg-sticky` 改 overflow/width + 表头/固定列 inline sticky | rc-table 同款 + `.ant-table-affix` |
| 圆角 | overflow:visible 后降级（无圆角裁剪） | antd sticky 也有类似降级 |

## 关联源码

- [`src/table/style/table.css`](../../../src/table/style/table.css) — `.dg-wrapper.dg-sticky`、`.dg-sticky-scroll-bar-thumb:hover`。
- [`src/table/Table.tsx`](../../../src/table/Table.tsx) — `stickyClassEnabled` 判定 + 加 `dg-sticky` 类。
- [`src/table/engine/GridTable.tsx`](../../../src/table/engine/GridTable.tsx) — StickyScrollBar 渲染。

# 页面级 sticky（sticky）

`<Table sticky>` 启用页面级 sticky（表头随页面纵向滚动钉顶；宽表的横向位移不靠页面横向滚动——sticky 视口 `overflow: clip` 裁掉视口外内容，位移由虚拟 scrollLeft + grid transform 承接，见「滚动宿主与横向位移」；固定列格仍带 `position: sticky` 的 `left`/`right`）。本文说明 sticky 上下文穿透、StickyScrollBar，以及与 antd 的差异。

## sticky 上下文穿透

`.dg-wrapper` 默认 `overflow: hidden`（圆角裁剪）+ `width: 100%`（容器约束），两条都会破坏页面级 sticky：

1. `overflow: hidden` 使 `.dg-wrapper` 成为表头 `position: sticky` 的"非 visible 溢出祖先"（CSS Sticky 规范：sticky 元素相对最近的"可滚动祖先/非 visible 溢出祖先"固定）。`.dg-wrapper` 自身不内部滚动 → 表头 sticky 相对它永不触发，相对 viewport 更不会触发。→ 改 `overflow: clip`：`clip` 盒不建立滚动容器（没有 scrollport），sticky 上下文照样穿透到 window（页面），表头相对 viewport 固定；同时溢出仍被裁掉，不产生滚动条。
2. `width: 100%` 把 wrapper 钉死在容器宽度上，内部 `.dg-grid` 的 `min-width: scrollX` 无处铺开。→ 改 `width: auto`：grid 按 `min-width: scrollX` 铺到超宽，超出部分由 sticky 视口 `.dg-sticky-scroll-viewport`（`width: 100%; overflow: clip`）裁掉，外层文档流不被撑宽（`documentElement.scrollWidth === clientWidth`，页面不出原生横向滚动条）。

```css
/* wrapper 层：放开 sticky 上下文 + 裁掉溢出 */
.dg-wrapper.dg-sticky {
  overflow: clip;                      /* 简写 ⇒ 横纵两轴都 clip */
  overscroll-behavior-x: contain;
  overscroll-behavior-inline: contain; /* 同一约束的逻辑轴写法 */
  width: auto;
}

/* grid 的实际横向宿主（ScrollContainer 的 sticky 分支渲染） */
.dg-sticky-scroll-viewport {
  width: 100%;
  overflow: clip;
  overscroll-behavior-x: contain;
  overscroll-behavior-inline: contain;
  touch-action: pan-y pinch-zoom;      /* 浏览器只做纵向 pan，横向手势交给 useGridScrollSync */
}

/* 横向位移：grid 自身 translate，scrollLeft 是虚拟值（GridTable 挂类） */
.dg-sticky-scroll-translated {
  transform: translate3d(calc(var(--dg-sticky-scroll-left, 0px) * -1), 0, 0);
  will-change: transform;
}
```

`clip` 与 `hidden` 一样裁剪、一样不产生滚动条，但**不提供滚动机制**：所以视口的 `scrollLeft` 恒为 0（不是原生滚动条读数），grid 超宽部分被裁在视口外。`overscroll-behavior-x/-inline: contain` 把横向越界手势的滚动链断在表格盒子处，配合视口的 `touch-action: pan-y pinch-zoom`（横向 pan 不交给浏览器）与 `useGridScrollSync` 里横向手势的 `preventDefault()`，页面既不会被横向滚走，也不会收到滚出表格的惯性。

## 圆角与宽表裁剪

`clip` 的裁剪能力与 `hidden` 同值，只是不附带滚动机制 ⇒ `.dg-wrapper` 顶部圆角照旧裁切子节点溢出，sticky 不需要牺牲圆角；宽表超出 sticky 视口的部分同样在圆角框内被裁掉，靠 grid 的 transform 位移把视口外内容送进视口。

## 滚动宿主与横向位移

sticky 模式下 grid 的横向宿主是 `.dg-sticky-scroll-viewport`（`overflow: clip`，由 ScrollContainer 的 sticky 分支渲染；有 summary 时 summary 另起一个同款视口），grid 根节点挂 `.dg-sticky-scroll-translated`。横向位移不来自任何真实滚动容器，而是一份虚拟 `stickyScrollLeft`：`useGridScrollSync` 接横向 wheel（`deltaX`，或 `shift+wheel` 的 `deltaY`）与触摸横向拖动，按 `getStickyMaxScroll(viewport.clientWidth, grid.scrollWidth, grid.clientWidth)` clamp 后在 RAF 里把 `${n}px` 写进 grid 与 summary grid 的 `--dg-sticky-scroll-left`（只写 DOM，不走 React state），translate 取负值把内容推回去。松手速度达 `STICKY_TOUCH_INERTIA_MIN_VELOCITY` 时加 `.dg-sticky-scroll-inertia`，用 1000ms compositor transition 跑惯性。

## StickyScrollBar

横向滚动位置变化时，data-grid 渲染 `StickyScrollBar`（ScrollContainer 的 sticky 分支，GridTable 不直接 import；`position: sticky; bottom: offsetScroll` ⇒ 页面纵向滚动时钉在视口底部），其 thumb 加 `.dg-sticky-scroll-bar-thumb` 类；thumb 宽度/位置按虚拟 scrollLeft 与 `grid.scrollWidth − viewport.clientWidth` 换算，拖动 thumb 回写同一份虚拟 scrollLeft。hover 变 `--ant-table-scroll-thumb-bg-hover`（fallback `rgba(0,0,0,0.88)`），对齐 antd `sticky.ts:55-57` 的 `&:hover, &-active → backgroundColor: tableScrollThumbBgHover`。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| sticky 实现 | 两层 `overflow: clip`（`.dg-wrapper.dg-sticky` ＋ grid 外 `.dg-sticky-scroll-viewport`）+ grid `transform` 模拟横向位移 + 表头/固定列 inline sticky | rc-table 同款 + `.ant-table-affix` |
| 圆角 | `clip` 仍裁剪 ⇒ 顶部圆角不降级（StickyScrollBar 不再打宽表 `min-width`，条按块级布局取容器宽 ⇒ 文档流不被撑宽） | 已安装的 antd 6.4.4 未为 sticky 改 wrapper overflow（`es/table/style/sticky.js`、`radius.js` 无 overflow 声明），无对应降级 |

## 关联源码

- [`src/table/style/table.css`](../../../src/table/style/table.css) — `.dg-wrapper.dg-sticky`（`overflow: clip` + `overscroll-behavior-*: contain`）、`.dg-sticky-scroll-viewport`、`.dg-sticky-scroll-translated`（`--dg-sticky-scroll-left` transform）、`.dg-sticky-scroll-bar-thumb:hover`。
- [`src/table/Table.tsx`](../../../src/table/Table.tsx) — `stickyClassEnabled` 判定 + 加 `dg-sticky` 类。
- [`src/table/engine/ScrollContainer.tsx`](../../../src/table/engine/ScrollContainer.tsx) — sticky 分支渲染 `.dg-sticky-scroll-viewport`（数据与 summary 各一）+ `StickyScrollBar`。
- [`src/table/engine/GridTable.tsx`](../../../src/table/engine/GridTable.tsx) — grid 挂 `dg-sticky-scroll-translated` / `dg-sticky-scroll-inertia`，`min-width: scrollX`。
- [`src/table/engine/useGridScrollSync.ts`](../../../src/table/engine/useGridScrollSync.ts) — 虚拟 `stickyScrollLeft` ＋ RAF 写 `--dg-sticky-scroll-left`（wheel / 触摸 / 惯性）。
- [`src/table/engine/StickyScrollBar.tsx`](../../../src/table/engine/StickyScrollBar.tsx) — 底部固定横向条（`position: sticky; bottom: offsetScroll`），拖动回写同一份虚拟 scrollLeft。

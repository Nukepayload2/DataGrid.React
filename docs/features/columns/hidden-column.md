# 隐藏列（hidden column）

data-grid 用 CSS Grid 的 `0fr` track 实现列隐藏，而非像 antd 原生 `<table>` 那样直接不渲染该列。本文说明该机制、与 antd 的差异，以及一个易踩的坑（0 宽 cell 文本竖排撑高行高）。

## 机制

隐藏列（`column.hidden === true`）的叶子列在 `grid-template-columns` 中仍占一条 track，但大小置为 `0fr`（**track 不删除**，保线号稳定）。该列的单元格 DOM **仍渲染**（维持 grid item 占位以保持线号），但加 `.dg-cell-hidden` 类让内容不可见且不撑大 track。

`.dg-cell-hidden` 各声明的作用（[`src/table/style/table.css`](../../../src/table/style/table.css)）：

- `visibility: hidden`：内容（含 `.dg-cell-inner`）隐藏，但格子本身仍参与布局。
- `overflow: hidden` + `min-width: 0` + `max-width: 0`：把格子内容裁剪到 0 宽，保证 `0fr` track 真实收缩到 0（防内容 overflow 撑大 track 致 `0fr` 失效）。
- `padding: 0`：去除 padding 占用，与 `0fr` track 配合彻底不可见。
- `border: 0`：避免隐藏列残留 1px 边框线。
- `white-space: nowrap`：见下方「特殊情况」。

**为什么 track 不删除（保线号稳定）**：data-grid 是 CSS Grid 渲染，多级表头父分组格的 `grid-column` 范围、固定列 sticky 偏移累加、合并格 `span N` 区间都依赖**列线号**。隐藏 / 显示切换若删除 track 会引起线号跳变，导致这些机制错位。保留 `0fr` track 让线号恒稳：

- **多级表头**：父分组格 `grid-column` 范围不变；隐藏子叶子时父格因其中一条子 track 为 `0fr` 而自动横向收缩（视觉上"跨列范围相应收缩"）。父格本身不加 `dg-cell-hidden`（其 `hidden=false`），靠 track 收缩；若子叶子全部隐藏，父格缩到 0，内容被 `.dg-cell-header-group` 的 `overflow` 裁剪。
- **固定列**：sticky 偏移按叶子列宽累加（`useStickyColumns`）；隐藏列宽度实测为 0（ResizeObserver），自动从累加中"消失"，偏移仍正确。
- **合并**：合并格仍跨原叶子区间，区间内隐藏列 track 为 0，合并格视觉宽度相应收缩。
- **虚拟 / 选择列**：列 track 与行 track 正交，虚拟不受影响；选择列作为普通叶子列参与，同样可被 hidden。

`track` 大小在隐藏 / 显示间切换时，`.dg-grid` 上声明了 `transition: grid-template-columns 0.3s ease`。但 CSS 只能对**可动画尺寸**（px / fr / %）逐项插值——若原宽为内容尺寸（min / max-content），该 track 不参与插值，过渡表现为瞬切（视觉正确但缺动画）。给列设固定 `width`（如 `resizable` demo 拖拽定宽）即可观察到 0.3s 动画。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| 隐藏列 DOM | 仍渲染 th/td DOM（grid item 占位），加 `dg-cell-hidden` 类让内容不可见 | 直接不渲染该列 th/td |
| 列线号 | 保 `0fr` track 占位（线号稳定） | 原生 `<table>` 无线号概念，重渲染 |

两者最终视觉效果一致（隐藏列不可见），机制差异源于 data-grid 用 CSS Grid 而非 `<table>`。过渡动画上两者在本 demo（列无固定 width）均为瞬切。

## 特殊情况：0 宽 cell 文本竖排撑高行高

**触发**：隐藏列后 cell 宽 = 0（`max-width: 0` 等），其内文本内容（如 "New York Park"）会在 0 宽容器里逐字符竖排换行，导致 `.dg-cell-inner` 的 `scrollHeight` 暴涨。

**影响**：`.dg-grid` 为 `display: grid`，行高（`grid-auto-rows` / 实测行高）按**该行内最高 cell** 撑高——隐藏 cell 撑高会把同行可见 cell 被动拉高，整表高度暴涨（这是隐藏列后表格行高暴涨 bug 的根因）。

**解决**：`.dg-cell-hidden` 加 `white-space: nowrap` 让隐藏内容单行布局，溢出部分被 `overflow: hidden` 裁掉，不再撑高 `scrollHeight`。隐藏 cell 本就 `visibility: hidden` 不参与视觉，故 `nowrap` 无副作用。

**实测**："New York Park" 在 0 宽容器逐字符竖排约 11 行、`scrollHeight ≈ 242px`；加 `nowrap` 后单行，行高回到与 antd 一致。

## 关联源码

- [`src/table/style/table.css`](../../../src/table/style/table.css) — `.dg-cell-hidden` 规则（各声明 + `white-space: nowrap`）。
- [`src/table/engine/GridTable.tsx`](../../../src/table/engine/GridTable.tsx) — `colTracks` 把隐藏列 track 置 `0fr`；隐藏叶子列单元格加 `dg-cell-hidden` 类。
- [`src/table/engine/types.ts`](../../../src/table/engine/types.ts) — `EngineColumnNode.hidden` 与 `EngineHeaderCell.hidden` 字段（引擎层）。
- [`src/table/types.ts`](../../../src/table/types.ts) — `ColumnType.hidden` 字段（对外 antd 兼容 API）。

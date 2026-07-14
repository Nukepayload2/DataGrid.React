# 列宽（column width）

data-grid 用 CSS Grid 的 `grid-template-columns` 管理列宽（track 列表），与 antd `<table>` 用 `<colgroup><col>` 的 width 属性不同。本文说明 track 策略、隐藏列的 `0fr` track、过渡动画，以及与 antd 的差异。

## track 策略

`.dg-grid` 的 `grid-template-columns` 由 `GridTable` inline style 注入（来自 `colTracks`），按列 `width` 与 `resizable` 等：

- **无 width 列（auto 模式）**：track min 为 `min-content`，内容可换行被容器约束（不是 `max-content` 单行硬下限）。
- **有 width 列**：`minmax(width, max-content)`，可内容增长撑宽。
- **隐藏列**（`column.hidden === true`）：track 置 `0fr`（详见 [hidden-column.md](hidden-column.md)）。

`.dg-wrapper` 的 `overflow-x: hidden` + `.dg-grid` 的 `width: 100%` 让撑宽内容由内部 `FloatingScrollBar` 承接，不外溢到 wrapper。

## 过渡动画

`.dg-grid` 声明：

```css
transition:
  grid-template-columns 0.3s ease,
  grid-template-rows 0.3s ease;
```

`grid-template-columns` / `grid-template-rows` 都是可动画化的 grid 属性（track size 列表逐项插值）：

- **隐藏列切换**：track 从 `0fr` 过渡到其原宽（数字 px / `0fr→1fr`）得到隐藏/显示的平滑动画。
- **行展开切换**：展开内容 track 从 `0fr`（收起）过渡到 `1fr`（展开），得到展开/收起的平滑动画。

**CSS 限制**：若原宽为 `max-content`（非可动画尺寸），该 track 不参与插值，瞬切。给列设固定 `width`（如 `resizable` demo 拖拽定宽）才能观察到 0.3s 动画。

### 拖拽调整时禁用过渡

`.dg-grid.dg-grid-resizing` 由列宽拖拽流程加上，`transition: none`——避免 0.3s 过渡与实时 width 更新叠加产生抖动/延迟。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| 列宽载体 | `grid-template-columns` track | `<colgroup><col width>` |
| 隐藏列 | 保 `0fr` track（线号稳定） | 直接不渲染该列 |
| 切换动画 | `grid-template-columns` 过渡（CSS 限制见上） | 无原生过渡 |
| 拖拽调整 | inline style 更新 track + 类禁用过渡 | rc-table/resizable 类似机制 |

## 关联源码

- [`src/table/style/table.css`](../../../src/table/style/table.css) — `.dg-grid` 的 `transition`、`.dg-grid-resizing { transition: none }`。
- [`src/table/engine/GridTable.tsx`](../../../src/table/engine/GridTable.tsx) — `colTracks` 生成 track 列表（按 `width`/`hidden`/`resizedWidths` 分支），拖拽中加 `dg-grid-resizing` 类。
- [`src/table/engine/useColumnResize.ts`](../../../src/table/engine/useColumnResize.ts) — 拖拽改宽 hook（`resizedWidths` 映射 + min/max 约束 + `resizingKey`）。

## colTracks 算法（TS 视角）

`GridTable` 在 `useMemo` 内按叶子列映射生成 `colTracks: string[]`，最终 join 为 `grid-template-columns`。每列优先级：

1. **隐藏列** → `'0fr'`（详见 [hidden-column.md](hidden-column.md)）。
2. **拖拽过的列**（`resizedWidths.get(col.key)` 存在）→ `${resized}px`。拖拽后的列固定为受控 px，不参与 1fr 比例分配（用户已明确指定该列宽，不应再被比例伸缩；其余列按各自的 minmax/max-content 策略分剩余）。首次拖拽 max-content 列时，第一次 move 即把该列从 max-content 转为受控 px。
3. 否则按 `col.width` + `tableLayout` + `col.fixed` 分支（见下方策略表）。

### antd 源码 ground truth（已读，不猜）

- `.ant-table table` CSS 恒为 `width:100%`（`ant-design/components/table/style/index.ts:280-286`）。
- horizonScroll（scroll.x 或 fixed 列）时 `<table>` inline `{ width: scrollX, minWidth:'100%' }`（`react-component/table/src/Table.tsx:438-441`）。
- `<colgroup><col style={width, minWidth}>`：`minWidth` 仅 tableLayout==='auto' 时来自 column.minWidth（`react-component/table/src/ColGroup.tsx:33-35`）；`width` = column.width 原样。
- mergedTableLayout：显式 > (fixColumn ? (scroll.x==='max-content' ? 'auto' : 'fixed')) > (fixHeader||sticky||ellipsis ? 'fixed' : 'auto')（`Table.tsx:612-627`）。

### grid-track 策略表

模拟 `<col width>` + `table-layout` 的「绝对 width 列=绝对宽不参与 fr 分配、无 width 列分剩余空间」语义：

| 列形态 | tableLayout=auto | tableLayout=fixed | 备注 |
|---|---|---|---|
| 绝对 width（number / `'100px'`），非 fixed | `minmax(width, max-content)` | `${width}` | auto: min=width 保底，max=content 可增长（对齐 antd `table-layout:auto` 下 `<col width>` 列宽=content 但至少 width） |
| 绝对 width，fixed 列 | `${width}` | `${width}` | fixed 列**不论 tableLayout 一律严格 `${width}`**（不包 minmax，内容超 clip/ellipsis）。对齐 antd 6.4.4 实测：fixed 列恒严格 width，即便 mergedTableLayout 派生为 'auto'（fixColumn + scroll.x==='max-content' 场景，如 fixed-columns-header demo）也不被长内容撑开 |
| 百分比 width（`'20%'`） | 原样 `${width}` | 原样 `${width}` | 不包 minmax——antd 不转换；grid `grid-template-columns: 20%` 相对容器 20%，语义一致。minmax 包装百分比在 grid 里 min/max 同为百分比无意义 |
| 无 width，非 fixed | `minmax(min-content, 1fr)` | `minmax(0, 1fr)` | auto: min=min-content（内容可换行收缩保底，下限=最长不可拆词）/ max=1fr（拉伸填满剩余）。fixed: min=0 收缩触发 ellipsis / max=1fr 均分剩余 |
| 无 width，fixed 列 | `minmax(0, 1fr)` / `minmax(min-content, 1fr)` | 同左 | 无 width 的 fixed 列（如 fixed-gapped-columns 的 Column1 fixed:start 无 width）仍走无 width 分支（保持原 minmax 行为）——antd 该列实际也按内容/auto 布局，无声明 width 不可严格 |

### 历史踩坑（已修）

- **auto 无 width 列曾用 `max-content`**：CSS grid 中 `max-content` track 不会拉伸填满容器——antd `table-layout:auto`+`<table width:100%>` 行为下无 width 列被拉伸吃掉剩余空间（实测 tree-data Name: antd 381 拉伸填满 vs data-grid 142.7 内容宽不填满）。改为 `minmax(min-content, 1fr)`：min 保底内容宽，max=1fr 在容器有剩余时拉伸填满。
- **min 曾用 max-content**：max-content min 是单行内容宽硬下限，窄视口下内容永不换行、撑开溢出原生横滚条。把 min 收紧为 min-content（下限=最长不可拆词），让内容可换行被容器约束、grid 不溢出（max=1fr 仍负责容器有剩余时拉伸填满）。
- **fixed 模式 width 列曾用 `minmax(width, 1fr)`**：所有列平等参与 1fr 分配 → virtual-list 9 列全等分为 222px，而 antd 是 width 列绝对宽 + 无 width 列分剩余。改为 `${width}` 绝对 track。

### `.dg-grid { width: 100% }` 配合

约束表格总宽=容器宽：width 列绝对 track 之和 >容器 时出横滚；<容器 时剩余由无 width 列的 1fr 撑满（修 basic Action 截断 + narrow 均分）。**sticky 模式例外**：sticky 下**不加** width:100%（保留 width:auto）——sticky 需页面级横向滚动，width:100% 会把 grid 约束在 .dg-wrapper（dg-sticky 下已 width:auto=视口宽），虽然 min-width:scrollX 仍能撑宽，但为保持 sticky 既有行为零回归，sticky 路径完全不动（详见 [../layout/sticky.md](../layout/sticky.md)）。

## 拖拽调整列宽（resizable）

`useColumnResize` 维护"用户拖拽后的列宽映射"（`resizedWidths: Map<key, px>`），GridTable 在算 `grid-template-columns` 时**优先取此映射**（覆盖 `column.width`）。拖拽手势共用模式见 [../interaction/drag-sort.md](../interaction/drag-sort.md)。

### 首次拖拽 max-content 列

若列原宽为 `max-content`/未给 width，GridTable 算 track 时本来用 `max-content`。拖拽开始时读到的起始宽度是该 track 的实际渲染 px（`getBoundingClientRect().width`，而非 `column.width`——因为 `max-content` 列的 px 值不可从 props 直接得到），然后立即在第一次 move 时写入具体 px → 列从 `max-content` 转为**受控 px**，后续按 px 调整。

由 GridTable 在算 colTracks 时 `resizedWidths.get(key) ?? toTrack(col.width) ?? 'max-content'` 实现。首次拖拽 max-content 列时，第一次 move 即把该列从 max-content 转为受控 px。

### min/max 约束

默认 min=30（防止拖到 0 导致列消失；参数可配），max=Infinity（不限制过宽）。`minWidth`/`maxWidth` 可为 number（统一）或函数（按列 key 逐列定制）。move 中 `newWidth = clamp(startWidth + delta, min, max)`。

### 拖拽中禁用过渡

`resizingKey !== null` 时 GridTable 给 `.dg-grid` 加 `dg-grid-resizing` 类 → `transition: none`（详见上方「拖拽调整时禁用过渡」），避免 0.3s 过渡与实时 width 更新叠加产生抖动/延迟。

### 与各能力组合

- **多级表头**：只有叶子表头格有 resizer；分组表头格无手柄（调用方按 `cell.isLeaf` 渲染）。父分组格 `grid-column` 范围不变（线号稳定），子叶子宽变 → 父格自动跟随收缩/展开。
- **固定列**：列宽变化 → `useStickyColumns` 的 ResizeObserver 实测到新宽 → 重算 sticky 偏移，固定列随之正确。无需 `useColumnResize` 额外处理。
- **合并格**：合并格仍跨原叶子区间；区间内某叶子宽变 → 合并格视觉宽随之变（线号不变）。
- **虚拟**：列 track 与行 track 正交；拖列宽不影响虚拟行渲染窗口。
- **隐藏列**：`0fr` track 的列不渲染 resizer（调用方按 `!cell.hidden` 决定）。

### 性能

拖拽期间每次 pointermove 触发一次 setState（`resizedWidths` 新 Map）→ GridTable 重算 `grid-template-columns`（O(cols)）+ 重渲染。对典型表格（<50 列）每帧开销可忽略，流畅无抖动。

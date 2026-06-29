# 固定列（fixed column）

data-grid 用 CSS `position: sticky` 实现固定列（左固定 / 右固定），与 antd rc-table 同款 sticky 机制。本文说明 sticky 容器、z-index 层叠、边缘阴影（::after 浮层机制）、bordered 组合，以及与 antd 的差异。

## sticky 容器

sticky 需要一个"可滚动祖先"。`GridTable` 在 `scroll.x` 或存在 fixed 列时包一层 `.dg-scroll`（`overflow-x: auto`）。`.dg-grid` 自身不滚动，sticky 子元素相对 `.dg-scroll` 固定。

## z-index 层叠

横向滚动时固定列盖住普通列：

| 元素 | z-index |
|---|---|
| 普通表体格 | auto（默认） |
| 固定表体格 `.dg-cell-fixed-*` | 2（inline style 也设） |
| 固定表头格 `.dg-cell-header.dg-cell-fixed-*` | 3 |
| 表头纵向 sticky `.dg-cell-header-vsticky` | 4（inline style） |
| corner cell（表头固定列，横向+纵向双 sticky） | 5（最高，保证横向+纵向滚动时始终盖住下层） |

注：表头格与表体格同处一个 grid，纵向层叠只在"表头格 vs 表体格"重叠时才需要，而本阶段表头与表体行 track 不重叠，z-index 主要服务于横向滚动遮挡。

## 不透明背景

固定列横向滚动时必须有不透明背景才能盖住底层滚动内容（非 hover 态下 `.dg-cell` 透明）：

- 固定表体格 `.dg-cell-fixed-*`：`background: var(--dg-body-bg)`
- 固定表头格 `.dg-cell-header.dg-cell-fixed-*`：`background: var(--dg-header-bg)`
- hover 时固定列也保持不透明底色（覆盖 `.dg-cell-body:hover` 的 row-hover-bg）：`.dg-cell-fixed-*.dg-row-hover` → `--dg-row-hover-bg`

## 边缘阴影（::after 浮层机制）

固定侧"靠内"边界格（start 侧最右列 / end 侧最左列）加 `.dg-sticky-shadow-start` / `.dg-sticky-shadow-end`，画 30px 宽淡阴影提示其后还有可滚动内容。**阴影画在中间区域（暗中间列），固定列自身不暗**。

### 正确机制（复刻 antd 6.4.4 fixed.ts 的 ::after 浮层）

antd `sharedShadowStyle`（fixed.ts:24-32）用一个 30px 宽的 `::after` 绝对定位浮层（`position: absolute; top:0; bottom:-lineWidth; width:30px; pointer-events: none`），box-shadow inset 作用在**浮层**上：

- start 侧：`::after { left: 100% }`（浮层左边界 = cell 右边界，向中间区域延伸 30px）；`box-shadow: inset 10px 0 8px -8px`（浮层**左内沿**作画，阴影从 cell 右沿向中间区域扩散）。
- end 侧：`::after { right: 100% }`（浮层右边界 = cell 左边界，向中间区域延伸）；`box-shadow: inset -10px 0 8px -8px`（浮层**右内沿**作画）。

⇒ 阴影画在中间区域（暗中间列），固定列自身不暗。

### 为何必须用 ::after 浮层（不能用 cell inset/outset）

直接在 cell 上用 `inset` box-shadow 不行——inset 阴影**恒裁在 cell 盒子内**（无论 ±10px，都画在 cell 自己内部），暗的是固定列自己（与 antd 镜像）。`::after` 浮层独立于 cell，且不受未来 cell 加 `overflow: hidden` 裁剪影响（`.dg-cell-inner` 已 `overflow: hidden`，若把阴影移到 inner 上 outset 会被裁，::after 浮层永远安全）。

## bordered 组合边框

antd `bordered.ts:74-78` 仅给 fix-right-first 补 `${componentCls}-cell-fix-right-first::after { borderInlineEnd: tableBorder }`（右固定集群左边缘）。data-grid 等效：

- `.dg-sticky-shadow-end`（右固定第一列）：补 `border-inline-start`（右固定集群左边缘）。
- `.dg-sticky-shadow-start`（左固定最后一列）：补 `border-inline-end`（防御性，确保横向滚到尽头时左固定集群右边缘一定有边框，不依赖下方普通列是否对齐；与 antd 此处有冗余但视觉一致）。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| sticky 实现 | `position: sticky` + `.dg-scroll` 容器 | rc-table 同款 sticky + `.ant-table-content` |
| 阴影机制 | `::after` 浮层（精确复刻 antd fixed.ts） | `::after` 浮层 |
| 阴影显隐 | 恒显（纯 CSS，不脚本监听 scrollLeft） | `react-component/table/src/Table.tsx` 监听横向 scroll，滚到最左 start 阴影隐藏、滚到最右 end 阴影隐藏（`shadowStart`/`shadowEnd`） |

**已知差异（unfixable）**：data-grid 两侧阴影恒显，滚到尽头时固定列边缘仍有一道极淡阴影线（antd 没有）。阴影很淡（8px 模糊 + `colorSplit` 0.06 alpha），不破坏视觉，反而始终提示固定列边界。如需完全一致须加 scrollLeft 监听（违反"不脚本监听"约束）。

## 关联源码

- [`src/table/style/table.css`](../../src/table/style/table.css) — `.dg-cell-fixed-*`、`.dg-cell-header.dg-cell-fixed-*`、`.dg-sticky-shadow-*::after`、`.dg-wrapper.dg-bordered .dg-sticky-shadow-*` 规则。
- [`src/table/engine/GridTable.tsx`](../../src/table/engine/GridTable.tsx) — 计算 sticky offset、给 edge cell 加 `.dg-sticky-shadow-*` 类。
- [`src/table/engine/useStickyColumns.ts`](../../src/table/engine/useStickyColumns.ts) — sticky 偏移按叶子列宽累加（隐藏列宽实测 0 自动消失）。

## sticky 偏移逻辑（TS 视角）

`useStickyColumns` 按 left（'start'）/ right（'end'）分组累加叶子列宽算 `position:sticky; left/right`，ResizeObserver 监听叶子表头格宽度变化重算。

### 两路径统一

sticky 偏移按叶子列算；flat 路径（auto-flow）和 multi 路径（显式定位）均通过同一套 `leafSticky` 数组取值（`leafSticky[colIdx]`）。表头格（multi 路径分组格）的 sticky 信息由 hook 计算（`headerSticky`）：分组格仅当其叶子区间全部同侧固定时才 sticky。

### 合并 sticky 样式（横向 + 纵向）

`HeaderCell` / `ColumnCells` 内合并 sticky 样式：

- `horizontalSticky`（来自 `stickyHeaderCellStyle(sticky)`）：横向 left/right + zIndex 3。
- `verticalSticky`：纵向 top + zIndex 4。两种来源：
  - `stickyHeaderOffset !== undefined`（页面级 sticky，相对 viewport）：`top: stickyHeaderOffset + rowTopOffset`。
  - `headerStickyTop === true`（容器内 sticky，相对滚动容器顶部）：`top: rowTopOffset`（其中 `rowTopOffset = headerStickyTopOffset ?? 0`）。
  - 两者互斥（sticky 启用时 `headerStickyTop` 恒 false）。
- `rowTopOffset`（`headerStickyTopOffset`）：多级表头各表头行分层 sticky 的逐行累计偏移（`useHeaderRowHeights` 运行时测量），避免多行表头全堆叠在 top:0 重叠。单行表头传 0。

### corner cell 双 sticky + 最高 z-index

横向 + 纵向同时存在时（`hasHorizontalSticky && hasVerticalSticky`），该格取**最高 z-index（5）**，保证横向滚动时始终盖住"只纵向 sticky 的中间表头格"（z-index 4）与"只横向 sticky 的固定列表头格"（z-index 3）。

修复 bug：原实现 corner cell 取纵向 z-index（4），与中间表头格（4）相同，DOM 后渲染的中间表头格横向滚动时会盖住 corner cell。

z-index 层级：普通(auto) < 表体固定列(2) < 表头固定列(3) < 表头顶部(4) < corner 双 sticky(5)。

### 边缘阴影

固定侧"靠内"边界格（start 侧最右一列 / end 侧最左一列）加 `dg-sticky-shadow-start` / `dg-sticky-shadow-end` 类（由 `shadowClass(info)` 加，`info.isEdge` 来自 `useStickyColumns`）。画 30px 宽淡阴影提示其后还有可滚动内容。

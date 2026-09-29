# 表头（header）

data-grid 的表头格（含多级表头分组格、叶子表头格、表头分割竖线、跨列叶子表头格居中）视觉对齐 antd 6.4.4。本文说明多级表头分组格、表头分割竖线机制、colspan 对齐、表头格 key 派生、表体单元格合并，以及与 antd 的差异。

## 表头格基础

`.dg-cell-header`（表头格基类）：

- 底色 `--ant-table-header-bg`（= `--ant-table-header-bg`，默认 #fafafa）。
- 文字色 `--ant-table-header-color`（= `--ant-table-header-color` = colorTextHeading）。
- `font-weight: 600`（antd 表头加粗）。
- `border-bottom: var(--ant-line-width) var(--ant-line-type) var(--ant-table-border-color)`（表头底部 1px 分割线）。
- `transition: background-color 0.2s ease`（hover/sort 背景过渡）。

## 多级表头分组格

`.dg-cell-header-group`（跨多列的父表头格）：

- `justify-content: center`（分组格通常居中，由 JS 内联 `textAlign=center` 实现）。
- `overflow: hidden`（防御性裁剪：当分组格的子叶子全部隐藏，track 全为 `0fr` 时，父格内容需被裁剪避免溢出到邻格）。
- **非 bordered 模式**：`border-bottom: 0`（抹掉继承自 `.dg-cell-header { border-bottom }` 的底边，对齐 antd `index.ts:336-338` `> tr:not(:last-child) > th[colspan] { borderBottom: 0 }`——多级表头中间无横线，仅最底层叶子表头底部一条分隔线）。
- **bordered 模式**：由 `.dg-wrapper.dg-bordered .dg-cell-header-group` 画回底边（对齐 antd `bordered.ts:64-66` `> thead > tr:not(:last-child) > th { borderBottom: tableBorder }`）。

## 表头分割竖线（仅叶子表头格）

对齐 antd `index.ts:322` 的 `::before` 实现：在叶子表头格右侧画 1px 竖线（`inset-inline-end: 0; width: 1px; height: 1.6em`，颜色 `--ant-table-header-split-color` = `--ant-table-header-split-color`）。

### antd 规则

```
thead > tr > th, > tr > td
  &:not(:last-child)
   :not(selection-column)
   :not(row-expand-icon-cell)
   :not([colspan])::before
```

即只有"无 colspan 的表头格"（叶子表头格）才画，且**排除选择列与展开列**（antd 视觉：勾选格/展开格右侧无竖线）+ 分组表头格（带 colspan）不画，+ `:not(:last-child)` 排除该 th 在其父 `<tr>` 中的最后一个。

### data-grid 复刻差异（grid 容器扁平，不能直接照搬 :last-child）

- 用 `[data-leaf-index]` 标识叶子表头格（单层快速路径 + 多级表头路径都设此属性，分组格不设）。
- 排除 selection/expand 列：用属性选择器 `[data-column-key='__dg_selection__']` / `[data-column-key='__dg_expand__']`。
- **不能用 `:not(:last-child)`**：data-grid 的 `.dg-grid` 容器扁平（表头格 + 表体格同为直接子节点），`:last-child` 恒指最后一个表体格，对表头格永远为真 → 末列表头格会误画。故由引擎打两个标记，CSS 用 `:not()` 排除：
  - `data-leaf-last`：全局末列（单层末列 + 多级表头叶子层末列）。由 `columnTree.markLastLeaves` 算 `cell.isLastLeaf` → `GridTable` HeaderCell 设属性；单层路径由 `ColumnCells` 的 `isLastLeaf` prop 设。
  - `data-group-last`：多级表头分组右边界（某跨越 ≥2 叶子的分组表头格的最右叶子）。由 `cell.isGroupLastLeaf` 算。对应 antd 多级表头视觉：分组最右叶子右缘不画分隔线。
- 排除跨列叶子表头格：`:not([data-header-colspan])`（对齐 antd `:not([colspan])`）。

完整选择器：

```
.dg-cell-header[data-leaf-index]
  :not([data-leaf-last])
  :not([data-group-last])
  :not([data-column-key='__dg_selection__'])
  :not([data-column-key='__dg_expand__'])
  :not([data-header-colspan])::before
```

## colspan 居中

跨列叶子表头格（`data-header-colspan`，`headerColSpan >= 2`）默认居中，对齐 antd `index.ts:318-320` `thead th[colspan]:not([colspan='1']) { textAlign: 'center' }`。

- antd 无条件给所有跨列表头格居中；data-grid 仅在列未显式声明 align 时居中（`:not([data-align])`——显式 align 优先）。
- 仅作用于表头格；表体合并格遵循列 align，不受影响。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| 表头容器 | 同一 `.dg-grid`（grid item） | `<table>` 内 `<thead><tr><th>` |
| 末列竖线判定 | 引擎打 `data-leaf-last` / `data-group-last` 标记 + CSS `:not()` | `:not(:last-child)`（tr 内末位 th） |
| 分组格底边 | 非 bordered `border-bottom: 0`，bordered 补回 | `> tr:not(:last-child) > th[colspan] { borderBottom: 0 }` |

## 关联源码

- [`src/table/style/table.css`](../../../src/table/style/table.css) — `.dg-cell-header`、`.dg-cell-header-group`、`.dg-cell-header[data-leaf-index]::before` 分割竖线、`.dg-cell-header[data-header-colspan]` 居中。
- [`src/table/engine/GridTable.tsx`](../../../src/table/engine/GridTable.tsx) — HeaderCell 设 `data-leaf-index` / `data-leaf-last` / `data-group-last` / `data-header-colspan` 属性；ColumnCells 单层快速路径设同款属性。
- [`src/table/engine/columnTree.ts`](../../../src/table/engine/columnTree.ts) — `markLastLeaves` 算 `isLastLeaf` / `isGroupLastLeaf`。

## 表头渲染路径（TS 视角）

`GridTable` 有两条表头渲染路径：

### 1. flat 快速路径（`ColumnCells` 组件）

单层表头（无 columnTree / maxDepth=1）且无合并 / 虚拟 / 展开 / 树形 / summary / empty / components.body.row。用 `grid-auto-flow:column`，每列 DOM 连续：`ColumnCells` 渲染一个列的表头格 + 每数据行格。

- 表头分隔线：`isLastLeaf` prop（来自 `colIdx === leafColumns.length - 1`）→ `data-leaf-last`。
- 无 `data-group-last`（单层无分组）。

### 2. multi 多级表头路径（`HeaderCell` 组件）

columnTree 提供且 maxDepth>1，或任一能力要求显式定位。表头格 / 数据格都用**显式** `grid-column` / `grid-row` 定位（来自 `columnTree.flattenHeaderCells`）。

- 关闭 `grid-auto-flow:column`（用默认 row 流，配显式定位最稳），避免父表头跨列放置错乱。
- `grid-template-rows`：表头部分 = `maxDepth` 行（统一 `headerHeight`），数据行跟在其后。
- 表头格 `grid-column` / `grid-row` 来自 `columnTree`（`gridColumnStart`/`gridColumnEnd`/`gridRowStart`/`gridRowEnd`）。
- 跳过 `covered` 表头格（被前面的 `colSpan>1` 表头覆盖，不渲染 DOM）。
- 表头分隔线：`data-leaf-last`（全局末列）+ `data-group-last`（分组右边界）由 `columnTree.markLastLeaves` 算出。
- 跨列叶子表头格（`headerColSpan >= 2`）设 `data-header-colspan`，CSS `:not([data-header-colspan])::before` 排除跨列表头格的分割竖线。

### 两路径统一行为

- 叶子表头格携带 `data-leaf-index`（供 `useStickyColumns` 的 ResizeObserver 测量列宽）。
- 排序 / 筛选 / ellipsis / sticky 等表头格能力在两路径下行为一致（HeaderCell 与 ColumnCells 同款逻辑）。
- `headerColumns`：`onHeaderRow(columns, index)` 的 columns 参数，两路径统一传**顶层列 raw**（多级表头简化为顶层列）。

## 表头格 key 派生（不二次前缀拼接）

`flattenHeaderCells` 产出的表头格 `key` **直接用 `node.key`**——由适配层 `Table.tsx` 在构建列树时已统一算好：

- 叶子节点 key = 自身 key/dataIndex 或匿名 `col-N`。
- 分组节点 key = 完整路径（如 `Other.Age`）。

**不**在 `flattenHeaderCells` 内对分组格做 `${parentKeyPath}/${node.key}` 二次前缀拼接。原因：`node.key` 本身已是完整路径（适配层 `hasChildren` 分支存的 path），二次拼接会导致路径重复（如 `Other` → `/col-0`，`Address` → `/col-0/col-0/col-0`），且分隔符 `/` 与其它 key 冲突（曾导致 grouping-columns demo 报 `h-/col-0` 重复 warning）。直接用 `node.key` 即正确、唯一。

## 嵌套叶子 sortKey / filterKey

多级表头下嵌套叶子的表头格 `key`（= 完整路径，如 `Other.Age`）与排序/筛选引擎匹配的 `column.key ?? dataIndex`（如 `'age'`）**不同**——若按 `key` 匹配会导致点击排序/筛选无响应（`useSorter` 按 `resolveColumnSortKey(c) === columnKey` 查找列）。

`flattenHeaderCells` 在表头格上额外携带 `sortKey` / `filterKey`（解析自 `node.raw`，算法与 `column.key ?? dataIndex` 一致）：GridTable 点击排序时传 `sortKey`、应用筛选时传 `filterKey`，而非 `key`。顶层叶子（无 parentPath）两者恰好相等，零回归。`sortKey` 仅叶子表头格有值（分组格不消费排序）；`filterKey` 叶子格与分组格**都有值**（分组格是漏斗宿主，见 [filter-sorter.md](../interaction/filter-sorter.md)）。

## 表体合并（colSpan / rowSpan）

表体单元格合并由 `cellMerge.computeCellMergePlan` 算出一份 `CellMergePlan`（`colCount × rowCount` 矩阵），渲染层据此决定每格是否渲染 DOM + grid 跨列/跨行范围。

### 算法

1. **声明阶段**：对每个 `(colIdx, rowIdx)`，调 `column.onCell(record, rowIdx)` 取 `{ colSpan, rowSpan }`；缺省 1/1；负数/NaN 视为 1。
   - `colSpan === 0` 或 `rowSpan === 0`：用户主动声明该格被覆盖 → 标 `hidden=true`（且不作为合并左上角，不向下/右扩展覆盖）。
2. **覆盖传播阶段**：扫描每个**非隐藏**格，若其声明 `colSpan >= 2` 或 `rowSpan >= 1` 组成的矩形覆盖区域（不含自身），把区域内所有格标 `hidden=true`。被覆盖格的 colSpan/rowSpan 不参与后续扩展（即只允许"第一层"合并传播，与 antd 行为一致——合并区域内不会再嵌套合并）。
   - 边界裁剪：覆盖区域若超出列数/行数，自动截断（与 antd 行为一致：合并区域不能越过末列/末行）。

### 键约定

`colSpan === 0` 或 `rowSpan === 0` 表示"被覆盖格不渲染"，等价 `hidden=true`。`hidden` 字段是渲染层的主判断；colSpan/rowSpan 仅对非隐藏格有意义。

### 渲染层协调

`cellMerge` 只产出"逻辑合并元数据"（每格 hidden + colSpan/rowSpan），**不**触碰 grid 线号。渲染层（GridTable）据此：

- `hidden === true`：**跳过该格的 DOM 渲染**（不占 grid 位置）。
- 否则：在 multi 路径下用 `grid-column: <startCol> / span <colSpan>` + `grid-row: <startRow> / span <rowSpan>` 放置（显式定位，与表头格共享同一套线号）。

**关键**：被覆盖格**完全不渲染 DOM**（而非渲染一个 0 大小的占位 div）——这是 grid 布局下避免空洞/重叠的最稳做法：grid 显式定位下，不存在的 grid item 不影响其它 item 的放置。

### 约束

- 仅支持"矩形合并"（colSpan×rowSpan 是一个完整矩形），不支持 L 形/嵌套合并。
- 合并区域内禁止再声明合并（行为未定义；antd 同样不支持）。
- 跨越末列/末行的部分会被自动裁剪（不报错）。

## 关联源码（补充）

- [`src/table/engine/cellMerge.ts`](../../../src/table/engine/cellMerge.ts) — `computeCellMergePlan` 表体合并元数据计算。
- [`src/table/engine/columnTree.ts`](../../../src/table/engine/columnTree.ts) — `flattenHeaderCells` 表头格 key 直接用 `node.key`；嵌套叶子 `sortKey` / `filterKey` 解析。

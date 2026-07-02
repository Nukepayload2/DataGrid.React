# bordered 边框

`<Table bordered>` 模式下表格外框 + 单元格竖边框。本文说明 data-grid 的简化整框方案、单元格竖线、嵌套表隔离、圆角补全，以及与 antd 三层组合方案的差异。

## 外框（简化整框）

antd `bordered.ts:39-52` 的外框由三部分拼成（非整框）：

| antd 部分 | border |
|---|---|
| title | `border: tableBorder; borderBottom: 0`（顶+左+右，无底——底靠 container 的 borderTop） |
| container | `borderInlineStart: tableBorder; borderTop: tableBorder`（仅左+顶） |
| footer | `border: tableBorder; borderTop: 0`（底+左+右，无顶） |
| 组合 | 顶（title 或 container）+ 左 + 右 + 底（footer 或末行 cell border-bottom）——完整外框 |

**data-grid 简化方案**：直接给 `.dg-wrapper` 整框 `border: var(--dg-border)`：

- 内部 `.dg-title` / `.dg-footer` 仅画"与表体之间的分隔线"（border-bottom / border-top），左/右/顶/底边缘靠 wrapper 自身整框。
- 末行 cell 的 `border-bottom` 与 wrapper 底框在 border-box 下重叠（视觉 1px，无双线）；末列 cell 的 `border-inline-end` 与 wrapper 右框同理重叠。
- DOM 结构更简洁（grid 无 antd 三层 container/title/footer 包裹）。

## 单元格竖线

antd `bordered.ts:57-60`：所有 th/td（含末列）均设 `borderInlineEnd: tableBorder`。data-grid 等效：`.dg-wrapper.dg-bordered .dg-cell { border-inline-end: var(--dg-border) }`。

- 选择器 `.dg-cell` 涵盖表头格 / 表体格 / summary 格 / 固定列格——所有 grid item 统一竖线。
- `.dg-title` / `.dg-footer` 非 `.dg-cell`（块级 div），不画竖线（与 antd 一致：title/footer 无竖线，仅水平分隔线）。

## 嵌套表隔离

后代选择器 `.dg-wrapper.dg-bordered .dg-cell` 会泄漏到嵌套子表 cell（子表整体位于主 bordered wrapper 内部）。组合矩阵：

| 组合 | 主表 | 子表 | 行为 |
|---|---|---|---|
| A | bordered | bordered | 子表自身 `.dg-bordered .dg-cell` 合法命中→保留竖线 |
| B | bordered | 非 bordered | 本规则修复——重置子表非 bordered 的 cell 竖线为 0（对齐 antd bordered.ts：子表 bordered=false 时其 th/td 无 borderInlineEnd） |
| C | 非 bordered | bordered | 主表非 bordered，外层选择器不匹配→无影响 |
| D | 非 bordered | 非 bordered | 都不匹配→无影响 |

修复规则：`.dg-wrapper.dg-bordered .dg-wrapper:not(.dg-bordered) .dg-cell { border-inline-end: 0 }`。特异性 (0,5,0) > (0,3,0)，B 组合重置胜出。

## 表头分割竖线抑制

`.dg-wrapper.dg-bordered .dg-cell-header[data-leaf-index]::before` 的 `background-color: transparent !important`，对齐 antd `bordered.ts:68-71` 的 `'> thead > tr > th::before': { backgroundColor: 'transparent !important' }`。仅作用于叶子表头格（分组格本就无 ::before），避免双重竖线。

## 圆角补全（有 footer 时）

antd `radius.ts:61-63`：`.ant-table-footer { borderRadius: 0 0 tableRadius tableRadius }`，配合 `.ant-table` 顶圆 → **顶圆 + 底圆 = 完整圆角矩形**（当存在 footer 时）。

data-grid `.dg-wrapper` 默认顶圆底直（`border-radius: var(--dg-radius) var(--dg-radius) 0 0`）。修复：`.dg-wrapper:has(.dg-footer)` 检测 footer 存在，把 border-radius 补全为四角圆。

- `:has()` 用宽松选择器（任意后代，非仅直接子节点）：兼容 loading 模式（Spin 包裹 tableContent 时 `.dg-footer` 不再是直接子节点，但仍是后代）。
- 无 footer 时保持顶圆底直（与 antd 无 footer 时底部直角一致）。

## token 对齐

antd `bordered.ts:18` `tableBorder = lineWidth lineType tableBorderColor`：

| antd | 默认值 | data-grid 桥接 |
|---|---|---|
| lineWidth | 1px | `--ant-line-width` |
| lineType | solid | `--ant-line-type` |
| tableBorderColor | `colorBorderSecondary` = #f0f0f0 | `--ant-table-border-color`（→ `--dg-border`） |

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| 外框 | wrapper 整框（单条 border） | title + container + footer 三部分拼 |
| 竖线载体 | 每个 grid item `.dg-cell` | 每个 th/td |
| 底圆角 | `:has(.dg-footer)` 补全 | footer 的 `borderRadius` |
| DOM 层级 | 单层 grid | 多层包裹 |

## 关联源码

- [`src/table/style/table.css`](../../../src/table/style/table.css) — `.dg-wrapper.dg-bordered` 整框、`.dg-bordered .dg-cell` 竖线、嵌套隔离、`.dg-cell-header[data-leaf-index]::before` 抑制、`:has(.dg-footer)` 圆角补全、`.dg-bordered .dg-sticky-shadow-*` 组合边框。
- [`src/table/style/tokens.css`](../../../src/table/style/tokens.css) — `--dg-border` 桥接 `--ant-table-border-color` + line-width + line-type。

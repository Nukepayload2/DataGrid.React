# 汇总（summary）

`<Table summary>` 启用表尾汇总区。`.dg-cell-summary` 是 summary 区单元格（grid item）。本文说明 summary 视觉、sticky bottom 背景，以及与 antd 的差异。

## 视觉

`.dg-cell-summary`：

- 底色 `--dg-body-bg`（与表体一致白底；antd summary 默认无特殊背景，与表体连续）。
- `border-bottom: var(--dg-border)`（与 antd summary 末行底部边框一致）。
- `box-shadow: 0 -1px 0 var(--dg-border-color)`（顶部 1px 分割线，与表体最后一行区分——对齐 antd `.ant-table-summary` 的 `box-shadow: 0 -1px 0 border-color`）。

### 顶部线为何用 box-shadow 而非 border-top

summary cell 是 grid item 按行排列，DOM 顺序未必按行，无法用 `:first-child` 精确命中"首行"。故用 box-shadow inset top 给所有 summary cell 加顶部线——相邻 summary 行之间会双线（1px+1px=2px）。但 summary 通常只有 1-2 行，双线视觉影响极小；且 antd summary 多行间也无分割线（仅整体顶部一条）。这里给所有 summary cell 加 top shadow，多行间表现为略深的线（可接受）。

## sticky bottom 背景

fixed 模式下 Cell inline style 设 `position: sticky; bottom: 0; z-index: 2`，背景需不透明才能盖住滚动的表体。data-grid 显式：

```css
.dg-cell-summary[style*='position: sticky'],
.dg-cell-summary[style*='position:sticky'] {
  background: var(--dg-body-bg);
}
```

## 对齐

`.dg-cell-summary[data-align='center']` / `[data-align='end']` → `justify-content`，与 `.dg-cell[data-align]` 同机制。

## bordered 组合

`.dg-bordered .dg-cell` 已给所有 cell（含 summary）加 `border-inline-end`（竖边框），summary cell 自动继承。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| summary 容器 | grid item（`.dg-cell-summary`） | `<tfoot><tr><td>` |
| 顶部线 | box-shadow inset top（所有 summary cell） | box-shadow / border-top |
| sticky bottom | inline style + 不透明背景 | `<tfoot>` sticky |

## 固定列 summary 合并格的横向 sticky（区间全同侧判定）

summary cell 与表体固定列一样可横滚时贴左/右边缘（`leafSticky` 由引擎 cloneElement 经 Row Context 透传，与表体固定列同源 `useStickyColumns.leafSticky`）。难点在 `colSpan > 1` 的合并格。

antd rc-table 源码（`Footer/Cell.js` + `utils/fixUtil.js`）对合并格的 sticky 判定基于**边界 leaf**：

- `getCellFixedInfo(index, index+mergedColSpan-1, ...)` 传 `[colStart, colEnd]` 区间。
- `startColumn.fixed==='left'` → `fixLeft = offsets[colStart]`（起始 leaf offset）。
- `endColumn.fixed==='right'` → `fixRight = offsets[colEnd]`（末 leaf offset）。
- 即合并格只要起始列 fixed-start 或末列 fixed-end 就 sticky（offset 取边界 leaf）。

data-grid 采用更严格的**「区间全同侧」**判定（而非 antd 的边界判定）：扫描 `[index, index+colSpan)` 区间所有 `leafSticky`，必须**全部存在且全同 side**（全 start 或全 end）才 sticky。offset 仍取边界 leaf（start 侧用 `leafSticky[index]`，end 侧用 `leafSticky[index+colSpan-1]`），与 antd fixUtil 一致。

为什么更严格：避免合并格跨固定/非固定边界时 sticky 错位的边缘情况。与 `useStickyColumns` 多级表头分组格判定一致——summary 合并格与表头分组格行为对称。对 antd 官方所有 demo（sticky demo idx0 全 fixed-start / summary 示例2 Balance 全非固定）结果与 antd 完全一致；仅「合并格跨固定/非固定边界」的合成场景本实现更保守（不 sticky）。

## 关联源码

- [`src/table/style/table.css`](../../src/table/style/table.css) — `.dg-cell-summary`（底色 + border-bottom + box-shadow + sticky 背景 + data-align）。
- [`src/table/engine/Summary.tsx`](../../src/table/engine/Summary.tsx) — `Summary` / `Summary.Row` / `Summary.Cell` 组件（grid item 定位 + sticky bottom + 固定列横向 sticky）。
- [`src/table/Table.tsx`](../../src/table/Table.tsx) — summary 渲染、sticky bottom inline style。

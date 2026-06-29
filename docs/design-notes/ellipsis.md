# 省略号（ellipsis）

`column.ellipsis: true` 列的单元格（表体 + 表头）超长文本省略号显示。本文说明 ellipsis 实现、word-break: keep-all，以及与 antd 的差异。

## 实现

`column.ellipsis: true` 列的单元格加 `dg-cell-ellipsis` 类：

- `.dg-cell.dg-cell-ellipsis .dg-cell-inner`（无 sorter/filter 的普通单元格 / 表头）：

  ```css
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  word-break: keep-all;
  max-width: 100%;
  ```

- `.dg-cell.dg-cell-ellipsis .dg-column-title`（有 sorter/filter 的表头格）：同款 ellipsis（title 文字省略，右侧操作区不动）。

## word-break: keep-all

对齐 antd `genEllipsisStyle`（`components/table/style/ellipsis.ts:13`）：在 `textEllipsis` 之上额外加 `wordBreak: 'keep-all'`。CJK / 长复合 token 不在单词内折行（nowrap + keep-all 组合，与 antd 一致）。

## hover 提示

hover 由引擎在 `.dg-cell-inner` / `.dg-column-title` 上设 native `title` 属性提示完整内容（antd 默认行为；`ellipsis: { showTitle: false }` 会关闭）。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| ellipsis 载体 | `.dg-cell-inner` / `.dg-column-title`（grid 内 div） | `<td>` 的 `text-overflow` + 内部 `.ant-table-cell-content` |

视觉一致，差异仅在 DOM 载体。

## 关联源码

- [`src/table/style/table.css`](../../src/table/style/table.css) — `.dg-cell.dg-cell-ellipsis .dg-cell-inner`、`.dg-cell.dg-cell-ellipsis .dg-column-title`。
- [`src/table/engine/GridTable.tsx`](../../src/table/engine/GridTable.tsx) — `dg-cell-ellipsis` 类（由 `column.ellipsis` 驱动）、native `title` 属性。

/**
 * 表头格纯函数簇 — 详见 docs/features/columns/fixed-column.md + docs/features/layout/header-and-span.md。
 *
 * 从 HeaderCell.tsx 与 FlatColumnCells.tsx 抽出的模块级纯函数（两路径同款逻辑去重）：
 *   - mergeHeaderExtraClass：cell.className + onHeaderCell.className + onHeaderRow.className 合并
 *   - mergeHeaderExtraStyle：cell.style + onHeaderCell.style + onHeaderRow.style 合并（后者覆盖前者同名字段）
 *   - mergeHeaderEventProps：onHeaderCell + onHeaderRow 事件 handler 合并（行级优先；跳过 className/style/key）
 *   - mergeHeaderStickyStyle：横向 sticky（左/右）+ 纵向 sticky（容器内 top:0 或页面级 top:offsetHeader）
 *     + corner cell 双 sticky 取最高 z-index(5)
 *
 * 全部为纯函数（不依赖组件 state/refs/props 闭包），可独立单测。
 * HeaderCell / FlatColumnCells 仅做 import 替换；行为 byte-for-byte 保留（含 corner z-index 修复语义）。
 */

import type { CSSProperties } from 'react'
import { stickyHeaderCellStyle } from './useStickyColumns'
import type { FixedSide } from './types'

/**
 * 三段 className（cell 列级 / onHeaderCell 格级 / onHeaderRow 行级）合并为单一字符串。
 * 顺序：列级 → 格级 → 行级（行级最优先，最后合并）。filter(Boolean) 去掉 undefined/空串；
 * 全部为空时返回 undefined（避免 className=" " 空串污染）。
 *
 * 行级合并语义详见 HeaderCell.tsx / FlatColumnCells.tsx 的 mergedHeaderExtraClass 注释。
 */
export function mergeHeaderExtraClass(
  cellClassName?: string,
  onHeaderCellClassName?: string,
  onHeaderRowClassName?: string,
): string | undefined {
  return (
    [cellClassName, onHeaderCellClassName, onHeaderRowClassName]
      .filter(Boolean)
      .join(' ') || undefined
  )
}

/**
 * 三段 style（cell 列级 / onHeaderCell 格级 / onHeaderRow 行级）合并。
 * 后者覆盖前者同名字段（行级最优先）。null/undefined 安全跳过。
 */
export function mergeHeaderExtraStyle(
  cellStyle?: CSSProperties | null,
  onHeaderCellStyle?: CSSProperties | null,
  onHeaderRowStyle?: CSSProperties | null,
): CSSProperties {
  return {
    ...(cellStyle ?? null),
    ...(onHeaderCellStyle ?? null),
    ...(onHeaderRowStyle ?? null),
  }
}

/**
 * 合并 onHeaderCell + onHeaderRow 返回值中的事件 handler（onXxx 开头）。
 * 行级优先覆盖格级同名字段。className/style 已单独合并（不在此处理）。
 * 其余非事件字段也透传（与原 inline 循环一致——只跳 className/style/**key**，其它键全保留）。
 *
 * 剔除集 = `className` / `style`（另有专用合并通道）+ **`key`**（与表体通道
 * `bodyCellUtils.ts` 的 `extractRestElementProps` 同形，见该文件 JSDoc 的完整依据）：
 *   - `key` 不是 HTML 属性，而是 **React 元素身份**。本仓 grid 布局表头**没有** `<tr>`，
 *     `onHeaderRow` 的返回值会被 spread 到该表头行**每一个**表头格 div
 *     （两个消费者：multi 路径 `HeaderCell.tsx:402`、flat 路径 `FlatColumnCells.tsx:360`）。
 *   - 表头格 div 的根节点**本来就没有**引擎 `key`（`HeaderCell.tsx:234` / `FlatColumnCells.tsx:253`
 *     的 `dg-cell-header` 那个 `<div>`），表头格的**组件身份在父层**（`GridTable.tsx:651` 的 `<HeaderCell key={`h-${cell.key}`}>`、
 *     `GridTable.tsx:821` 的 `<ColumnCells key={`${keyPrefix}-${column.key}`}>`，表头行 keyPrefix='h' 见 `:870`）
 *     ⇒ 用户 `key` 在这一层**没有合法落点**，只能不进袋。
 *   - 损害面（`已运行` fiber 探针 `tmp/92-probe/header-key-detail.probe.test.tsx`，读数 `tmp/92-probe-detail-before.log`）：
 *     父层组件 key 读数两组一致（flat `h-name`/`h-code`、multi `h-g.name`/`h-g.code`/`h-g`）⇒ **组件身份未被摧毁**；
 *     但用户 `key` 一旦随渲染变化（`onHeaderRow` 按 `index` 返回不同 key），该表头行全部表头格 DOM 节点
 *     会被**销毁重建**（`sameNode=false`，稳定 key / 不传 onHeaderRow 两条对照臂均为 `sameNode=true`）
 *     ＋ React 19 dev 告警 `A props object containing a "key" prop is being spread into JSX`。
 *   - 参照侧不存在这条通路：`@rc-component/table@1.10.2` 的 `es/Header/HeaderRow.js:28` 把 `onHeaderRow`
 *     返回值只 spread 到该表头行**唯一一个** `<tr>`（`RowComponent`），表头格的 key 由 `:46` 的
 *     `columnsKey[cellIndex]`（`:40` 处消费）独占 ⇒ 行级 `key` 碰不到任何一个表头格。裁判＝本机 antd 6.4.4。
 *   - 只剔元素身份字段，其余字段（`onClick`／`onKeyDown`／`tabIndex`／`data-*` 等）照旧**逐格**透传，
 *     不是「整包丢弃」（钉子见 `tests/table/engine/header/headerCellUtils.ts` 与
 *     `tests/table/features/Table.test.tsx` 末尾的 `onHeaderRow returns a key` 两条用例）。
 */
export function mergeHeaderEventProps(
  sources: Array<import('react').HTMLAttributes<HTMLElement> | undefined>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const src of sources) {
    if (!src) continue
    for (const k of Object.keys(src)) {
      if (k === 'className' || k === 'style' || k === 'key') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      out[k] = (src as any)[k]
    }
  }
  return out
}

/** corner cell（表头 × 固定列交叉格，双 sticky）取的最高 z-index。详见下方 mergeHeaderStickyStyle。 */
const HEADER_CORNER_Z_INDEX = 5
/** 表头纵向 sticky 的 z-index（仅纵向，无横向 fixed）。 */
const HEADER_VSTICKY_Z_INDEX = 4

/**
 * 合并表头格的横向 sticky（fixed 列左/右）+ 纵向 sticky（容器内 top:0 或页面级 top:offsetHeader）。
 *
 * z-index 层级：普通(auto) < 表体固定列(2) < 表头固定列(3) < 表头顶部(4) < corner 双 sticky(5)。
 *   - 仅横向 fixed：z-index 3（来自 stickyHeaderCellStyle）。
 *   - 仅纵向 sticky：z-index 4。
 *   - 横向+纵向同时存在（corner cell）：取最高 z-index(5)，保证横向滚动时 corner cell 始终盖住
 *     "只纵向 sticky 的中间表头格"(4) 与 "只横向 sticky 的固定列表头格"(3)。
 *     修复 bug：原实现 corner cell 取纵向 z-index(4)，DOM 后渲染的中间表头格横向滚动时会盖住 corner cell。
 *
 * 纵向 sticky 优先级：stickyHeaderOffset（页面级，相对 viewport）优先于 headerStickyTop（容器内 top:0）。
 *   两者互斥（sticky prop 启用时 headerStickyTop 恒 false），此处防御性取优先级。
 * 叠加逐行偏移 headerStickyTopOffset——多级表头各表头行按 gridRowStart 分层 sticky
 *   （row1 top:0、row2 top:h1、rowN top:Σh[0..N-2]），避免多行表头全堆叠在 top:0 重叠。
 *   单行表头（flat 路径）传 0。
 *
 * @param sticky 横向 sticky 信息（来自 useStickyColumns：side/offset/isEdge）；undefined 表示非 fixed 列。
 * @param stickyHeaderOffset 表头页面级 sticky 偏移（px）。仅 sticky prop 启用时传入；undefined 不启用页面级 sticky。
 * @param headerStickyTop 容器内表头纵向 sticky（virtual + 非虚拟 scroll.y 共用）。
 * @param headerStickyTopOffset 表头纵向 sticky 的逐行累计偏移（px）；单行表头传 0。
 */
export function mergeHeaderStickyStyle(
  sticky?: { side?: FixedSide; offset: number } | { side: FixedSide; offset: number; isEdge: boolean } | undefined,
  stickyHeaderOffset?: number,
  headerStickyTop?: boolean,
  headerStickyTopOffset?: number,
): CSSProperties {
  const horizontalSticky = stickyHeaderCellStyle(
    sticky as { side?: FixedSide; offset: number } | undefined,
  )
  const hasHorizontalSticky = !!sticky?.side
  const rowTopOffset = headerStickyTopOffset ?? 0
  const verticalSticky: CSSProperties =
    stickyHeaderOffset !== undefined
      ? { position: 'sticky', top: `${stickyHeaderOffset + rowTopOffset}px`, zIndex: HEADER_VSTICKY_Z_INDEX }
      : headerStickyTop
        ? { position: 'sticky', top: `${rowTopOffset}px`, zIndex: HEADER_VSTICKY_Z_INDEX }
        : {}
  const hasVerticalSticky = stickyHeaderOffset !== undefined || !!headerStickyTop
  const merged: CSSProperties = { ...horizontalSticky, ...verticalSticky }
  if (hasHorizontalSticky && hasVerticalSticky) {
    merged.zIndex = HEADER_CORNER_Z_INDEX
  }
  return merged
}

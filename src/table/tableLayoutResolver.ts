/**
 * 列宽策略 tableLayout 派生（对齐 antd rc-table `Table.tsx:613-627` mergedTableLayout）。
 *
 * data-grid `grid-template-columns` 默认 `max-content`（列宽=内容宽）→ ① ellipsis 列 track=content
 * 宽，cell-inner 不溢出 → 视觉无 `...`；② 固定列 + scroll.x 场景下，无 width 列 max-content
 * 不填满 scrollX，实际列总宽 < 声明宽 → 横滚到右时 fixed-end 列脱离右边缘（virtual-list 暴露
 * 的问题）。antd 用 `<table>{width:100%}` + `table-layout:fixed` 让无 width 列均分剩余（填满
 * scrollX，fixed-end 始终贴右；被压缩 < content → ellipsis 生效）。
 *
 * 派生规则（对齐 antd `mergedTableLayout`）：
 *   - 用户显式传 `tableLayout`（`'fixed'` / `'auto'`）→ 用之。
 *   - 未显式 + **fixColumn**（任一叶子列 `fixed:'start'|'end'`）→ 'fixed'（除非 scroll.x==='max-content'，
 *     此时 antd 保持 'auto' 让内容自然撑宽）。
 *   - 未显式 + **fixHeader**（scroll.y===true 容器内固定表头）/ **sticky**（页面级）/ **有 ellipsis 列**
 *     → 'fixed'。
 *   - 否则 → 'auto'（默认，维持 max-content；basic 等无 fixed/ellipsis/scroll 的 demo 走此路径）。
 *
 * antd 源码依据：`react-component/table/src/Table.tsx:613-627`：
 *   ```
 *   if (tableLayout) return tableLayout;
 *   if (fixColumn) return mergedScrollX === 'max-content' ? 'auto' : 'fixed';
 *   if (fixHeader || isSticky || flattenColumns.some(({ellipsis}) => ellipsis)) return 'fixed';
 *   return 'auto';
 *   ```
 *
 * 与 colTracks 策略配合：fixed 模式下无 width 列 `minmax(0,1fr)` 均分剩余填满容器/scrollX，
 *   绝对 width 列 `minmax(width,1fr)`；auto 模式下 `max-content`/`minmax(width,max-content)`。
 *   修 virtual-list fixed-end 脱离 + ellipsis + narrow 均分（narrow 需 demo 显式 tableLayout:fixed
 *   或有 fixed/ellipsis 列才派生；narrow demo 三列均无 fixed/ellipsis 故仍 auto——属 auto 语义预期）。
 *
 * 固定列偏移不受影响：useStickyColumns 用 ResizeObserver 实测 DOM 宽度（不依赖 col.width 数值），
 *   fixed 模式下 minmax 算出的实际宽度会被 ResizeObserver 重测，sticky 偏移自动正确。
 *
 * ellipsis/fixed 判定：基于已过滤哨兵的 visibleColumns（与渲染一致）。哨兵（SELECTION/EXPAND）
 *   不是 ColumnType，不带 ellipsis/fixed，跳过。
 *
 * 详见 `docs/design-notes/column-width.md`。
 */
import {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  type ColumnOrSentinel,
  type ColumnType,
} from './types'

/**
 * 派生最终生效的 `tableLayout`（'auto' / 'fixed'）。
 *
 * 入参语义详见模块顶层注释。`tableLayoutProp` 为用户通过 `TableProps.tableLayout` 显式传入值
 * （undefined / 'fixed' / 'auto'）；`visibleColumns` 为已过滤哨兵之前的列数组（哨兵在此函数内跳过）；
 * `scrollX` / `scrollY` 取自 `scroll` prop；`sticky` 取自 `sticky` prop。
 */
export function resolveTableLayout<RecordType>(
  tableLayoutProp: 'auto' | 'fixed' | undefined,
  visibleColumns: Array<ColumnOrSentinel<RecordType>>,
  scrollX: number | string | undefined,
  scrollY: true | undefined,
  sticky: boolean | object | undefined,
): 'auto' | 'fixed' {
  if (tableLayoutProp === 'fixed' || tableLayoutProp === 'auto') return tableLayoutProp
  // 扫描叶子列：fixColumn（任一 fixed）+ ellipsis（任一 ellipsis truthy）。
  let hasFixedColumn = false
  let hasEllipsis = false
  for (const c of visibleColumns as Array<ColumnOrSentinel<RecordType>>) {
    if (c === SELECTION_COLUMN || c === EXPAND_COLUMN) continue
    const col = c as ColumnType<RecordType>
    if (col.fixed) hasFixedColumn = true
    if (col.ellipsis) hasEllipsis = true
  }
  // fixHeader = scroll.y===true（容器内固定表头）；isSticky = sticky prop 启用。
  const fixHeader = scrollY === true
  const isSticky = sticky !== undefined && sticky !== false
  // 对齐 antd `Table.tsx:620-622`：fixColumn 时提前返回（max-content → auto，否则 fixed），
  //   不再落到 fixHeader/ellipsis 分支——即使同时有 fixHeader/ellipsis，fixColumn+max-content 仍 auto。
  if (hasFixedColumn) {
    return scrollX === 'max-content' ? 'auto' : 'fixed'
  }
  if (fixHeader || isSticky || hasEllipsis) return 'fixed'
  return 'auto'
}

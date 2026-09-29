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
 *   - 未显式 + **所有真实叶子列都有 numeric/px width** → 'fixed'。这是 data-grid 的补充兼容：
 *     antd 的 `<table style="width:100%">` 在所有列都给固定宽度且总宽小于容器时，浏览器会把
 *     声明宽度当作比例权重放大到容器宽度；data-grid 用
 *     `minmax(0, width-fr)` 纯 CSS 复刻，不需要 JS 测量列宽。
 *   - 否则 → 'auto'（默认，维持 max-content；basic 等无 fixed/ellipsis/scroll 的 demo 走此路径）。
 *
 * 参照件依据（本仓实装 `@rc-component/table` 1.10.2，antd 6.4.4 的依赖）：其 `es/Table.js:411-427`：
 *   ```
 *   if (tableLayout) return tableLayout;
 *   if (fixColumn) return mergedScrollX === 'max-content' ? 'auto' : 'fixed';
 *   if (fixHeader || isSticky || flattenColumns.some(({ellipsis}) => ellipsis)) return 'fixed';
 *   // data-grid 补充：all numeric/px widths → proportional fixed tracks
 *   return 'auto';
 *   ```
 *
 * 与 colTracks 策略配合：fixed 模式下无 width 列 `minmax(0,1fr)` 均分剩余填满容器/scrollX；
 *   普通 width 列通常保持绝对 track；当所有真实列都是 numeric/px width 且无 fixed 列时，
 *   改用 `minmax(0,width-fr)` 按声明宽度比例填满容器。auto 模式下使用
 *   `minmax(width,max-content)` / `minmax(min-content,1fr)`。narrow demo 三列均无 width，
 *   仍为 auto 语义。
 *
 * 固定列偏移不受影响：useStickyColumns 用 ResizeObserver 实测 DOM 宽度（不依赖 col.width 数值），
 *   fixed 模式下 minmax 算出的实际宽度会被 ResizeObserver 重测，sticky 偏移自动正确。
 *
 * ellipsis/fixed 判定：基于已过滤哨兵的 visibleColumns（与渲染一致）。哨兵（SELECTION/EXPAND）
 *   不是 ColumnType，不带 ellipsis/fixed，跳过。
 *
 * 详见 `docs/features/columns/column-width.md` 的「colTracks 算法（TS 视角）」一节。
 */
import {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  type ColumnOrSentinel,
  type ColumnType,
} from './types'

function isPixelWidth(width: unknown): boolean {
  if (typeof width === 'number') return Number.isFinite(width)
  if (typeof width !== 'string') return false
  const normalized = width.trim().toLowerCase()
  return /^\d+(?:\.\d+)?px$/.test(normalized)
}

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
  scrollX: true | number | string | undefined,
  scrollY: true | undefined,
  sticky: boolean | object | undefined,
): 'auto' | 'fixed' {
  if (tableLayoutProp === 'fixed' || tableLayoutProp === 'auto') return tableLayoutProp
  // 扫描叶子列：fixColumn（任一 fixed）+ ellipsis（任一 ellipsis truthy）。
  let hasFixedColumn = false
  let hasEllipsis = false
  let leafCount = 0
  let allLeafColumnsHavePixelWidth = true
  for (const c of visibleColumns as Array<ColumnOrSentinel<RecordType>>) {
    if (c === SELECTION_COLUMN || c === EXPAND_COLUMN) continue
    const col = c as ColumnType<RecordType>
    leafCount += 1
    if (col.fixed) hasFixedColumn = true
    if (col.ellipsis) hasEllipsis = true
    if (!isPixelWidth(col.width)) allLeafColumnsHavePixelWidth = false
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
  if (leafCount > 0 && allLeafColumnsHavePixelWidth && scrollX !== 'max-content') return 'fixed'
  return 'auto'
}

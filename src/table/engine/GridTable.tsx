/**
 * data-grid CSS Grid 渲染引擎根组件。
 *
 * 渲染思路：用 `display:grid` + `grid-template-rows/columns` + 显式 grid-area 定位
 * 替代 antd 的 `<table>`/`<tr>`/`<td>`，所有单元格是同一个 `.dg-grid` 的 grid item。
 *
 * 两条渲染路径：
 *
 * 1) **快速路径（flat）**：单层表头且无合并 / 虚拟 / 展开 / 树形 / summary / empty。
 *    使用 `grid-auto-flow:column`：每列 DOM 连续（表头格 + 每数据行格）。
 *
 * 2) **多级表头路径（multi）**：columnTree 提供且 maxDepth>1，或任一能力要求显式定位
 *    （合并 / 虚拟 / 展开 / 树形 / summary / empty / components.body.row）。
 *    - `grid-template-rows`：表头部分 = `maxDepth` 行（统一 headerHeight），数据行跟在其后。
 *    - 表头格 / 数据格都用**显式** `grid-column` / `grid-row` 定位（不依赖 auto-flow）。
 *    - 关闭 `grid-auto-flow:column`（用默认 row 流，配显式定位最稳）。
 *
 * 关键能力对应主题文件（机制 / 算法 / 易踩坑详见对应 md）：
 * - 列宽 track 策略（auto/fixed/minmax/百分比）→ docs/design-notes/column-width.md
 * - 滚动容器路由 + 横向悬浮条 → docs/design-notes/scrollbar.md
 * - 固定列 sticky + 边缘阴影 + z-index 层叠 → docs/design-notes/fixed-column.md
 * - 多级表头 + 表头分割竖线 → docs/design-notes/header.md
 * - 隐藏列（0fr track + dg-cell-hidden）→ docs/design-notes/hidden-column.md
 * - 行高（有界模型 / rowSpan 豁免）→ docs/design-notes/row-height.md
 * - 虚拟滚动（AATree/offsetTree/动态行高/FillerRow/虚拟窗口）→ docs/design-notes/virtualization.md
 * - 行展开（0fr↔1fr track 过渡）→ docs/design-notes/expand.md
 * - 整体容器结构与修饰类 → docs/design-notes/layout.md
 * - 页面级 sticky（grid 不包 overflow 容器）→ docs/design-notes/sticky.md
 * - 行 hover / 行选中 / 行 className → docs/design-notes/layout.md + selection.md
 *
 * 整行 hover — 详见 docs/design-notes/layout.md：
 * grid-auto-flow:column / 显式定位下"同行"DOM 都不连续，纯 CSS 无法关联整行；
 * 用 JS 方案——根组件持有 hoveredRowIndex state，命中行所有 body cell 加 `dg-row-hover` 类。
 */

import {
  cloneElement,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  resolveColumnTree,
} from './columnTree'
import {
  computeCellMergePlan,
  type CellMergeInfo,
  type CellMergePlan,
} from './cellMerge'
import {
  stickyCellStyle,
  stickyHeaderCellStyle,
  useStickyColumns,
  type LeafStickyInfo,
} from './useStickyColumns'
import { useHeaderRowHeights } from './useHeaderRowHeights'
import {
  useVirtualList,
} from './useVirtualList'
import { useColumnResize } from './useColumnResize'
import { SortIndicator } from './SortIndicator'
import { FilterDropdown } from './FilterDropdown'
import { parseSummaryNode } from './Summary'
import type {
  Align,
  EngineColumnNode,
  EngineExpandState,
  EngineHeaderCell,
  EngineLeafColumn,
  EngineTableProps,
  EngineTreeState,
  FixedSide,
} from './types'
// onHeaderCell 签名 `(column) => HTMLAttributes` 的 column 类型用 ColumnType 表达（与对外 types.ts 一致），仅 type-only。
import type { ColumnType } from '../types'
import { ExpandIcon } from './ExpandIcon'
import { FloatingScrollBar } from './FloatingScrollBar'

/**
 * 自定义组件渲染（components.body.cell / components.body.row）— 详见 docs/design-notes/header.md 与 selection.md。
 *
 * data-grid 用 div 渲染单元格（`.dg-cell`，非 antd 的 `<td>`），components 机制做如下适配：
 *
 * 1. **components.body.cell**：dg-cell div 的**内部内容**（即 `.dg-cell-inner` 位置）用 cell 组件渲染。
 *    cell 组件签名对齐 antd v6：`{ children, record, index, dataIndex, ...onCell返回值 }`，
 *    返回 ReactNode（单元格内容，放进 dg-cell div 内——因 data-grid 无 td）。
 *    与 antd 差异：antd 的 EditableCell demo 返回 `<td>`；data-grid 复刻时改为返回内容 ReactNode
 *    （去掉 td 外壳），其余逻辑照搬。
 *
 * 2. **components.body.row**：行级上下文提供者（典型 EditableRow 包 antd Form + Context.Provider）。
 *    关键约束：grid item 必须是 grid 容器的**直接子元素**，故 row 组件**不真正包裹 DOM**——
 *    内部用 React.Fragment（Fragment 不产生 DOM，其 children 被"穿透"为 grid 直接子元素，
 *    满足 grid 显式定位）。body.row 提供时强制走 multi 路径（行优先遍历 + Provider 包裹）。
 *
 * 3. **onCell 返回值透传**：除 colSpan/rowSpan（cellMerge 消费）外，其余字段透传给 cell props
 *    （与 antd v6 additionalProps 一致）。
 *
 * 4. **shouldCellUpdate**：作为 prop 透传给 cell 组件，cell 组件可自行用 React.memo + 该函数做 memo
 *    （引擎简化为透传，cell 组件自行决定是否 memo）。默认渲染路径不消费（零回归）。
 *
 * 5. **回归保证**：components 未提供时所有渲染走默认路径；onCell 仍可能存在（合并用），但无
 *    components 时 onCell 的其余字段被忽略（仅取 colSpan/rowSpan）。
 */

/**
 * 单元格内容渲染（应用 components.body.cell）。详见文件头 components 机制说明。
 *
 * 提供 components.body.cell 时用它渲染（props 含 children + record + index + dataIndex +
 * onCell 返回值的其余字段 + shouldCellUpdate）；否则直接返回默认内容（rendered）。
 *
 * `onCellProps` 为 column.onCell(record, index) 的完整返回值；仅 colSpan/rowSpan 由 cellMerge 消费，
 * 这里把**完整返回值**透传给 cell 组件（与 antd additionalProps 一致）。
 */
function renderCellContent({
  components,
  column,
  record,
  index,
  rendered,
  onCellProps,
}: {
  components: import('./types').EngineTableProps['components']
  column: EngineLeafColumn<any>
  record: any
  index: number
  rendered: ReactNode
  onCellProps: Record<string, any> | undefined
}): ReactNode {
  const CustomCell = components?.body?.cell
  if (!CustomCell) {
    // 默认渲染路径：直接返回 rendered。
    return rendered
  }
  // 透传 props：children + record + index + dataIndex + shouldCellUpdate + onCell 返回值的全部字段。
  // onCellProps 可能含 colSpan/rowSpan（cellMerge 已消费，这里仍透传，cell 组件一般不读）。
  const cellProps: Record<string, any> = {
    children: rendered,
    record,
    index,
    dataIndex: column.dataIndex,
    shouldCellUpdate: column.shouldCellUpdate,
    ...onCellProps,
  }
  return <CustomCell {...cellProps} />
}

/** 数字 → px 字符串；字符串原样返回；null/undefined → undefined。 */
function toTrack(value: number | string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return `${value}px`
  return value
}

/**
 * ellipsis 默认 title 提示：把单元格/表头内容文本化为 string 供 native `title` 用。详见 docs/design-notes/ellipsis.md。
 *
 * 对齐 antd 默认行为：ellipsis 单元格 hover 显示完整文本（native title）。
 *   - string / number：直接转 string。
 *   - ReactNode（含 JSX / render 返回值）：尝试递归抽取文本（string/number 拼接）；
 *     若含非文本节点（元素/数组等无法可靠文本化）则返回 undefined（与 antd 行为一致：
 *     自定义 render 返回 JSX 时 antd 默认也不显示 title——此时用户应自行包 Tooltip）。
 *   - null/undefined/boolean：返回 undefined（不设 title）。
 *
 * 仅 ellipsis 列调用；非 ellipsis 列不加 title（避免多余 tooltip）。
 */
function toEllipsisTitle(content: ReactNode): string | undefined {
  if (content === null || content === undefined) return undefined
  if (typeof content === 'string') return content
  if (typeof content === 'number') return String(content)
  if (typeof content === 'boolean') return undefined
  // ReactNode 其它形态（element / array / fragment / portal）：
  // 递归抽取 string/number 文本；遇到非文本（如 element with props 但无 string children 链）
  // 保守返回 undefined（避免给出残缺 title 误导用户）。
  const parts: Array<string> = []
  const walk = (node: ReactNode): boolean => {
    if (node === null || node === undefined || typeof node === 'boolean') return true
    if (typeof node === 'string') {
      parts.push(node)
      return true
    }
    if (typeof node === 'number') {
      parts.push(String(node))
      return true
    }
    // React element：抽 props.children 递归（不抽 element 自身的字符串表示）。
    if (typeof node === 'object' && 'props' in node) {
      const children = (node as { props?: { children?: ReactNode } }).props?.children
      return walk(children)
    }
    // 数组 / iterable：逐项 walk。
    if (Array.isArray(node)) {
      return node.every(walk)
    }
    // 其它形态（Portal / Suspense 等）：不文本化。
    return false
  }
  if (!walk(content)) return undefined
  const joined = parts.join('').trim()
  return joined.length > 0 ? joined : undefined
}

/**
 * 把 `rowHeight`（number 或函数）解析为某行的数值高度（px）。
 * - number：直接返回。
 * - 函数：调用取值；返回 number→原值，返回 string→按 px 数字解析（"40px"→40）；非法→0。
 * - 缺省：返回 0（虚拟滚动要求 rowHeight 必须给数值约定；未给时退化为 0，调用方应避免）。
 *
 * 仅虚拟滚动需要数值化（计算 offset/totalSize 用）；非虚拟路径仍走 `toTrack` 生成 track 字符串。
 * 详见 docs/design-notes/virtualization.md。
 */
function resolveNumericRowHeight<RecordType>(
  rowHeight: NonNullable<NonNullable<EngineTableProps<RecordType>['gridOptions']>['rowHeight']>,
  record: RecordType,
  index: number,
): number {
  if (typeof rowHeight === 'function') {
    const v = rowHeight(record, index)
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      // 支持 "40px" / "40" 形式；非纯数字+px 视为 0（约定：虚拟行高必须可数值化）。
      const m = /^([\d.]+)px$/.exec(v.trim())
      if (m) return Number.parseFloat(m[1])
      const asNum = Number.parseFloat(v)
      return Number.isFinite(asNum) ? asNum : 0
    }
    return 0
  }
  if (typeof rowHeight === 'number') return rowHeight
  return 0
}

/**
 * 把 size 限制到 [min, max] 区间（有界行高模型，详见 docs/design-notes/row-height.md）。
 * min/max 任一为 undefined 时不约束该侧；返回取整（与 useRowMeasurements correctRowSize 一致，
 * 避免 sizeTree 写入浮点抖动）。
 */
function clampSize(size: number, min?: number, max?: number): number {
  let v = size
  if (typeof min === 'number' && v < min) v = min
  if (typeof max === 'number' && v > max) v = max
  return Math.round(v)
}

/** 取 record 的字段值（支持 dataIndex 为 string/number/string[]）。 */
export function getValueByDataIndex(
  record: any,
  dataIndex: string | number | Array<string | number> | undefined,
): any {
  if (record === null || record === undefined) return undefined
  if (dataIndex === undefined || dataIndex === null) return undefined
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce((acc, key) => {
      if (acc === null || acc === undefined) return undefined
      return acc[key]
    }, record)
  }
  return record[dataIndex]
}

/** 解析 rowKey 为 key 字符串/数字。 */
export function getRowKey<RecordType>(
  record: RecordType,
  rowKey: string | ((record: RecordType) => string | number),
): string | number {
  if (typeof rowKey === 'function') return rowKey(record)
  const v = (record as any)?.[rowKey]
  return v === undefined ? '' : v
}

export interface GridTableProps<RecordType = any> extends EngineTableProps<RecordType> {
  /** 额外 className（来自适配层，如 size/bordered）。 */
  className?: string
}

/** 引擎对外暴露的句柄（仅虚拟 scrollTo）。对外请走 Table.tsx 的 TableRef。 */
export interface GridTableHandle {
  scrollTo: (config: {
    index?: number
    scrollTop?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
    /** 'auto'（默认，瞬时）| 'smooth'（JS RAF easing 平滑动画 + 到达检测）。 */
    behavior?: 'auto' | 'smooth'
  }) => void
}

/**
 * 页面级 sticky 的底部横向滚动条（对齐 antd `StickyScrollBar`）。详见 docs/design-notes/sticky.md。
 *
 * 背景：sticky 模式下 `.dg-grid` 不包 overflow 容器（避免拦截表头 sticky 上下文），grid 的
 * `min-width: scrollX` 撑宽页面，**页面（document）作为横向滚动源**（原生横向滚动条）。
 * 本组件提供"底部固定的横向滚动条"增强体验：`position: sticky; bottom: offsetScroll`，
 * 页面纵向滚动时钉在视口底部；内部 thumb 反映页面当前横向滚动位置，拖动 thumb 驱动页面 scrollTo。
 *
 * 与 antd 差异：antd 的 StickyScrollBar 是 fake scrollbar（表体滚动容器无原生横向滚动条，
 * 完全用 fake thumb 替代）；data-grid 简化为"页面原生横向滚动条 + 增强 sticky thumb"——
 * 页面本身已有原生横向滚动条，本组件额外提供一个钉在视口底部的同步 thumb（视觉对齐 antd
 * "底部固定滚动条"，功能等价：长表格滚动到底部视口时仍可横向滚动）。
 *
 * 实现：
 * - 监听 `getContainer()`（默认 window）的 scroll 事件，按 `scrollLeft / (scrollWidth - clientWidth)`
 *   计算 thumb 在 bar 内的 left 比例 + thumb 宽度比例（clientWidth / scrollWidth）。
 * - 拖动 thumb（pointer 事件）：按 pointer 移动量换算 scrollLeft，调 `container.scrollTo`。
 * - bar 宽度 = grid 宽度（与 grid 对齐，sticky bottom 时横向随页面滚动）。
 *
 * 仅 sticky 启用时渲染（GridTable 在 sticky 分支调用）；其余路径不渲染。
 */
function StickyScrollBar({
  offsetScroll,
  getContainer,
  gridRef,
}: {
  offsetScroll: number
  getContainer?: () => HTMLElement | Window | undefined
  gridRef: React.RefObject<HTMLDivElement | null>
}) {
  const barRef = useRef<HTMLDivElement | null>(null)
  const thumbRef = useRef<HTMLDivElement | null>(null)
  // 拖动状态 ref（避免重渲染；pointermove 直接操作 DOM）。
  const dragStateRef = useRef<{
    pointerId: number | null
    startPointerX: number
    startScrollLeft: number
  } | null>(null)

  // 解析 container（window 或 HTMLElement；undefined/null 回退 window）。
  const resolveContainer = useCallback((): Window | HTMLElement => {
    if (getContainer) {
      const c = getContainer()
      if (c instanceof Window) return c
      if (c && 'scrollTo' in c) return c as HTMLElement
    }
    return typeof window !== 'undefined' ? window : (null as unknown as Window)
  }, [getContainer])

  // 更新 thumb 位置 + 宽度（按当前 scrollLeft / scrollWidth 比例）。
  const updateThumb = useCallback(() => {
    const container = resolveContainer()
    const bar = barRef.current
    const thumb = thumbRef.current
    if (!bar || !thumb) return
    // 容器滚动几何：window 用 scrollX/innerWidth/document.scrollWidth；
    // HTMLElement 用 scrollLeft/clientWidth/scrollWidth。
    let scrollLeft: number
    let clientWidth: number
    let scrollWidth: number
    if (container instanceof Window) {
      scrollLeft = container.scrollX || 0
      clientWidth = container.innerWidth || 0
      scrollWidth = container.document?.documentElement?.scrollWidth || 0
    } else {
      scrollLeft = container.scrollLeft || 0
      clientWidth = container.clientWidth || 0
      scrollWidth = container.scrollWidth || 0
    }
    const maxScroll = scrollWidth - clientWidth
    const ratio = maxScroll > 0 ? scrollLeft / maxScroll : 0
    const thumbRatio = scrollWidth > 0 ? clientWidth / scrollWidth : 1
    // thumb 宽度 = bar 宽度 × (clientWidth / scrollWidth)（至少 20px，避免太窄）。
    const barWidth = bar.clientWidth || 0
    const thumbWidth = Math.max(20, barWidth * thumbRatio)
    const thumbMaxLeft = Math.max(0, barWidth - thumbWidth)
    thumb.style.width = `${thumbWidth}px`
    thumb.style.transform = `translateX(${ratio * thumbMaxLeft}px)`
  }, [resolveContainer])

  // 监听 container scroll + resize 更新 thumb。
  useEffect(() => {
    const container = resolveContainer()
    const target = container instanceof Window ? container : (container as HTMLElement)
    target.addEventListener('scroll', updateThumb, { passive: true })
    if (container instanceof Window) {
      container.addEventListener('resize', updateThumb)
    }
    // 初始更新。
    updateThumb()
    return () => {
      target.removeEventListener('scroll', updateThumb)
      if (container instanceof Window) {
        container.removeEventListener('resize', updateThumb)
      }
    }
  }, [resolveContainer, updateThumb])

  // thumb pointer 拖动：换算 pointer 移动量 → container scrollLeft。
  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = resolveContainer()
    const thumb = thumbRef.current
    const bar = barRef.current
    if (!thumb || !bar) return
    e.preventDefault()
    e.stopPropagation()
    let clientWidth: number
    let scrollWidth: number
    let currentScrollLeft: number
    if (container instanceof Window) {
      clientWidth = container.innerWidth || 0
      scrollWidth = container.document?.documentElement?.scrollWidth || 0
      currentScrollLeft = container.scrollX || 0
    } else {
      clientWidth = container.clientWidth || 0
      scrollWidth = container.scrollWidth || 0
      currentScrollLeft = container.scrollLeft || 0
    }
    const barWidth = bar.clientWidth || 0
    const thumbRatio = scrollWidth > 0 ? clientWidth / scrollWidth : 1
    const thumbWidth = Math.max(20, barWidth * thumbRatio)
    const thumbMaxLeft = Math.max(0, barWidth - thumbWidth)
    const maxScroll = scrollWidth - clientWidth
    dragStateRef.current = {
      pointerId: e.pointerId,
      startPointerX: e.clientX,
      startScrollLeft: currentScrollLeft,
    }
    // 用闭包捕获拖动几何（拖动期间 DOM 不变，无需重读）。
    const geometry = { thumbMaxLeft, maxScroll }
    const onMove = (ev: PointerEvent) => {
      const ds = dragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      const dx = ev.clientX - ds.startPointerX
      const scrollDelta = geometry.thumbMaxLeft > 0 ? (dx / geometry.thumbMaxLeft) * geometry.maxScroll : 0
      const next = ds.startScrollLeft + scrollDelta
      if (container instanceof Window) {
        container.scrollTo(next, container.scrollY || 0)
      } else {
        ;(container as HTMLElement).scrollLeft = next
      }
    }
    const onUp = (ev: PointerEvent) => {
      const ds = dragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      dragStateRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  return (
    <div
      ref={barRef}
      className="dg-sticky-scroll-bar"
      style={{
        position: 'sticky',
        bottom: `${offsetScroll}px`,
        // antd sticky.ts:34,38 height = tableScrollThumbSize(8) + background = tableScrollBg(浅)。
        height: 'var(--ant-table-scroll-thumb-size, 8px)',
        // z-index 6 高于表头 corner（z5），避免同级；几何不重叠时无视觉变化，防未来回归。
        zIndex: 6,
        background: 'var(--ant-table-scroll-bg, rgba(5, 5, 5, 0.06))',
        // antd sticky.ts:39 borderTop: tableBorder（1px solid tableBorderColor）。data-grid 同款，
        // 用 --ant-table-border-color（= #f0f0f0，与 antd tableBorderColor 一致）。
        borderTop: 'var(--ant-line-width, 1px) var(--ant-line-type, solid) var(--ant-table-border-color, #f0f0f0)',
        // bar 宽度与 grid 对齐：grid 多宽 bar 多宽（gridRef 提供 grid 宽度参考）。
        // sticky 元素横向随页面滚动（默认行为），故 bar 始终覆盖"当前视口横向可见区域"对齐 grid。
        minWidth: gridRef.current?.style.minWidth || undefined,
      }}
    >
      <div
        ref={thumbRef}
        onPointerDown={onThumbPointerDown}
        className="dg-sticky-scroll-bar-thumb"
        style={{
          height: 'var(--ant-table-scroll-thumb-size, 8px)',
          width: '20px',
          // antd sticky.ts:50 borderRadius = stickyScrollBarBorderRadius(100) + backgroundColor = tableScrollThumbBg。
          borderRadius: 'var(--ant-table-sticky-scroll-bar-border-radius, 100px)',
          background: 'var(--ant-table-scroll-thumb-bg, rgba(0, 0, 0, 0.25))',
          cursor: 'pointer',
          willChange: 'transform',
          transition: 'background-color 0.2s ease',
        }}
      />
    </div>
  )
}

/**
 * 渲染引擎根组件。
 * 不对外暴露；对外统一走 `src/table/Table.tsx`。
 */
export const GridTable = forwardRef(GridTableInner) as <RecordType = any>(
  props: GridTableProps<RecordType> & { ref?: React.Ref<GridTableHandle> },
) => React.ReactElement

function GridTableInner<RecordType = any>(
  props: GridTableProps<RecordType>,
  ref: React.Ref<GridTableHandle>,
) {
  const {
    columns,
    columnTree,
    dataSource,
    rowKey,
    gridOptions,
    showHeader = true,
    scroll,
    virtual,
    expandState,
    treeState,
    tableLayout,
    onSorterClick,
    onFilterApply,
    className,
    components,
    summary,
    emptyText,
    semantic,
    sticky,
    // 接口兼容字段：onHeaderRow / onRow / rowClassName / getPopupContainer / rowHoverable
    // （grid 无 tr，这些行级 props 由引擎分发到该行所有单元格）。
    onHeaderRow,
    onRow,
    rowClassName,
    getPopupContainer,
    rowHoverable,
    // 行选中态判定 → 加 dg-row-selected 类（详见 docs/design-notes/selection.md）。
    isRowSelected,
    // Table 级 locale（FilterDropdown 消费 filterConfirm/Reset/EmptyText/SearchPlaceholder/CheckAll）。
    filterLocale,
  } = props

  // rowHeight / headerHeight / resizable* 全部从 gridOptions 读取（顶层无 alias）。
  const {
    rowHeight,
    headerHeight,
    resizable,
    resizableMinWidth,
    resizableMaxWidth,
  } = gridOptions ?? {}

  const gridRef = useRef<HTMLDivElement | null>(null)

  // === 页面级粘性表头（区别于容器内固定）— 详见 docs/design-notes/sticky.md ===
  // sticky prop 启用时：表头相对**页面 viewport** 固定（position:sticky; top:offsetHeader），
  // 而非相对表格滚动容器固定。
  //
  // 与虚拟 / 容器内固定表头互斥：sticky 启用时走"页面级"路径（grid 不包 overflow 容器，避免拦截
  // sticky 上下文），virtual / scrollYNonVirtual 的容器内固定表头不生效（headerStickyTop 仍为 false，
  // 由 stickyHeaderOffset 驱动）。
  const stickyEnabled = sticky !== undefined && sticky !== null
  const stickyOffsetHeader = (sticky && typeof sticky === 'object' ? sticky.offsetHeader : undefined) ?? 0
  const stickyOffsetScroll = (sticky && typeof sticky === 'object' ? sticky.offsetScroll : undefined) ?? 0
  const stickyGetContainer =
    sticky && typeof sticky === 'object' && sticky.getContainer ? sticky.getContainer : undefined

  // === 虚拟滚动判定 — 详见 docs/design-notes/virtualization.md ===
  // virtual=true 且 scroll.y === true 时启用纵向虚拟滚动（scroll.y 仅 true/undefined）。
  // 虚拟窗口高度由 CSS 自动适应（容器 clientHeight，ResizeObserver 实时测量——见 useVirtualList）。
  // sticky 启用时禁用虚拟（页面级与容器内虚拟互斥；sticky 下页面滚动，虚拟窗口失去意义）。
  const scrollY = scroll?.y
  const scrollYEnabled = scrollY === true
  const virtualEnabled = !stickyEnabled && virtual === true && scrollYEnabled

  // === 容器内固定表头（非 virtual）判定 ===
  // 非 virtual 且 scroll.y === true 时启用：表头 sticky top + 表体限高纵向滚动（CSS 自动适应高度）。
  // 与虚拟互斥（虚拟优先）。sticky 启用时禁用（页面级优先）。
  const scrollYNonVirtual = !stickyEnabled && !virtualEnabled && scrollYEnabled

  // === 表头纵向 sticky 统一标志（虚拟 + 容器内固定表头共用）===
  // 无论虚拟还是非虚拟 scroll.y，表头都需要 `position: sticky; top: 0` 钉在滚动容器顶部。
  // 该标志传入 HeaderCell / ColumnCells 的 `headerStickyTop` prop，统一驱动表头 sticky 行为，
  // 避免两套不一致的实现。
  // sticky 页面级固定**不**走此标志（该标志驱动的是"容器内 top:0"）；sticky 由 stickyHeaderOffset
  // 单独驱动（表头格 inline style 用 top: offsetHeader，相对 viewport），见下方 stickyHeaderOffset。
  const headerStickyTop = virtualEnabled || scrollYNonVirtual

  // === 表头页面级 sticky 偏移（仅 sticky 启用时有效）===
  // 传入 HeaderCell / ColumnCells 的 `stickyHeaderOffset` prop：sticky 启用时表头格 inline style
  // 加 `position: sticky; top: offsetHeader; zIndex`，相对 viewport 固定。与 headerStickyTop（容器内）
  // 互斥——同时为 true 时 sticky 优先（sticky 启用时 headerStickyTop 恒 false，见上）。
  const stickyHeaderOffset: number | undefined = stickyEnabled ? stickyOffsetHeader : undefined

  // 是否启用展开（expandState.expandEnabled）。展开启用时强制 multi 路径——
  // 展开内容 track 需要精确 grid-row 定位，flat 路径（grid-auto-flow:column）无法插入。
  const expandEnabled = !!expandState?.expandEnabled

  // 树形模式（treeState.treeEnabled）。非树形 → undefined。
  // 树形模式下：第一列数据单元格内按 level × indentSize 左缩进 + hasChildren 行渲染展开图标。
  const treeEnabled = !!treeState?.treeEnabled

  // === 汇总 summary 解析（须在 resolved 之前——summary 启用会强制 multi 路径）===
  // 解析 summary prop：提取 fixed 标志 + Row 元素列表。
  // summary 由适配层（Table.tsx）解析自 TableProps.summary（函数→调用、ReactNode→原样）后传入。
  // 引擎只负责：① grid-template-rows 末尾追加 summary 行 track；② 渲染 summary 区（cloneElement
  //   给每个 Row 注入 __rowLine + __fixed）。
  const summaryParsed = useMemo(() => {
    if (!summary) return null
    const { fixed, rows } = parseSummaryNode(summary)
    if (rows.length === 0) return null
    return { fixed, rows, count: rows.length }
  }, [summary])
  const summaryEnabled = !!summaryParsed

  // sticky 模式 + summary 存在时，summary 行从主 grid 提取为独立兄弟 grid，
  // 渲染顺序 grid(数据) → StickyScrollBar → summary-grid，使横向滚动条落在 summary 上方（数据区末尾）。
  // 非 sticky 模式 / 无 summary → false（summary 留在主 grid 内）。详见 sticky 分支。
  const extractSummary = stickyEnabled && !!summaryParsed

  // 解析列：优先 columnTree（多级表头），否则退化到 columns（单层）。
  // 强制 multi 路径的条件（任一即走显式 grid-column/grid-row 定位）：
  //   - 任一叶子列声明了 onCell（单元格合并）或 colSpan 字段（表头横向合并）——grid-auto-flow:column
  //     下跨列 span 会打乱列顺序，必须显式定位才能稳定放置合并格。
  //   - 虚拟滚动（占位 track 机制需要精确 grid-row 控制）。
  //   - 展开启用（需精确 grid-row 插入展开 track）。
  //   - summary 启用（summary Cell 用显式定位，auto-flow:column 会与之冲突）。
  //   - components.body.row 提供（行优先 DOM + Provider 包裹需要显式定位）。
  //   - empty 区启用（跨列 empty 区显式定位）。
  const resolved = useMemo(() => {
    // empty 区启用条件——emptyText 提供且 dataSource 空（无数据可显示）。
    // 启用时强制 multi 路径（显式 grid-row/grid-column 定位 empty 区），与 summary/expand 同款理由。
    const emptyEnabled = !!emptyText && dataSource.length === 0
    if (columnTree && columnTree.length > 0) {
      const r = resolveColumnTree(columnTree)
      // 检测单元格合并（onCell）或表头合并（colSpan≠1 或存在 covered 表头格）。
      const hasOnCell = r.leafColumns.some((c) => typeof c.onCell === 'function')
      const hasHeaderMerge = r.headerCells.some(
        (h) => (h.headerColSpan ?? 1) !== 1 || h.covered === true,
      )
      const forceMulti = hasOnCell || hasHeaderMerge
      const multi = r.maxDepth > 1 || forceMulti
      return {
        mode: (multi || virtualEnabled || expandEnabled || treeEnabled || summaryEnabled || emptyEnabled || !!components?.body?.row ? ('multi' as const) : ('flat' as const)),
        maxDepth: r.maxDepth,
        leafColumns: r.leafColumns,
        headerCells: r.headerCells,
      }
    }
    // 单层路径：columns 即叶子列。
    // 同样检测合并需求；若有 onCell 或 colSpan 字段，把 columns 包装成单层 columnTree
    // 走 resolveColumnTree（得到 headerCells 供 covered 处理），再强制 multi。
    // 虚拟 / 展开 / 树形 / summary / empty / components.body.row 提供时也包装成 multi（理由同 columnTree 分支）。
    const flatLeavesRaw: Array<EngineLeafColumn<RecordType>> = columns ?? []
    const hasOnCellFlat = flatLeavesRaw.some((c) => typeof c.onCell === 'function')
    const hasHeaderColSpanFlat = flatLeavesRaw.some(
      (c) => c.colSpan !== undefined && c.colSpan !== 1,
    )
    if (hasOnCellFlat || hasHeaderColSpanFlat || virtualEnabled || expandEnabled || treeEnabled || summaryEnabled || emptyEnabled || !!components?.body?.row) {
      // 包装成单层 columnTree（每个叶子列作为根节点）。
      const pseudoTree = flatLeavesRaw.map((c) => ({ ...c, children: undefined }))
      const r = resolveColumnTree(pseudoTree)
      return {
        mode: 'multi' as const,
        maxDepth: 1,
        leafColumns: r.leafColumns,
        headerCells: r.headerCells,
      }
    }
    // 无合并的单层 → flat 快速路径。
    return {
      mode: 'flat' as const,
      maxDepth: 1,
      leafColumns: flatLeavesRaw,
      headerCells: [] as Array<EngineHeaderCell<RecordType>>,
    }
  }, [columnTree, columns, virtualEnabled, expandEnabled, treeEnabled, summaryEnabled, emptyText, dataSource, components])

  const { mode, maxDepth, leafColumns, headerCells } = resolved

  // === 多级表头逐行累计 sticky 偏移 ===
  // 多行表头（maxDepth>1，如 grouping-columns）启用 headerStickyTop 时，若所有表头格都 sticky top:0，
  // 多行表头会堆叠在同一 y 重叠。本 hook 运行时测量每行高度，返回按行号升序的累计偏移数组
  // （index k = grid-row-start k+1 的 sticky top）。表头格按其 gridRowStart 取对应偏移，逐行分层 sticky。
  // 单行表头（maxDepth=1）→ [0] → 所有格 top:0，行为不变；showHeader=false → [] → 无影响。
  // 仅在表头纵向 sticky 启用时才有意义（否则不消费），但 hook 本身低成本，无条件调用保持引用稳定。
  const headerRowOffsets = useHeaderRowHeights(gridRef, showHeader ? maxDepth : 0)

  // 为 onHeaderRow(columns, index) 准备 columns 参数。
  // antd onHeaderRow 传入"当前表头行涉及的列"——单层表头即全部 columns；多级表头按层。
  // data-grid 简化：统一传**顶层列**（columnTree.raw 或 columns.raw）作为 columns 参数（调用方
  // 一般不读 columns 内容，仅按行返回固定 props；传顶层列已足够满足典型用例——onClick 行级交互等）。
  // 多级表头按层传不同列集较复杂，且 antd demo 无此用例，故简化为顶层列。
  const headerColumns = useMemo(
    () =>
      (columnTree && columnTree.length > 0
        ? columnTree
        : (leafColumns as unknown as Array<{ raw?: unknown }>)
      ).map((n) => n.raw),
    [columnTree, leafColumns],
  )

  // 第一列数据列索引（树形模式下渲染缩进 + 展开图标的目标列）。
  // 对齐 antd `expandIconColumnIndex`（nest 模式默认：有 rowSelection → 1，否则 → 0；
  // 但数据列在哨兵之后）。data-grid 用"第一个含 dataIndex 的叶子列"判定（哨兵列 SELECTION/
  // EXPAND 无 dataIndex）。无树形模式 → -1（不渲染缩进）。
  const treeFirstDataColumnIdx = useMemo(() => {
    if (!treeEnabled) return -1
    for (let i = 0; i < leafColumns.length; i += 1) {
      if (leafColumns[i].dataIndex !== undefined) return i
    }
    // 全部列无 dataIndex（罕见）→ 退化为 0。
    return 0
  }, [treeEnabled, leafColumns])

  // === 列宽拖拽调整 — 详见 docs/design-notes/column-width.md ===
  // enabled = resizable === true（默认由适配层决定；引擎层 undefined/false 不启用）。
  // resizedWidths 在算 colTracks 时优先覆盖 column.width；onPointerDown 绑定到 resizer 手柄。
  const resizeEnabled = resizable === true
  const { resizedWidths, resizingKey, onPointerDown: onResizerPointerDown } =
    useColumnResize({
      enabled: resizeEnabled,
      minWidth: resizableMinWidth,
      maxWidth: resizableMaxWidth,
    })

  // === 固定列 sticky 偏移 — 详见 docs/design-notes/fixed-column.md ===
  // useStickyColumns 用 ResizeObserver 监听叶子表头格宽度变化重算。
  const { leafSticky, headerSticky, hasFixed } = useStickyColumns(
    leafColumns,
    headerCells,
    gridRef,
  )

  // === 单元格合并计划 ===
  // computeCellMergePlan 内部已检测 onCell 是否存在；无 onCell 返回 null（无合并，跳过开销）。
  const cellMergePlan: CellMergePlan | null = useMemo(
    () => computeCellMergePlan(leafColumns, dataSource),
    [leafColumns, dataSource],
  )

  // === 虚拟滚动：约定行高 + 有界行高模型 — 详见 docs/design-notes/virtualization.md 与 row-height.md ===
  // getRowHeight 是 useVirtualList 算 offset/totalSize 的唯一行高来源。
  // 此处只用"收起态"约定行高，不感知展开态（详见 useVirtualList 注释 + docs/design-notes/virtualization.md）。
  //
  // rowHeight 仅来自 `gridOptions.rowHeight`。优先级：`gridOptions.rowHeight` > 虚拟默认 56
  //   （对齐 antd virtual-list 表观行高，antd large ≈ 55）。
  // boundedRowHeight：minRowHeight 与 maxRowHeight **同时**为正数时启用「有界行高模型」
  //   （行随内容在 [min,max] 变高，body track=auto + 行容器 min/max-height 约束）。
  //   仅设其一或都未设 → 固定行高模型（body track = `${effectiveRowHeight}px`）。
  const gridRowHeightOpt = gridOptions?.rowHeight
  const minRowHeightRaw = gridOptions?.minRowHeight
  const maxRowHeightRaw = gridOptions?.maxRowHeight
  const resolvedRowHeight = gridRowHeightOpt ?? (virtualEnabled ? 56 : undefined)
  const boundedRowHeight =
    typeof minRowHeightRaw === 'number' &&
    minRowHeightRaw > 0 &&
    typeof maxRowHeightRaw === 'number' &&
    maxRowHeightRaw > 0 &&
    minRowHeightRaw <= maxRowHeightRaw
  const minRowHeight = boundedRowHeight ? (minRowHeightRaw as number) : undefined
  const maxRowHeight = boundedRowHeight ? (maxRowHeightRaw as number) : undefined
  const getRowHeight = useCallback(
    (index: number) => {
      // 有界模式下，未测行回退用 minRowHeight（而非 rowHeight），保证 track=auto + 行容器 min-height
      // 时虚拟窗口初始 offset 与首屏一致（首测后由 sizeOf 实测接管）。
      if (boundedRowHeight) {
        const rec = dataSource[index]
        const declared =
          typeof gridRowHeightOpt === 'function'
            ? gridRowHeightOpt(rec, index)
            : typeof gridRowHeightOpt === 'number'
              ? gridRowHeightOpt
              : minRowHeight
        return clampSize(declared, minRowHeight, maxRowHeight)
      }
      return resolveNumericRowHeight(resolvedRowHeight, dataSource[index], index)
    },
    [
      boundedRowHeight,
      gridRowHeightOpt,
      minRowHeight,
      maxRowHeight,
      dataSource,
      resolvedRowHeight,
    ],
  )

  // 滚动容器 ref（虚拟下承载纵向滚动；非虚拟时不使用）。
  const virtualScrollRef = useRef<HTMLDivElement | null>(null)

  // 表头占高（用于虚拟滚动 contentOffset 校正）：showHeader 时 = maxDepth × headerHeight(数值)，
  // 缺省 headerHeight 走 CSS 'auto'——虚拟下需要数值，给一个近似值 40（与默认行高一致）。
  // 这里只是给 useVirtualList 校正 scrollTop/viewportSize 用，对最终视觉无影响（表头实际高度由
  // grid-template-rows 的 headerTracks 决定，paddingTop/Bottom 是数据区独立计算）。
  const headerHeightNum = showHeader
    ? maxDepth * (typeof headerHeight === 'number'
      ? headerHeight
      : typeof headerHeight === 'string' && /^[\d.]+px$/.test(headerHeight.trim())
        ? Number.parseFloat(headerHeight)
        : 40)
    : 0

  const virtualState = useVirtualList({
    itemCount: dataSource.length,
    getRowHeight,
    containerRef: virtualScrollRef,
    enabled: virtualEnabled,
    contentOffset: headerHeightNum,
    // .dg-grid 默认 row-gap:0（CSS 未声明），故传 0；将来若 CSS 引入 row-gap，
    // 此处读 CSS 变量 --dg-row-gap（默认 0）传入。data-grid 表格通常无行间距。
    gap: 0,
  })

  // === effectiveRowHeight：body track 行高取值 — 详见 docs/design-notes/virtualization.md ===
  //   - 有界模型（minRowHeight/maxRowHeight 均设）：实测优先（sizeOf 闭环），未测回退 getRowHeight；
  //     clamp 到 [min,max]；body track 取该值（min-height/max-height 同样约束行容器，二者一致保对齐）。
  //   - 固定模型（默认）：取 getRowHeight(i)（= resolvedRowHeight 数值化）。
  // 该值同时回填到每行 cell 的 `data-known-size`（实测闭环，避免 useRowMeasurements 死循环）。
  const effectiveRowHeight = useCallback(
    (i: number): number => {
      if (boundedRowHeight) {
        const measured = virtualEnabled ? virtualState.sizeOf(i) : 0
        const base = measured > 0 ? measured : getRowHeight(i)
        return clampSize(base, minRowHeight, maxRowHeight)
      }
      return getRowHeight(i)
    },
    [boundedRowHeight, virtualEnabled, virtualState, getRowHeight, minRowHeight, maxRowHeight],
  )

  // 暴露 scrollTo（仅在虚拟模式下有效；非虚拟调用为 no-op）。
  useImperativeHandle(
    ref,
    (): GridTableHandle => ({
      scrollTo: (config) => {
        if (!virtualEnabled) return
        virtualState.scrollTo(config)
      },
    }),
    [virtualEnabled, virtualState],
  )

  // === 行展开布局信息 — 详见 docs/design-notes/expand.md ===
  // 为每个可见数据行计算其在 grid 中的 row line（含展开 track 偏移）+ 该行展开 track 的 row line。
  // expandLayout: Map<rowIndex, { rowLine, expandTrackLine? }>。
  //   - rowLine：该数据行 track 的起始线（1-based grid row line）。
  //   - expandTrackLine：该行下方展开内容 track 的起始线（仅可展开行有；= rowLine + 1）。
  // expandTrackSizes: Map<rowIndex, '0fr' | '1fr'>（可展开行的展开 track 大小）。
  // 在 gridTemplateRows 构建时与 bodyTracks 拼接；在渲染数据格 / 展开内容时取定位。
  const expandLayout = useMemo(() => {
    const layout = new Map<number, { rowLine: number; expandTrackLine?: number }>()
    if (!expandEnabled || !expandState) return { layout }
    const { isExpandable } = expandState
    const headerRowsUsed = showHeader ? maxDepth : 0
    // 虚拟下数据行起始线 = headerRows + 1(paddingTop track) + 1（首行）；
    // 非虚拟 = headerRows + 1。
    let lineCursor = headerRowsUsed + (virtualEnabled ? 1 : 0)
    const lo = virtualEnabled ? virtualState.start : 0
    const hi = virtualEnabled ? virtualState.end : dataSource.length
    for (let i = lo; i < hi; i += 1) {
      // lineCursor 后 +1 = 该数据行的起始线（track N 占用 [lineCursor+1, lineCursor+2]）。
      const rowLine = lineCursor + 1
      const record = dataSource[i]
      let expandTrackLine: number | undefined
      if (record !== undefined) {
        const key = getRowKey(record, rowKey)
        if (isExpandable(key)) {
          expandTrackLine = rowLine + 1
          lineCursor += 2 // 数据行 track + 展开内容 track 各占 1
        } else {
          lineCursor += 1
        }
      } else {
        lineCursor += 1
      }
      layout.set(i, { rowLine, expandTrackLine })
    }
    return { layout }
  }, [expandEnabled, expandState, showHeader, maxDepth, virtualEnabled, virtualState, dataSource, rowKey])

  // === grid 模板 ===
  // 虚拟模式：headerTracks + paddingTopTrack + [start,end) 数据行 tracks（含展开 track）+ paddingBottomTrack。
  // 非虚拟：headerTracks + 全部数据行 tracks（含展开 track）。无展开时退化为简单行 track。
  // summary 启用时末尾追加 summaryTracks（每行一条 'auto'），并返回 summaryStartLine
  //   供渲染时给 summary Row 注入 grid-row 线号。
  const { gridTemplateRows, gridTemplateColumns, gridAutoFlow, summaryStartLine, paddingTopLine, paddingBottomLine } = useMemo(() => {
    const headerRows = showHeader ? maxDepth : 0
    const headerTrackUnit = toTrack(headerHeight) ?? 'auto'
    const headerTracks: string[] = []
    for (let i = 0; i < headerRows; i += 1) headerTracks.push(headerTrackUnit)

    let bodyTracks: string[]
    if (virtualEnabled) {
      // 虚拟：只列可视区数据行 tracks（约定行高数值化）。前后各加一条占位 track 撑总高。
      // 展开内容 track 穿插在可视区数据行间（可展开行后插一条 0fr/1fr）。
      //   展开 track 不参与虚拟窗口大小（paddingTop/Bottom 仍按收起态 totalSize 算），展开会让实际
      //   DOM 总高 > totalSize，浏览器滚动条位置可能轻微偏移，但窗口稳定不崩。
      const visibleTracks: string[] = []
      for (let i = virtualState.start; i < virtualState.end; i += 1) {
        // 有界行高模型（详见 docs/design-notes/row-height.md）：
        //   - 有界模式（min/max 均设）：track = `auto`（行随内容自适应），每行 cell 加
        //     `min-height:minRowHeight; max-height:maxRowHeight`（dg-cell-bounded 类，见 table.css）。
        //     不能用 `minmax(min,max)` track：grid 的 free-space 分配会把所有 minmax track 拉满到 max
        //     （因为 paddingBottom track 撑大 grid 容器→grid 有大量 free space→minmax track 全部吸满）。
        //     用 `auto` track 不吸 free space，cell 的 min/max-height 约束真实高，实测闭环正确。
        //   - 固定模式（默认）：track = `${effectiveRowHeight(i)}px`（含 sizeOf 实测闭环；
        //     measurement 跑但实测≈固定值，视觉不变）。
        if (boundedRowHeight) {
          visibleTracks.push('auto')
        } else {
          visibleTracks.push(`${effectiveRowHeight(i)}px`)
        }
        // 展开内容 track（可展开行后紧跟一条）。
        if (expandEnabled && expandState) {
          const record = dataSource[i]
          if (record !== undefined) {
            const key = getRowKey(record, rowKey)
            if (expandState.isExpandable(key)) {
              visibleTracks.push(expandState.isExpanded(key) ? '1fr' : '0fr')
            }
          }
        }
      }
      // paddingTop/paddingBottom track 用 `'auto'`，由独立的 FillerRow grid item 撑高——
      // 详见 docs/design-notes/virtualization.md 的「占位 track / FillerRow（spacer 解耦）」一节。
      bodyTracks = ['auto', ...visibleTracks, 'auto']
    } else {
      // 非虚拟下数据行间穿插展开内容 track（可展开行后插一条 0fr/1fr）。无展开时退化为 dataSource.map。
      if (expandEnabled && expandState) {
        const tracks: string[] = []
        dataSource.forEach((record, index) => {
          // 有界行高模型（非虚拟分支同款）：有界模式用 auto track + cell min/max-height。
          let baseTrack: string
          if (boundedRowHeight) {
            baseTrack = 'auto'
          } else if (typeof rowHeight === 'function') {
            baseTrack = toTrack(rowHeight(record, index)) ?? 'auto'
          } else {
            baseTrack = rowHeight !== undefined ? `${rowHeight}px` : 'auto'
          }
          tracks.push(baseTrack)
          const key = getRowKey(record, rowKey)
          if (expandState.isExpandable(key)) {
            tracks.push(expandState.isExpanded(key) ? '1fr' : '0fr')
          }
        })
        bodyTracks = tracks
      } else {
        bodyTracks = dataSource.map((record, index) => {
          // 有界行高模型（非虚拟分支同款）：有界模式用 auto track + cell min/max-height。
          if (boundedRowHeight) {
            return 'auto'
          }
          if (typeof rowHeight === 'function') {
            const v = rowHeight(record, index)
            return toTrack(v) ?? 'auto'
          }
          return rowHeight !== undefined ? `${rowHeight}px` : 'auto'
        })
      }
    }

    const colTracks = leafColumns.map((col) => {
      // 隐藏列：track 置为 `0fr`（不删除，保线号稳定）— 详见 docs/design-notes/hidden-column.md。
      if (col.hidden) return '0fr'
      // 列宽拖拽：用户拖拽过的列优先用 resizedWidths（具体 px），覆盖 column.width。
      // 未拖拽过的列保持原逻辑（column.width → max-content / fixed 下 minmax(0,1fr)）。
      // 这样首次拖拽 max-content 列时，第一次 move 即把该列从 max-content 转为受控 px。
      // 拖拽后的列固定为受控 px，不参与 1fr 比例分配（用户已明确指定该列宽，不应再被比例伸缩；
      // 其余列按各自的 minmax/max-content 策略分剩余）。
      const resized = resizedWidths.get(col.key)
      if (resized !== undefined) return `${resized}px`
      // 列宽 track 策略（对齐 antd `<table width:100%>` + table-layout 行为）— 详见 docs/design-notes/column-width.md。
      //
      // grid-track 等效模拟 `<col width>` + `table-layout` 的「绝对 width 列=绝对宽不参与 fr 分配、
      // 无 width 列分剩余空间」语义：
      //   - 绝对 width 列（number / 非百分比字符串如 `'100px'`）：
      //     · fixed 列（column.fixed 存在）不论 tableLayout 一律 `${width}`（严格 track，内容超 clip/ellipsis）。
      //       对齐 antd 6.4.4 实测：fixed 列恒严格 width，即便 mergedTableLayout 派生为 'auto'
      //       （fixColumn + scroll.x==='max-content' 场景）也不被长内容撑开。
      //     · fixed 模式（非 fixed 列）→ `${width}`（绝对 track，不参与 fr 分配）——对齐 antd
      //       `table-layout:fixed` 下 `<col style="width:Npx">` 的语义：width 列锁定为绝对宽，剩余空间
      //       由无 width 列分。
      //     · auto 模式（非 fixed 列）→ `minmax(width, max-content)`：min=width（保底），max=content
      //       （可随内容增长，与 antd `table-layout:auto` 下 `<col width>` 列宽=content 但至少 width 语义一致）。
      //   - 百分比 width 列（如 `'20%'`）：原样作为 track（不包 minmax）——antd 不转换；grid 与 antd 语义一致。
      //   - 无 width 列：fixed → `minmax(0, 1fr)`（min:0 收缩触发 ellipsis；max=1fr 均分剩余空间）；
      //     auto → `minmax(min-content, 1fr)`（min=min-content 内容可换行收缩保底，max=1fr 拉伸填满剩余空间）。
      //   - 配合 `.dg-grid{width:100%}`（见 gridStyle）约束表格总宽=容器宽：width 列绝对 track 之和
      //     >容器 时出横滚；<容器 时剩余由无 width 列的 1fr 撑满。
      const w = toTrack(col.width)
      if (w !== undefined) {
        // 百分比 width（含 '%'）：原样 track（antd `<col style="width:xx%">` 等效）。
        if (typeof col.width === 'string' && col.width.includes('%')) return w
        // fixed 列（column.fixed 存在）不论 tableLayout 一律严格 `${width}` track（不包 minmax）。
        if (col.fixed) return `${w}`
        // 绝对 width（非 fixed）：fixed=绝对 track（不参与 fr）/ auto=minmax(width,max-content) 可增长。
        return tableLayout === 'fixed' ? `${w}` : `minmax(${w}, max-content)`
      }
      // 无 width：fixed → minmax(0,1fr) 收缩（ellipsis 视觉，分剩余）；
      // auto → minmax(min-content,1fr)：min=min-content（内容可换行收缩，下限=最长不可拆词，被容器约束），
      //   max=1fr（拉伸填满剩余）。对齐 antd table-layout:auto + <table width:100%> 语义——窄视口内容换行、
      //   grid 不溢出容器。
      // 无 width 的 fixed 列（如 fixed-gapped-columns 的 Column1 fixed:start 无 width）仍走此分支
      //   （保持原 minmax 行为）——antd 该列实际也按内容/auto 布局，无声明 width 不可严格。
      return tableLayout === 'fixed' ? 'minmax(0, 1fr)' : 'minmax(min-content, 1fr)'
    })

    // summary 区 tracks（grid-template-rows 末尾追加，每行一条 'auto' track）。
    // summary 行高按内容自适应（'auto'），与表体行高约定无关——summary 通常是单行文本，
    // 不需要参与虚拟窗口/行高约定计算。
    const summaryTracks: string[] = summaryParsed
      ? Array.from({ length: summaryParsed.count }, () => 'auto')
      : []
    // summary 区起始线号 = headerTracks + bodyTracks + 1（1-based grid line）。
    // summary 第 0 行 track 占 [summaryStartLine, summaryStartLine+1]。
    const summaryStartLine = summaryParsed
      ? headerTracks.length + bodyTracks.length + 1
      : 0

    // FillerRow（撑 paddingTop/Bottom 的独立 grid item）所在 grid-row 线号。
    //   - paddingTop track 紧跟 headerTracks：其 1-based 起始线 = headerTracks.length + 1。
    //   - paddingBottom track 是 bodyTracks 末条：起始线 = headerTracks.length + bodyTracks.length。
    //     （summaryStartLine>0 时 = summaryStartLine - 1；summaryStartLine=0 时直接由 tracks 长度算。）
    //   虚拟模式下 bodyTracks 首末恒为 'auto'（FillerRow 用 height 撑高其 auto track）。
    //   非虚拟下 bodyTracks 无 padding track（无 FillerRow），此处的线号仅虚拟场景使用。
    //   详见 docs/design-notes/virtualization.md 的「占位 track / FillerRow（spacer 解耦）」一节。
    const paddingTopLine = headerTracks.length + 1
    const paddingBottomLine = headerTracks.length + bodyTracks.length

    // 多级表头路径：关闭 auto-flow（用显式 grid-column/grid-row 定位）。
    // 单层路径：保持 grid-auto-flow:column。
    // summary 启用时强制关闭 auto-flow（用显式定位）——summary Cell 用 gridColumn/gridRow 显式定位，
    // auto-flow:column 会导致表体格 DOM 按列连续填充时与 summary Cell 的显式定位冲突。
    return {
      gridTemplateRows: [...headerTracks, ...bodyTracks, ...summaryTracks].join(' ') || 'none',
      gridTemplateColumns: colTracks.join(' ') || 'none',
      gridAutoFlow: mode === 'multi' || summaryEnabled ? undefined : ('column' as const),
      summaryStartLine,
      paddingTopLine,
      paddingBottomLine,
    }
  }, [
    mode,
    maxDepth,
    leafColumns,
    dataSource,
    rowHeight,
    boundedRowHeight,
    minRowHeight,
    maxRowHeight,
    effectiveRowHeight,
    headerHeight,
    showHeader,
    virtualEnabled,
    virtualState,
    getRowHeight,
    resizedWidths,
    expandEnabled,
    expandState,
    rowKey,
    summaryParsed,
    summaryEnabled,
    tableLayout,
  ])

  // 整行 hover：记录当前 hover 的数据行 index（null 表示未 hover）。
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null)

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateRows,
    gridTemplateColumns,
    ...(gridAutoFlow ? { gridAutoFlow } : null),
    // 有界行高模型：注入 CSS 变量供 .dg-cell-body（dg-grid-bounded 下）消费
    //   （cell min-height/max-height）。仅 boundedRowHeight 时设；不设时 CSS 规则不命中。
    ...(boundedRowHeight
      ? ({
          '--dg-row-min-h': `${minRowHeight}px`,
          '--dg-row-max-h': `${maxRowHeight}px`,
        } as CSSProperties)
      : null),
    // `.dg-grid` 恒定 `width:100%`（对齐 antd `<table>` CSS `.ant-table table{width:100%}`）。
    // 详见 docs/design-notes/column-width.md 的「.dg-grid { width: 100% } 配合」一节。
    // sticky 模式例外：sticky 下不加 width:100%（保留 width:auto）——详见 docs/design-notes/sticky.md。
    ...(!stickyEnabled ? { width: '100%' } : null),
  }

  // === 滚动容器 ===
  // `scroll.x` 存在时，grid 自身 min-width=x（撑宽内部 .dg-scroll 触发横向滚动）。
  // 外层滚动包装统一由下方 renderScrollContainer 路由处理（非 sticky 一律 FloatingScrollBar）。
  // 虚拟：FloatingScrollBar 内部 .dg-scroll overflow-y:auto 双向（虚拟路径）。
  const scrollX = scroll?.x
  const scrollMinWidth = scrollX !== undefined ? (typeof scrollX === 'number' ? `${scrollX}px` : scrollX) : undefined
  const gridFinalStyle: CSSProperties = scrollMinWidth
    ? { ...gridStyle, minWidth: scrollMinWidth }
    : gridStyle
  // 语义化 content 部位 style（合并到 grid 根容器 style）。
  const semanticContentStyle = semantic?.content?.style
  // semantic content style 合并到 grid 根 style（gridFinalStyle 之后覆盖）。
  const gridFinalStyleWithSemantic: CSSProperties = semanticContentStyle
    ? { ...gridFinalStyle, ...semanticContentStyle }
    : gridFinalStyle

  const gridClassName = [
    'dg-grid',
    // 语义化 content 部位 class（合并到 grid 根容器）。
    semantic?.content?.className,
    // 拖拽进行中加 dg-grid-resizing 类，禁用 grid-template-columns 过渡
    // （否则拖拽时 0.3s 过渡会与实时更新叠加产生抖动/延迟）。
    resizingKey !== null ? 'dg-grid-resizing' : undefined,
    // 有界行高模型：加标记类，CSS 据此给 .dg-cell-body 加 min/max-height（约束 auto track）。
    boundedRowHeight ? 'dg-grid-bounded' : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // 渲染表格 grid 内容（multi 与 flat 两路径）；外层滚动包装由 renderScrollContainer 路由决定。
  const renderGrid = () => {
    if (mode === 'multi') {
      // 1-based 数据行起始线号。
      // - 非虚拟：headerRowsUsed + index + 1。
      // - 虚拟：headerRowsUsed + 1(paddingTop track) + (index - virtualState.start) + 1
      //   （占位 track 多占一行，数据行向后偏移 1）。
      // - 展开启用：数据行间穿插展开内容 track，行线号偏移由 expandLayout 给出。
      const headerRowsUsed = showHeader ? maxDepth : 0
      const rowLineBase = (index: number) => {
        // 展开 track 偏移由 expandLayout 预计算（含可展开行多占的展开 track）。
        const fromExpand = expandLayout.layout.get(index)
        if (fromExpand) return fromExpand.rowLine
        // 无展开 / 兜底：退化为原计算。
        return virtualEnabled
          ? headerRowsUsed + 1 + (index - virtualState.start) + 1
          : headerRowsUsed + index + 1
      }
      return (
        <div className={gridClassName} style={gridFinalStyleWithSemantic} ref={gridRef}>
          {/* 虚拟模式下渲染独立 FillerRow grid item 撑 paddingTop（替代原 grid-template-rows 的
              `${paddingTop}px` track）— 详见 docs/design-notes/virtualization.md 的「占位 track / FillerRow」一节。
              grid-template-rows 该 track 改 'auto'，FillerRow 用 height 撑高（auto track 包裹子元素高）。
              FillerRow 不打 data-row-index，useRowMeasurements 跳过它。grid-column:1/-1 跨整行
              不影响固定列/合并 cell 的列定位；grid-row 显式定位到 paddingTopLine。 */}
          {virtualEnabled ? (
            <div
              className="dg-filler-row dg-filler-top"
              style={{
                gridColumn: '1 / -1',
                gridRow: paddingTopLine,
                height: virtualState.paddingTop,
                pointerEvents: 'none',
              }}
            />
          ) : null}
          {/* 表头区：显式定位的表头格（sticky 信息来自 headerSticky）— 详见 docs/design-notes/header.md 与 fixed-column.md。
              跳过 covered 表头格（被前面的 colSpan>1 表头覆盖，不渲染 DOM）。
              虚拟 / 非虚拟 scroll.y：表头格额外 position:sticky; top:0（z-index 4），
              相对滚动容器顶部固定（由 headerStickyTop 标志统一驱动）。 */}
          {showHeader
            ? headerCells.map((cell) =>
                cell.covered ? null : (
                  <HeaderCell
                    key={`h-${cell.key}`}
                    cell={cell}
                    sticky={headerSticky.get(cell.key)}
                    headerStickyTop={headerStickyTop}
                    stickyHeaderOffset={stickyHeaderOffset}
                    // 按 cell.gridRowStart 取逐行累计偏移，多级表头分层 sticky 避免堆叠。
                    headerStickyTopOffset={
                      cell.gridRowStart >= 1
                        ? headerRowOffsets[cell.gridRowStart - 1] ?? 0
                        : 0
                    }
                    resizeEnabled={resizeEnabled}
                    onResizerPointerDown={onResizerPointerDown}
                    resizingKey={resizingKey}
                    semanticHeader={semantic?.header}
                    onSorterClick={onSorterClick}
                    onFilterApply={onFilterApply}
                    // onHeaderRow 行级 props 透传到表头格（grid 无 tr，行 props 分发到该行所有表头格）。
                    onHeaderRow={onHeaderRow}
                    getPopupContainer={getPopupContainer}
                    headerColumns={headerColumns}
                    // Table 级 locale 透传到表头格内的 FilterDropdown。
                    filterLocale={filterLocale}
                  />
                ),
              )
            : null}
          {/* 数据区：按数据行 × 叶子列显式定位（sticky 来自 leafSticky[colIdx]）— 详见 docs/design-notes/fixed-column.md。
              当 components.body.row 提供时，按**行**优先遍历，每行用 body.row 组件包裹该行所有单元格
              （body.row 不产生 DOM 或产生不影响 grid 的 DOM——典型 EditableRow 用 antd Form + Context.Provider，
              Provider 不渲染真实 DOM，单元格仍是 grid 直接子元素，grid 显式定位保证布局正确）。
              无 body.row 时按列优先遍历（单元格 DOM 列连续，性能略优）。
              cellMergePlan 驱动——hidden 格不渲染 DOM；非隐藏格设 grid-column/grid-row span。
                - 合并格若落在固定列区域，sticky 偏移取左上角列（colIdx）的 leafSticky，自然正确
                  （被覆盖格不渲染，仅左上角格渲染并整体固定）。
              虚拟：只遍历 [start, end)；其余由占位 track 撑总高。
                已知简化：若某 rowSpan>1 的左上角在可视区**外**（start 之前），其延伸到可视区内的
                覆盖格本就不渲染（hidden），故可视区会出现"缺一块"。详见 docs/design-notes/virtualization.md。 */}
          {renderBodyCells({
            leafColumns,
            dataSource,
            virtualEnabled,
            virtualState,
            cellMergePlan,
            expandEnabled,
            expandState,
            rowKey,
            hoveredRowIndex,
            setHoveredRowIndex,
            rowLineBase,
            leafSticky,
            treeEnabled,
            treeState,
            treeFirstDataColumnIdx,
            components,
            semanticBody: semantic?.body,
            // onRow / rowClassName 透传到表体单元格（grid 无 tr，行 props / 行 class 分发到该行所有单元格）。
            onRow,
            rowClassName,
            rowHoverable,
            // 行选中态判定 → 加 dg-row-selected 类（详见 docs/design-notes/selection.md）。
            isRowSelected,
            // 首列写 data-known-size（实测闭环，详见 docs/design-notes/virtualization.md）。
            effectiveRowHeight,
          })}
          {/* 行展开内容：每个可展开 + 展开中的数据行渲染一条展开内容 grid item — 详见 docs/design-notes/expand.md。
              grid-column: 1 / -1 跨整行，grid-row 指向该行下方的展开内容 track。
              track size 已由 grid-template-rows 设为 1fr（展开）/0fr（收起），这里只渲染内容容器。
              容器 overflow:hidden + min-height:0——0fr track 下被裁剪不可见，1fr track 下自然展开。
              虚拟 × 展开：展开内容只在可视区数据行范围内渲染（与数据行同窗口），虚拟窗口大小仍按收起态算。 */}
          {expandEnabled && expandState
            ? renderExpandedContents({
                dataSource,
                virtualEnabled,
                virtualState,
                expandState,
                expandLayout: expandLayout.layout,
                rowKey,
              })
            : null}
          {/* 自定义空状态：dataSource 空时渲染跨所有列的 empty 占位区。
              empty grid item 显式定位到 headerTracks 之后的第一条 track（grid-row: headerRowsUsed+1），
              grid-column: 1 / -1 跨所有列；内容居中（.dg-empty 区 padding + flex center）。
              内容来自 emptyText（适配层已按 locale.emptyText > ConfigProvider.renderEmpty('Table') > 默认 Empty
              优先级解析；表体 empty 不区分空数据 vs 筛选无结果——对齐 antd InternalTable.tsx:714-717）。
              非空时不渲染。 */}
          {emptyText && dataSource.length === 0 ? (
            <div
              className="dg-empty"
              style={{
                gridColumn: '1 / -1',
                gridRow: headerRowsUsed + 1,
                padding: '32px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {emptyText}
            </div>
          ) : null}
          {/* 汇总 summary 区：grid 末尾的 summary 行 — 详见 docs/design-notes/summary.md。
              summaryParsed.rows 为解析得到的 Summary.Row 元素列表；引擎对每个 Row cloneElement
              注入 __rowLine（grid-row 起始线号 = summaryStartLine + rowIndex）+ __fixed（sticky bottom）
              + __leafSticky（固定列横向 sticky 信息，与表体固定列同源 leafSticky）。
              Row 内部通过 Context 把 rowLine/fixed/leafSticky 传给其 Cell 子节点，Cell 据此设 grid-row +
              gridColumn + sticky bottom + 横向 sticky left/right。
              sticky 模式启用且 summary 存在时，summary 行从此 grid 内挪出，改在 sticky 分支作为独立 grid
              渲染（顺序 grid(数据) → StickyScrollBar → summary-grid），使横向滚动条落在 summary **上方**
              （数据区末尾）。此处 skip 渲染；summaryStartLine 对应的 'auto' track 无 grid item → 折叠为 0 高。 */}
          {/* 虚拟模式下渲染独立 FillerRow grid item 撑 paddingBottom（同 paddingTop，线号 paddingBottomLine）。
              放在 summary 之前（若有 summary，paddingBottom 在表体末、summary 前）。 */}
          {virtualEnabled ? (
            <div
              className="dg-filler-row dg-filler-bottom"
              style={{
                gridColumn: '1 / -1',
                gridRow: paddingBottomLine,
                height: virtualState.paddingBottom,
                pointerEvents: 'none',
              }}
            />
          ) : null}
          {summaryParsed && summaryStartLine > 0 && !extractSummary
            ? summaryParsed.rows.map((row, rowIndex) => {
                const rowLine = summaryStartLine + rowIndex
                return cloneElement(row, {
                  key: `dg-summary-row-${rowIndex}`,
                  __rowLine: rowLine,
                  __fixed: summaryParsed.fixed,
                  __leafSticky: leafSticky,
                } as Partial<typeof row.props>)
              })
            : null}
        </div>
      )
    }

    // 单层快速路径：grid-auto-flow:column，每列 DOM 连续。
    // 注意：虚拟模式下不会走到这里（虚拟强制 multi）。
    return (
      <div className={gridClassName} style={gridFinalStyleWithSemantic} ref={gridRef}>
        {leafColumns.map((column, colIdx) => (
          <ColumnCells<RecordType>
            key={column.key}
            column={column}
            colIdx={colIdx}
            // 表头分隔线排除：单层末列标记（对齐 antd `thead th:not(:last-child)::before`）— 详见 docs/design-notes/header.md。
            //   单层无分组，仅需末列排除；多级路径由 columnTree.markLastLeaves 算 data-group-last。
            isLastLeaf={colIdx === leafColumns.length - 1}
            dataSource={dataSource}
            rowKey={rowKey}
            showHeader={showHeader}
            hoveredRowIndex={hoveredRowIndex}
            onHoverRow={setHoveredRowIndex}
            sticky={leafSticky[colIdx]}
            headerStickyTop={headerStickyTop}
            stickyHeaderOffset={stickyHeaderOffset}
            // flat 单行表头 → headerRowOffsets=[0]，表头格 top:0。
            headerStickyTopOffset={headerRowOffsets[0] ?? 0}
            resizeEnabled={resizeEnabled}
            onResizerPointerDown={onResizerPointerDown}
            resizingKey={resizingKey}
            onSorterClick={onSorterClick}
            onFilterApply={onFilterApply}
            semanticHeader={semantic?.header}
            semanticBody={semantic?.body}
            components={components}
            // onHeaderRow / onRow / rowClassName 透传到 flat 路径的表头格 + 表体单元格（与 multi 路径同款接入）。
            onHeaderRow={onHeaderRow}
            onRow={onRow}
            rowClassName={rowClassName}
            rowHoverable={rowHoverable}
            getPopupContainer={getPopupContainer}
            headerColumns={headerColumns}
            // 行选中态判定 → 加 dg-row-selected 类（详见 docs/design-notes/selection.md）。
            isRowSelected={isRowSelected}
            // 实测闭环：flat 路径表体首列写 data-known-size（与 multi 路径 BodyCell 同款）。
            effectiveRowHeight={effectiveRowHeight}
            // Table 级 locale 透传到表头格内的 FilterDropdown。
            filterLocale={filterLocale}
          />
        ))}
      </div>
    )
  }

  // 语义化 section 部位 class/style（注入到滚动容器；无 semantic 时 sectionClassName=undefined）。
  const sectionClassName = semantic?.section?.className
  const sectionStyle = semantic?.section?.style
  const mergeSectionClass = (...base: Array<string | undefined>) =>
    [...base, sectionClassName].filter(Boolean).join(' ') || undefined
  const mergeSectionStyle = (base: CSSProperties | undefined): CSSProperties | undefined => {
    if (!sectionStyle) return base
    return { ...(base ?? null), ...sectionStyle }
  }

  // === 页面级粘性表头（区别于容器内固定）— 详见 docs/design-notes/sticky.md ===
  // sticky 启用时：grid **不包** overflow 容器（避免 overflow 祖先拦截表头 sticky 上下文），
  // grid 直接渲染 + min-width: scrollX 撑宽页面；表头 grid item 用 stickyHeaderOffset 驱动
  // （position: sticky; top: offsetHeader，相对 viewport 固定，已在上游 HeaderCell/ColumnCells 应用）。
  // grid 之后渲染 StickyScrollBar（position: sticky; bottom: offsetScroll）作为底部固定横向滚动条。
  //
  // 关键：grid 不包 overflow 容器 → grid 的最近可滚动祖先是 window（页面）→ 表头 sticky 相对
  //   viewport 固定（页面纵向滚动时表头钉在视口顶部 offsetHeader 处）。这是 sticky 与容器内固定表头
  //   的本质区别（容器内固定表头相对 .dg-fixed-header-scroll 容器固定，容器内滚动）。
  //
  // 横向滚动：依赖页面原生滚动条（页面横向滚动）。StickyScrollBar 额外提供"底部固定"的同步 thumb
  //   （视觉对齐 antd fake scrollbar）。
  //
  // 与固定列组合：固定列 grid item 的 position: sticky; left/right 与表头的 position: sticky; top
  //   在同一元素上叠加（corner cell 双 sticky，浏览器原生支持）。
  if (stickyEnabled) {
    // summary 存在时从主 grid 提取为独立兄弟 grid，渲染顺序
    //   grid(数据) → StickyScrollBar → summary-grid，使横向滚动条落在 summary 上方（数据区末尾）。
    //
    // 独立 summary grid 复用主 grid 的 grid-template-columns（列对齐）+ min-width:scrollX（横向滚动
    //   时与主 grid 同宽），grid-template-rows 仅含 summary tracks（每行 'auto'）。summary Cell 的
    //   grid-row 重置为 rowIndex+1（独立 grid 第 1 track）；fixed bottom（position:sticky;bottom:0）
    //   相对页面滚动容器仍生效（与主 grid 内行为一致）。横向 sticky 通过 __leafSticky 透传同样生效。
    const renderExtractedSummary = () => {
      if (!summaryParsed) return null
      // summary 行 track（每行一条 'auto'），独立 grid 的 grid-template-rows。
      const summaryOnlyRows = Array.from({ length: summaryParsed.count }, () => 'auto').join(' ')
      return (
        <div
          className={gridClassName}
          style={{
            display: 'grid',
            gridTemplateRows: summaryOnlyRows || 'none',
            gridTemplateColumns,
            // 与主 grid 同宽（scroll.x 撑宽页面时 summary grid 跟随，列对齐）。
            ...(scrollMinWidth ? { minWidth: scrollMinWidth } : null),
          }}
        >
          {summaryParsed.rows.map((row, rowIndex) =>
            cloneElement(row, {
              key: `dg-summary-row-${rowIndex}`,
              // 独立 grid：第 1 track = rowIndex+1（1-based grid line）。
              __rowLine: rowIndex + 1,
              __fixed: summaryParsed.fixed,
              __leafSticky: leafSticky,
            } as Partial<typeof row.props>),
          )}
        </div>
      )
    }
    return (
      <>
        {renderGrid()}
        <StickyScrollBar
          offsetScroll={stickyOffsetScroll}
          getContainer={stickyGetContainer}
          gridRef={gridRef}
        />
        {/* summary 提取到 StickyScrollBar 之后 → 横向滚动条落在 summary 上方。 */}
        {extractSummary ? renderExtractedSummary() : null}
      </>
    )
  }

  // === 滚动容器路由 — 详见 docs/design-notes/scrollbar.md ===
  //
  // **横向滚动统一悬浮条**（用户规约：绝不出占布局的原生横滚动条）：
  //   - 非 sticky 模式一律走 FloatingScrollBar（horizontal=true）。
  //   - 滚动容器 `.dg-scroll` 始终 overflow-x:auto 作为"滚动源"，原生横滚动条由
  //     `.dg-scroll-floating` 修饰类（FloatingScrollBar 自动添加）隐藏 width/height:0。
  //   - 横向不溢出时，HorizontalFloatingScrollBar 的 thumb 自动 display:none → 无任何条；
  //     溢出时显示悬浮条（细线 2px + hit 上下各 8px + hover 变粗 8px + 拖动/同步 translateX）。
  //   - 因此原生横滚动条**永不出现**：basic / fixed-columns / scroll.x / scroll.y / virtual 全部覆盖。
  //
  // **纵向滚动**（scroll.y === true，数据区域模式）：
  //   - 高度 CSS 自动适应：`.dg-scroll-wrap`（FloatingScrollBar 包装）`flex:1; min-height:0`，
  //     `.dg-scroll`（滚动容器）`flex:1; min-height:0; overflow-y:auto`。
  //     外层 `.dg-wrapper.dg-data-area`（Table.tsx 注入）`display:flex; flex-direction:column; height:100%`，
  //     让 wrap 填满父容器剩余空间——**不用 JS 算数字**。
  //   - 表头 sticky top（HeaderCell 的 headerStickyTop 标志驱动）钉顶，表体限高滚动。
  //   - 纵向悬浮滚动条（FloatingScrollBar 组件 vertical）。
  //
  // **sticky 例外**：stickyEnabled → 页面级滚动（.dg-wrapper.dg-sticky overflow:visible），
  //   直接 renderGrid()，不走 FloatingScrollBar。
  //
  // 虚拟滚动：scrollContainerRef 必须传入（virtualScrollRef）。

  // 横向滚动是否启用（scroll.x）。用于决定是否附加 `dg-x-scroll` 修饰类（仅 scroll.x 无 scroll.y 时）。
  // 注意：无论 scrollXEnabled 是否为 true，非 sticky 模式下横向悬浮条始终启用——不溢出时 thumb 隐藏。
  const scrollXEnabled = scrollX !== undefined

  // sticky 模式：页面级滚动，.dg-wrapper.dg-sticky overflow:visible，不走滚动容器。
  if (stickyEnabled) {
    return renderGrid()
  }

  // 非 sticky 模式：横向滚动统一 FloatingScrollBar（horizontal 始终 true；纵向按 scrollYEnabled）。
  // wrapStyle：数据区域模式下 wrap 填满（flex:1; min-height:0）；否则默认布局。
  const wrapBaseStyle: CSSProperties = scrollYEnabled
    ? { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' }
    : {}
  // 滚动容器 style：overflowX 始终 auto（作为横向滚动源，原生条由 .dg-scroll-floating 隐藏）；
  // overflowY 按 scrollYEnabled 开关（数据区域模式纵向滚动）。
  const containerStyle: CSSProperties = {
    // 数据区域模式：滚动容器 flex 填满 wrap；横向滚动模式：自适应内容高。
    ...(scrollYEnabled ? { flex: '1', minHeight: '0' } : null),
    overflowY: scrollYEnabled ? 'auto' : 'hidden',
    overflowX: 'auto',
  }
  const containerClasses = [
    'dg-scroll',
    virtualEnabled ? 'dg-virtual-scroll' : null,
    scrollYNonVirtual ? 'dg-fixed-header-scroll' : null,
    scrollXEnabled && !scrollYEnabled ? 'dg-x-scroll' : null,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <FloatingScrollBar
      wrapClassName={mergeSectionClass('dg-scroll-wrap')}
      wrapStyle={mergeSectionStyle(wrapBaseStyle)}
      scrollContainerClassName={containerClasses}
      scrollContainerStyle={containerStyle}
      scrollContainerRef={virtualEnabled ? virtualScrollRef : undefined}
      // 非 sticky 模式横向悬浮滚动条始终启用；不溢出时 thumb 自动隐藏（无视觉副作用）。
      horizontal={true}
    >
      {renderGrid()}
    </FloatingScrollBar>
  )
}

/**
 * 行展开内容渲染（multi 路径专用；flat 路径不启用展开——展开强制 multi）。详见 docs/design-notes/expand.md。
 *
 * 遍历可视区（虚拟）或全集（非虚拟）数据行，对"可展开 + 展开中"的行渲染一个展开内容 grid item：
 *   - grid-row：该行展开内容 track 的起始线（来自 expandLayout）。
 *   - grid-column: 1 / -1：跨整行（与 antd expandedRowRender 视觉一致）。
 *   - 容器 `overflow:hidden + min-height:0`：配合 track 0fr/1fr 过渡——0fr 时被裁剪、1fr 时自然展开。
 *
 * 收起的可展开行不渲染内容（节省 DOM）——track 仍存在（0fr）但无 grid item 占位，
 * 因为 0fr track 高度为 0，没有 grid item 也不影响布局。
 *
 * 注意：展开 track 在 grid-template-rows 中已定义为 1fr/0fr；这里只渲染内容容器 grid item。
 * 即便某行收起（track 0fr），渲染内容容器也无妨（会被 overflow:hidden 裁剪到 0），但为省 DOM，
 * 仅展开的行才渲染（与 antd rc-table 行为一致：展开才 mount 内容）。
 */
/**
 * 树形缩进 + 展开/收起图标渲染（在第一列数据单元格内，内容前）。
 *
 * - 缩进：`paddingLeft = level × indentSize`（对齐 antd BodyRow `paddingLeft: ${indentSize * indent}px`）。
 * - 展开图标：仅 `hasChildren` 行渲染；无 children 行渲染等宽占位（保持图标列对齐）。
 *   - 展开：▼（ExpandIcon expanded=true）。
 *   - 收起：▶（ExpandIcon expanded=false）。
 *   - 点击：treeState.toggleExpand(key)。
 *
 * 返回 inline-flex 容器（缩进 + 图标），与原 rendered 内容横向并列。
 */
function renderTreeIndent<RecordType>({
  record,
  rowKey,
  treeState,
}: {
  record: RecordType
  rowKey: string | ((record: RecordType) => string | number)
  treeState: EngineTreeState
}): ReactNode {
  const key = getRowKey(record, rowKey)
  const info = treeState.rowInfoMap.get(key)
  // rowInfoMap 中应有该 key（扁平化时已写入）；兜底无信息则不渲染。
  if (!info) return null
  const indent = info.level * treeState.indentSize
  const expanded = treeState.isExpanded(key)
  return (
    <span
      className="dg-tree-indent"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        // 缩进：level × indentSize px（对齐 antd BodyRow paddingLeft）。
        paddingLeft: `${indent}px`,
        flexShrink: 0,
      }}
    >
      {info.hasChildren ? (
        <ExpandIcon
          expanded={expanded}
          onExpand={() => treeState.toggleExpand(key)}
        />
      ) : (
        // 无 children 行渲染 disabled ExpandIcon（spaced 态），对齐 antd `.ant-table-row-expand-icon-spaced`
        // （antd BodyRow 对 rowExpandable=false / 无 children 的行也渲染一个 disabled button，加 -spaced 类，
        // visibility:hidden 占位）。antd expand.ts 第 102-110 行：`&-spaced { &::before/::after { display:none;
        // content:none }, background:transparent, border:0, visibility:hidden }`。容器尺寸同展开图标
        // （17×17 + scale(0.9412)），故占位宽度与 collapsed/expanded 态一致，缩进对齐。
        // 用 disabled ExpandIcon 让 DOM 与 antd 同构（disabled button），尺寸/visibility 由
        //   .dg-expand-icon-spaced CSS 接管（table.css 第 714-720 行），与 antd spaced 态一致。
        <ExpandIcon
          expanded={false}
          disabled
          onExpand={() => treeState.toggleExpand(key)}
        />
      )}
      {/* 图标与内容之间的间隔（对齐 antd 默认间距）。 */}
      <span style={{ display: 'inline-block', width: 4, flexShrink: 0 }} aria-hidden="true" />
    </span>
  )
}

function renderExpandedContents<RecordType>({
  dataSource,
  virtualEnabled,
  virtualState,
  expandState,
  expandLayout,
  rowKey,
}: {
  dataSource: Array<RecordType>
  virtualEnabled: boolean
  virtualState: { start: number; end: number }
  expandState: EngineExpandState
  expandLayout: Map<number, { rowLine: number; expandTrackLine?: number }>
  rowKey: string | ((record: RecordType) => string | number)
}): Array<ReactNode> {
  const out: Array<ReactNode> = []
  const lo = virtualEnabled ? virtualState.start : 0
  const hi = virtualEnabled ? virtualState.end : dataSource.length
  for (let i = lo; i < hi; i += 1) {
    const record = dataSource[i]
    if (record === undefined) continue
    const key = getRowKey(record, rowKey)
    if (!expandState.isExpandable(key)) continue
    if (!expandState.isExpanded(key)) continue
    const layout = expandLayout.get(i)
    if (!layout || layout.expandTrackLine === undefined) continue
    const content = expandState.expandedRowRender(record, i, true)
    if (content === null || content === undefined) continue
    out.push(
      <div
        key={`expand-${i}-${key}`}
        className="dg-row-expanded"
        style={{
          gridColumn: '1 / -1',
          gridRow: layout.expandTrackLine,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {content}
      </div>,
    )
  }
  return out
}

/**
 * 单个数据单元格渲染（multi 路径，显式 grid 定位）。详见 docs/design-notes/layout.md + header.md。
 *
 * 封装 dg-cell div（含 gridColumn/gridRow/sticky/hover/align）+ 内部内容渲染（含
 * components.body.cell + 树形缩进）。multi 路径的每个数据单元格都用此组件渲染，
 * 便于 renderBodyCells 按行/列遍历时复用。
 */
function BodyCell<RecordType>({
  column,
  colIdx,
  record,
  index,
  merge,
  rowSpanTracks,
  rowLine,
  info,
  isHovered,
  isSortedColumn,
  treeEnabled,
  treeState,
  treeFirstDataColumnIdx,
  rowKey,
  components,
  onHoverEnter,
  onHoverLeave,
  semanticBody,
  // onRow / rowClassName / rowHoverable 透传到单元格（grid 无 tr，行级 props 分发到该行所有单元格）。
  onRow,
  rowClassName,
  rowHoverable = true,
  // 行选中态判定 → 加 dg-row-selected 类（详见 docs/design-notes/selection.md）。
  isRowSelected,
  // 首列 cell 写 data-known-size（实测闭环，详见 docs/design-notes/virtualization.md）。
  effectiveRowHeight,
}: {
  column: EngineLeafColumn<RecordType>
  colIdx: number
  record: RecordType
  index: number
  merge: CellMergeInfo | undefined
  rowSpanTracks: number
  rowLine: number
  info: LeafStickyInfo | undefined
  isHovered: boolean
  isSortedColumn: boolean
  treeEnabled: boolean
  treeState: EngineTreeState | undefined
  treeFirstDataColumnIdx: number
  rowKey: string | ((record: RecordType) => string | number)
  components: import('./types').EngineTableProps['components']
  onHoverEnter: () => void
  onHoverLeave: () => void
  /** 语义化 body 部位（cell/row/wrapper 的 className 与 style）。 */
  semanticBody?: import('./types').EngineSemantic['body']
  /** onRow 行级 props 注入。 */
  onRow?: (record: any, index: number) => import('react').HTMLAttributes<HTMLElement> | undefined
  /** rowClassName 行级 class。 */
  rowClassName?: string | ((record: any, index: number) => string)
  /** rowHoverable 行 hover 开关，默认 true。 */
  rowHoverable?: boolean
  /** 行选中态判定回调。未提供时不加 dg-row-selected 类。 */
  isRowSelected?: (record: RecordType) => boolean
  /** 取本行最终/实测高（首列写 data-known-size，实测闭环）。 */
  effectiveRowHeight?: (index: number) => number
}) {
  const colSpan = merge?.colSpan ?? 1
  const text = getValueByDataIndex(record, column.dataIndex)
  const rendered: ReactNode = column.render
    ? column.render(text, record, index)
    : text
  // ellipsis 列默认 title 悬浮提示（对齐 antd 默认行为）。详见 docs/design-notes/ellipsis.md。
  //   - 仅 ellipsis 列加 title（非 ellipsis 列不加，避免多余 tooltip）。
  //   - 取原始 dataIndex 值文本化（string/number）——对齐 antd 默认 title 来源（cellValue 文本化）。
  //   - 自定义 render 返回 JSX 时 antd 默认行为不显示 title（用户应自行 Tooltip）：
  //     这里用 text（dataIndex 原值）文本化，render 列仍能显示原值 title（比 antd 略宽松但不破坏
  //     Name render `<a>{text}</a>` 这种文本包裹的场景——hover Name 仍提示完整 name，符合直觉）。
  //   - text 非 string/number（如对象/数组）→ 不设 title。
  //   - 与 ellipsis={ showTitle: false } 兼容：showTitle:false 时**不加** native title，
  //     让 render 内 antd Tooltip 接管 hover 提示（antd ellipsis-custom-tooltip demo 用法）。
  const ellipsisTitle =
    column.ellipsis === true && column.showTitle !== false
      ? typeof text === 'string'
        ? text
        : typeof text === 'number'
          ? String(text)
          : undefined
      : undefined
  // 调用 onCell 取完整返回值（透传给 components.body.cell）。colSpan/rowSpan 已由 cellMerge 消费；
  // 这里取完整返回值透传。无 components.body.cell 时 onCellProps 不被使用。
  // 注：onCell 在此与 cellMerge 内各调用一次（共两次）——antd demo 的 onCell 是纯函数，安全。
  let onCellProps: Record<string, any> | undefined
  if (column.onCell && components?.body?.cell) {
    try {
      onCellProps = column.onCell(record, index)
    } catch {
      onCellProps = undefined
    }
  }
  // onRow 返回值（行级 props 注入）。
  let onRowProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (onRow) {
    try {
      onRowProps = onRow(record, index)
    } catch {
      onRowProps = undefined
    }
  }
  // rowClassName（行级 class）：string 直接用；函数按行求值。
  const rowClassNameStr =
    rowClassName === undefined
      ? undefined
      : typeof rowClassName === 'string'
        ? rowClassName
        : (() => {
            try {
              return rowClassName(record, index)
            } catch {
              return undefined
            }
          })()
  // rowHoverable=false 时不加 dg-row-hover（关闭内置 hover 视觉）。
  const hoverClass =
    rowHoverable === false ? undefined : isHovered ? 'dg-row-hover' : undefined
  // 行选中态 → 加 dg-row-selected 类（CSS 消费 antd token，详见 docs/design-notes/selection.md）。
  // 镜像 flat 路径 ColumnCells 的算式，保证多级表头路径与 flat 路径行为一致。
  const selectedClass =
    isRowSelected && isRowSelected(record) ? 'dg-row-selected' : undefined
  // 合并 cell 级 + 行级 className（column.className + rowClassName + onRow.className）。
  const mergedBodyExtraClass = [
    column.className,
    rowClassNameStr,
    onRowProps?.className,
  ]
    .filter(Boolean)
    .join(' ') || undefined
  const mergedBodyExtraStyle: CSSProperties = {
    ...(column.style ?? null),
    ...(onRowProps?.style ?? null),
  }
  // 提取 onRow 事件 props（除 className/style）。
  const bodyEventProps: Record<string, unknown> = {}
  if (onRowProps) {
    for (const k of Object.keys(onRowProps)) {
      if (k === 'className' || k === 'style') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bodyEventProps[k] = (onRowProps as any)[k]
    }
  }
  return (
    <div
      key={`b-${colIdx}-${getRowKey(record, rowKey) ?? index}`}
      className={[
        'dg-cell',
        'dg-cell-body',
        column.rowScope === 'row' ? 'dg-cell-rowscope' : undefined,
        // rowSpan>1 的合并格标记，CSS 据此在有界行高模型下排除 min/max-height
        //   （合并格需跨多 track，被 max-height 截断会破坏 rowSpan 对齐——见 docs/design-notes/row-height.md）。
        rowSpanTracks > 1 ? 'dg-cell-rowspan' : undefined,
        fixedClass(column.fixed),
        shadowClass(info),
        column.hidden ? 'dg-cell-hidden' : undefined,
        // ellipsis 列加 dg-cell-ellipsis 类（.dg-cell-inner 应用 ellipsis CSS）。
        //   showTitle:false 仍加类（CSS 省略号照常），只是不加 native title。
        column.ellipsis === true ? 'dg-cell-ellipsis' : undefined,
        isSortedColumn ? 'dg-column-sort' : undefined,
        // rowHoverable=false 时关闭内置 hover 视觉。
        hoverClass,
        // 行选中态 → dg-row-selected 类。
        selectedClass,
        // 语义化 body.row 部位 className（行级 class 透传到该行所有单元格）。
        semanticBody?.className?.row,
        // 语义化 body.cell 部位 className（单元格级）。
        semanticBody?.className?.cell,
        // column.className + rowClassName + onRow.className 合并。
        mergedBodyExtraClass,
      ]
        .filter(Boolean)
        .join(' ')}
      data-align={column.align ?? undefined}
      data-row-index={index}
      // 实测闭环：写本行实测/最终高（effectiveRowHeight），避免 useRowMeasurements 每次报变化→死循环重渲染。
      // 仅在该行首个可见格（colIdx===0）写，减少冗余 attr。
      // 有界模式下 effectiveRowHeight 走 sizeOf 实测（clamp [min,max]）；固定模式下 = rowHeight 约定值。
      {...(colIdx === 0 && effectiveRowHeight ? { 'data-known-size': effectiveRowHeight(index) } : null)}
      // 表体格也标 data-column-key（与表头格对齐）。用于选择列（key='__dg_selection__'）专用样式定位
      //   ——antd selection.ts:49-61 给选择列单元格单独设 paddingInlineStart/End = paddingXS(4px)
      //   （区别于普通列的 cellPaddingInline），CSS 需精确命中。详见 docs/design-notes/selection.md。
      data-column-key={column.key}
      // aria-colspan/rowspan：合并的数据格补 aria 属性（对齐 antd 真实 td 的 colSpan/rowSpan 属性——
      //   antd td 直接渲染 HTML colspan/rowspan，屏幕阅读器据此合并播报）。
      //   仅 span>=2 时设（span=1 是默认值，不设避免噪声）。rowSpanTracks 含展开 track 偏移，
      //   与视觉跨行一致；aria-rowspan 用视觉值。
      {...(colSpan >= 2 ? { 'aria-colspan': colSpan } : null)}
      {...(rowSpanTracks >= 2 ? { 'aria-rowspan': rowSpanTracks } : null)}
      style={{
        gridColumn:
          colSpan > 1 ? `${colIdx + 1} / span ${colSpan}` : `${colIdx + 1}`,
        gridRow:
          rowSpanTracks > 1
            ? `${rowLine} / span ${rowSpanTracks}`
            : `${rowLine}`,
        ...(column.align ? { textAlign: column.align } : null),
        ...stickyCellStyle(info),
        // 语义化 body.row 部位 style（行级 style 透传到该行所有单元格）。
        ...(semanticBody?.style?.row ?? null),
        // 语义化 body.cell 部位 style（单元格级；后于 row 合并，覆盖 row 同名字段）。
        ...(semanticBody?.style?.cell ?? null),
        // column.style + onRow.style 合并。
        ...mergedBodyExtraStyle,
      }}
      onMouseEnter={
        rowHoverable === false
          ? (bodyEventProps.onMouseEnter as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
          : (e: React.MouseEvent<HTMLElement>) => {
              onHoverEnter()
              ;(bodyEventProps.onMouseEnter as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
            }
      }
      onMouseLeave={
        rowHoverable === false
          ? (bodyEventProps.onMouseLeave as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
          : (e: React.MouseEvent<HTMLElement>) => {
              onHoverLeave()
              ;(bodyEventProps.onMouseLeave as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
            }
      }
      // 其余 onRow 事件 props 透传（onMouseEnter/Leave 已单独合并，跳过）。
      {...omitKey(omitKey(bodyEventProps, 'onMouseEnter'), 'onMouseLeave')}
    >
      <div
        className="dg-cell-inner"
        // ellipsis 列默认 title 提示（hover 显示完整文本；非 ellipsis 列无 title）。
        //   showTitle:false 时 ellipsisTitle 已为 undefined（不加 native title，让 antd Tooltip 接管）。
        title={ellipsisTitle}
      >
        {treeEnabled && treeState && colIdx === treeFirstDataColumnIdx
          ? renderTreeIndent({ record, rowKey, treeState })
          : null}
        {renderCellContent({
          components,
          column,
          record,
          index,
          rendered,
          onCellProps,
        })}
      </div>
    </div>
  )
}

/**
 * 数据区单元格批量渲染（multi 路径）。详见文件头 components 机制说明 + docs/design-notes/layout.md。
 *
 * - 当 `components.body.row` 提供时：按**行**优先遍历，每行用 body.row 组件包裹该行所有
 *   BodyCell（body.row 不产生 grid DOM——典型 EditableRow 用 antd Form + Context.Provider，
 *   Provider 不渲染真实 DOM 节点，BodyCell 仍是 grid 直接子元素，grid 显式定位保证布局正确）。
 *   透传给 body.row 的 props：`{ index, children, record, rowKey }`（对齐 antd body.row 签名
 *   `{ index, ...props }`，data-grid 额外提供 record/rowKey 便于行级逻辑）。
 * - 否则：按**列**优先遍历（单元格 DOM 列连续，性能略优）。
 *
 * 两种遍历顺序在 grid 显式定位下视觉等价（gridColumn/gridRow 决定位置，与 DOM 顺序无关）。
 */
function renderBodyCells<RecordType>({
  leafColumns,
  dataSource,
  virtualEnabled,
  virtualState,
  cellMergePlan,
  expandEnabled,
  expandState,
  rowKey,
  hoveredRowIndex,
  setHoveredRowIndex,
  rowLineBase,
  leafSticky,
  treeEnabled,
  treeState,
  treeFirstDataColumnIdx,
  components,
  semanticBody,
  // onRow / rowClassName / rowHoverable 透传到表体单元格。
  onRow,
  rowClassName,
  rowHoverable = true,
  // 行选中态判定 → 加 dg-row-selected 类（详见 docs/design-notes/selection.md）。
  isRowSelected,
  // 首列 cell 写 data-known-size（实测闭环，详见 docs/design-notes/virtualization.md）。
  effectiveRowHeight,
}: {
  leafColumns: Array<EngineLeafColumn<RecordType>>
  dataSource: Array<RecordType>
  virtualEnabled: boolean
  virtualState: { start: number; end: number }
  cellMergePlan: CellMergePlan | null
  expandEnabled: boolean
  expandState: EngineExpandState | undefined
  rowKey: string | ((record: RecordType) => string | number)
  hoveredRowIndex: number | null
  setHoveredRowIndex: (index: number | null) => void
  rowLineBase: (index: number) => number
  leafSticky: Array<LeafStickyInfo | undefined>
  treeEnabled: boolean
  treeState: EngineTreeState | undefined
  treeFirstDataColumnIdx: number
  components: import('./types').EngineTableProps['components']
  /** 语义化 body 部位（cell/row/wrapper）。 */
  semanticBody?: import('./types').EngineSemantic['body']
  /** onRow 行级 props 注入。 */
  onRow?: (record: any, index: number) => import('react').HTMLAttributes<HTMLElement> | undefined
  /** rowClassName 行级 class。 */
  rowClassName?: string | ((record: any, index: number) => string)
  /** rowHoverable 行 hover 开关，默认 true。 */
  rowHoverable?: boolean
  /** 行选中态判定回调。 */
  isRowSelected?: (record: RecordType) => boolean
  /** 取本行最终/实测高（首列写 data-known-size，实测闭环）。 */
  effectiveRowHeight?: (index: number) => number
}): Array<ReactNode> {
  // 按行预计算 onRow 返回值 + rowClassName（同行的每个单元格共享）。
  //   预计算避免在 BodyCell 内重复调用（onRow 是用户函数，重复调用既浪费也可能有副作用）。
  const lo = virtualEnabled ? virtualState.start : 0
  const hi = virtualEnabled ? virtualState.end : dataSource.length
  const BodyRow = components?.body?.row
  const out: Array<ReactNode> = []

  // 计算某 (colIdx, index) 的合并 span 信息（含展开 track 偏移）。
  const computeMerge = (colIdx: number, index: number) => {
    const merge: CellMergeInfo | undefined = cellMergePlan?.[colIdx]?.[index]
    if (merge?.hidden) return null // 被覆盖格跳过
    let rowSpanTracks = merge?.rowSpan ?? 1
    if (rowSpanTracks > 1 && expandEnabled && expandState) {
      let extraTracks = 0
      for (let r = index; r < index + rowSpanTracks && r < dataSource.length; r += 1) {
        const rec = dataSource[r]
        if (rec === undefined) continue
        if (expandState.isExpandable(getRowKey(rec, rowKey))) extraTracks += 1
      }
      rowSpanTracks += extraTracks
    }
    return { merge, rowSpanTracks }
  }

  // 对齐 antd 6.4.4 / rc-table 7.51 的 column-aware hover：合并格（rowSpan>1）在
  //   其跨度内任一行被 hover 时，该合并格本身也加 dg-row-hover 高亮（视觉占跨度行空间就高亮）。
  //   antd 实现：rc-table Cell/index.js:92 useHoverState(index, mergedRowSpan) +
  //   useHoverState.js:4-7 inHoverRange(cellStartRow, cellRowSpan, hoverStart, hoverEnd) 用区间相交判定
  //   （onMouseEnter 调 onHover(index, index+rowSpan-1)，单行 hover 时 hoverStart===hoverEnd）。
  //   data-grid 的 hoveredRowIndex 等价于 hoverStart===hoverEnd===该行 index，故区间相交退化为：
  //   hoveredRowIndex 落在 [startRow, startRow+logicalRowSpan-1] 即高亮。
  //   ★ rowSpan=1（普通格，含 flat 路径全部 cell）退化为 hoveredRowIndex===startRow。
  //     logicalRowSpan 取 merge.rowSpan（不含展开 track 偏移），
  //     因 hoveredRowIndex 是逻辑行 index（与 antd 行号同语义）。
  const isRowSpanHovered = (startRow: number, logicalRowSpan: number) =>
    hoveredRowIndex !== null &&
    hoveredRowIndex >= startRow &&
    hoveredRowIndex <= startRow + logicalRowSpan - 1

  if (BodyRow) {
    // 行优先遍历：每行用 body.row 包裹。
    for (let index = lo; index < hi; index += 1) {
      const record = dataSource[index]
      if (record === undefined) continue
      const rowLine = rowLineBase(index)
      const rowCells: Array<ReactNode> = []
      for (let colIdx = 0; colIdx < leafColumns.length; colIdx += 1) {
        const column = leafColumns[colIdx]
        const m = computeMerge(colIdx, index)
        if (m === null) continue
        const isSortedColumn =
          !!column.sorter && column.sortOrder !== null && column.sortOrder !== undefined
        // rowSpan-aware hover：合并格按区间相交判定（见 isRowSpanHovered 注释）。
        //   rowSpan=1 退化为 hoveredRowIndex===index。
        const isHovered = isRowSpanHovered(index, m.merge?.rowSpan ?? 1)
        rowCells.push(
          <BodyCell<RecordType>
            key={`b-${colIdx}-${getRowKey(record, rowKey) ?? index}`}
            column={column}
            colIdx={colIdx}
            record={record}
            index={index}
            merge={m.merge}
            rowSpanTracks={m.rowSpanTracks}
            rowLine={rowLine}
            info={leafSticky[colIdx]}
            isHovered={isHovered}
            isSortedColumn={isSortedColumn}
            treeEnabled={treeEnabled}
            treeState={treeState}
            treeFirstDataColumnIdx={treeFirstDataColumnIdx}
            rowKey={rowKey}
            components={components}
            semanticBody={semanticBody}
            onHoverEnter={() => setHoveredRowIndex(index)}
            onHoverLeave={() => setHoveredRowIndex(null)}
            // onRow / rowClassName / rowHoverable 透传。
            onRow={onRow}
            rowClassName={rowClassName}
            rowHoverable={rowHoverable}
            // 行选中态判定 → 加 dg-row-selected 类。
            isRowSelected={isRowSelected}
            // 首列写 data-known-size（实测闭环）。
            effectiveRowHeight={effectiveRowHeight}
          />,
        )
      }
      // 用 body.row 组件包裹该行所有单元格。
      // body.row 组件应返回**不产生 grid DOM**的结构（如 antd Form + Context.Provider，
      // Provider 不渲染真实 DOM；或直接返回 children）。这样 BodyCell 仍是 grid 直接子元素，
      // grid 显式定位保证布局正确。
      // 透传 props：对齐 antd body.row 签名 { index, ...props } + data-grid 扩展 record/rowKey。
      out.push(
        <BodyRow
          key={`row-${getRowKey(record, rowKey) ?? index}`}
          index={index}
          record={record}
          rowKey={getRowKey(record, rowKey)}
        >
          {rowCells}
        </BodyRow>,
      )
    }
    return out
  }

  // 列优先遍历（无 body.row 时；单元格 DOM 列连续，性能略优）。
  for (let colIdx = 0; colIdx < leafColumns.length; colIdx += 1) {
    const column = leafColumns[colIdx]
    const isSortedColumn =
      !!column.sorter && column.sortOrder !== null && column.sortOrder !== undefined
    for (let index = lo; index < hi; index += 1) {
      const record = dataSource[index]
      if (record === undefined) continue
      const m = computeMerge(colIdx, index)
      if (m === null) continue
      // rowSpan-aware hover：合并格按区间相交判定（见 isRowSpanHovered 注释）。
      //   rowSpan=1 退化为 hoveredRowIndex===index。
      const isHovered = isRowSpanHovered(index, m.merge?.rowSpan ?? 1)
      out.push(
        <BodyCell<RecordType>
          key={`b-${colIdx}-${getRowKey(record, rowKey) ?? index}`}
          column={column}
          colIdx={colIdx}
          record={record}
          index={index}
          merge={m.merge}
          rowSpanTracks={m.rowSpanTracks}
          rowLine={rowLineBase(index)}
          info={leafSticky[colIdx]}
          isHovered={isHovered}
          isSortedColumn={isSortedColumn}
          treeEnabled={treeEnabled}
          treeState={treeState}
          treeFirstDataColumnIdx={treeFirstDataColumnIdx}
          rowKey={rowKey}
          components={components}
          semanticBody={semanticBody}
          onHoverEnter={() => setHoveredRowIndex(index)}
          onHoverLeave={() => setHoveredRowIndex(null)}
          // onRow / rowClassName / rowHoverable 透传。
          onRow={onRow}
          rowClassName={rowClassName}
          rowHoverable={rowHoverable}
          // 行选中态判定 → 加 dg-row-selected 类。
          isRowSelected={isRowSelected}
          // 首列写 data-known-size（实测闭环）。
          effectiveRowHeight={effectiveRowHeight}
        />,
      )
    }
  }
  return out
}

/** 多级表头路径的表头格：显式 grid-column / grid-row。详见 docs/design-notes/header.md + fixed-column.md。
 *
 * 对齐与占位：
 * - 格子始终 stretch 占满跨列 grid-area（不设 justifySelf），使 .dg-cell-header-group 的
 *   背景/底线/hover 覆盖整个 colspan 区域（与 antd <th> table-cell 占满 colspan 一致）。
 * - 文字/内容居中仅靠 flex `justify-content`（.dg-cell[data-align] / .dg-cell-header-group）
 *   + 内联 textAlign，不再用 justifySelf（后者会让 grid item 收缩到内容宽度）。
 *
 * 叶子表头格携带 `data-leaf-index`（供 ResizeObserver 测量列宽）；
 * sticky 信息（offset/side）来自 headerSticky；边缘阴影由 shadowClass 加。 */
function HeaderCell<RecordType>({
  cell,
  sticky,
  headerStickyTop,
  stickyHeaderOffset,
  headerStickyTopOffset,
  resizeEnabled,
  onResizerPointerDown,
  resizingKey,
  onSorterClick,
  onFilterApply,
  semanticHeader,
  // onHeaderRow / getPopupContainer / headerColumns。
  onHeaderRow,
  getPopupContainer,
  headerColumns,
  // Table 级 locale（透传到本表头格内的 FilterDropdown）。
  filterLocale,
}: {
  cell: EngineHeaderCell<RecordType>
  sticky?: { side: FixedSide; offset: number; isEdge: boolean }
  /**
   * 表头纵向 sticky（虚拟 + 非虚拟 scroll.y 共用）。详见 docs/design-notes/virtualization.md + sticky.md。
   *
   * `true` 时表头格额外 `position: sticky; top: 0`（相对滚动容器顶部固定，使表头不随纵向
   * 滚动消失）。z-index 提高到 4，高于表体（2）与表头横向固定（3）。
   *
   * 触发场景：
   *   - 虚拟滚动（virtual=true && scroll.y===true）：`.dg-virtual-scroll` 承载纵向滚动。
   *   - 固定表头（非 virtual && scroll.y===true）：`.dg-scroll` 承载纵向滚动（CSS 自动适应高度）。
   *
   * 与横向 sticky 共存（corner cell）：单个元素可同时 sticky left + top（浏览器原生支持；
   * antd rc-table corner cell 同款实现）。双 sticky 同时存在时 zIndex 取最高（5）> 仅纵向（4）>
   * 仅横向（3）。
   *
   * sticky prop 启用时本字段恒为 false（页面级与容器内互斥）；改由 `stickyHeaderOffset`
   * 驱动表头相对 viewport 固定（top: offsetHeader）。
   */
  headerStickyTop?: boolean
  /**
   * 表头页面级 sticky 偏移（px）。仅 `sticky` prop 启用时传入（否则 undefined）。
   *
   * `undefined`：不启用页面级 sticky（走容器内或默认无固定）。
   * `number`（含 0）：表头格 inline style 加 `position: sticky; top: <offset>px; zIndex: 4`
   * （或 corner 双 sticky 时 5），相对**页面 viewport** 固定（grid 不包 overflow 容器，无 overflow
   * 祖先拦截 sticky 上下文）。页面纵向滚动时表头钉在视口顶部 `<offset>px` 处。
   *
   * 与 `headerStickyTop` 互斥（同时启用时 sticky 优先，headerStickyTop 恒 false）。
   * 与横向 sticky 共存（corner cell 双 sticky）。
   */
  stickyHeaderOffset?: number
  /**
   * 表头纵向 sticky 的**逐行累计偏移**（px）。
   *
   * 多级表头（maxDepth>1）启用 `headerStickyTop`/`stickyHeaderOffset` 时，各表头行需**分层** sticky：
   *   - grid-row-start=1 的格 → 偏移 0
   *   - grid-row-start=2 的格 → 偏移 h1（row1 高度）
   *   - grid-row-start=N 的格 → 偏移 Σ h[0..N-2]
   * 由 `useHeaderRowHeights` 运行时测量，按 cell.gridRowStart 索引取值。未传 / 0 时退回原行为。
   * 单行表头（maxDepth=1）传 0。与 `stickyHeaderOffset`（页面级偏移）叠加：
   * sticky 多行表头同样逐行分层（top = stickyHeaderOffset + headerStickyTopOffset）。
   */
  headerStickyTopOffset?: number
  /** 是否启用列宽拖拽（仅在叶子表头格渲染 resizer）。 */
  resizeEnabled?: boolean
  /** resizer pointerdown 回调（参数为列 key）。 */
  onResizerPointerDown?: (key: string) => (event: React.PointerEvent<HTMLDivElement>) => void
  /** 当前正在拖拽的列 key（视觉反馈）。 */
  resizingKey?: string | null
  /** 排序点击回调（参数为列 key）。仅可排序叶子表头格响应。 */
  onSorterClick?: (columnKey: string) => void
  /** 筛选应用回调（参数：列 key + 新筛选值数组）。仅可筛选叶子表头格触发。 */
  onFilterApply?: (filterKey: string, nextFilteredValue: Array<string | number>) => void
  /** 语义化 header 部位（cell/row/wrapper 的 className 与 style）。 */
  semanticHeader?: import('./types').EngineSemantic['header']
  /**
   * onHeaderRow 行级 props 注入（来自 TableProps.onHeaderRow）。
   * grid 无独立 `<tr>`，引擎把 onHeaderRow 返回值透传到该表头行**所有表头格**（事件 + class + style）。
   * 未提供（undefined）时不注入。
   */
  onHeaderRow?: (
    columns: Array<unknown>,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * getPopupContainer（来自 TableProps.getPopupContainer）。
   * 作为该表头格内 FilterDropdown 的默认挂载容器（列级 filterDropdownProps.getPopupContainer 优先）。
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement
  /**
   * onHeaderRow(columns, index) 的 columns 参数（顶层列 raw 数组）。
   * 由 GridTableInner 计算后传入（多级表头简化为顶层列）。
   */
  headerColumns?: Array<unknown>
  /** Table 级 locale（透传到本表头格内的 FilterDropdown）。 */
  filterLocale?: import('./types').EngineTableProps['filterLocale']
}) {
  // onHeaderCell 返回值（表头格 props 注入）。
  //   仅叶子表头格消费（cell.onHeaderCell 仅叶子格有值；分组格恒 undefined）。返回值整体合并到表头格 div
  //   的 props（className/style/onClick/...）。与 antd useSorter.tsx:217-219 同款合并逻辑
  //   （`column.onHeaderCell?.(col) || {}`）。
  //   try/catch 防御用户函数抛错（与 onCell 同款保护）。
  let onHeaderCellProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (cell.isLeaf && cell.onHeaderCell) {
    try {
      const raw = cell.raw as ColumnType | undefined
      onHeaderCellProps = cell.onHeaderCell(raw as unknown as ColumnType, cell.gridRowStart - 1)
    } catch {
      onHeaderCellProps = undefined
    }
  }
  // onHeaderRow 返回值（行级 props 注入）。表头行号 = cell.gridRowStart - 1（0-based）。
  //   columns 参数用 headerColumns（顶层列 raw）；单层表头 = 全部 columns。
  let onHeaderRowProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (onHeaderRow) {
    try {
      onHeaderRowProps = onHeaderRow(headerColumns ?? [], cell.gridRowStart - 1)
    } catch {
      onHeaderRowProps = undefined
    }
  }
  // 合并 cell 级 + 行级 className（cell.onHeaderCell.className + cell.className + 行 onHeaderRow.className）。
  // 顺序：基础 dg 类 → semantic.cell → cell.className（列级）→ onHeaderCell.className（单元格级）
  //   → onHeaderRow.className（行级，最后合并保证行级最优先）。
  const mergedHeaderExtraClass = [
    cell.className,
    onHeaderCellProps?.className,
    onHeaderRowProps?.className,
  ]
    .filter(Boolean)
    .join(' ') || undefined
  // 合并 cell 级 + 行级 style（后者覆盖前者同名字段）。
  const mergedHeaderExtraStyle: CSSProperties = {
    ...(cell.style ?? null),
    ...(onHeaderCellProps?.style ?? null),
    ...(onHeaderRowProps?.style ?? null),
  }
  // 提取事件 props（onHeaderCell + onHeaderRow 合并；行级优先覆盖单元格级同名字段）。
  //   仅取 on* 开头的事件 handler（排除 className/style 已单独合并；其余 onXxx 透传到 div）。
  const headerEventProps: Record<string, unknown> = {}
  for (const src of [onHeaderCellProps, onHeaderRowProps]) {
    if (!src) continue
    for (const k of Object.keys(src)) {
      if (k === 'className' || k === 'style') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      headerEventProps[k] = (src as any)[k]
    }
  }
  // 分组表头格默认居中（与 antd 多级表头一致）；叶子表头格保留列对齐。
  // 表头横向合并格（headerColSpan>1）也居中（跨多列的表头，与 antd <th colspan> 一致）。
  const headerSpan = cell.headerColSpan ?? 1
  const selfAlign: Align | undefined = cell.isLeaf
    ? headerSpan > 1
      ? 'center'
      : cell.align
    : 'center'
  // 合并 sticky 样式：横向（左/右）+ 纵向 top:0（容器内）或 top:offsetHeader（页面级）。
  // 详见 docs/design-notes/fixed-column.md + sticky.md。
  const horizontalSticky = stickyHeaderCellStyle(sticky)
  const hasHorizontalSticky = !!sticky?.side // 固定列（左/右）
  // stickyHeaderOffset（页面级，相对 viewport）优先于 headerStickyTop（容器内，top:0）。
  //   两者互斥（sticky 启用时 headerStickyTop 恒 false），这里防御性取优先级。
  // 叠加逐行偏移 headerStickyTopOffset——多级表头各表头行按 gridRowStart 分层 sticky
  //   （row1 top:0、row2 top:h1、rowN top:Σh[0..N-2]），避免多行表头全堆叠在 top:0 重叠。
  //   sticky 多行表头同样逐行分层（top = stickyHeaderOffset + headerStickyTopOffset）。
  //   单行表头 headerStickyTopOffset=0。
  const rowTopOffset = headerStickyTopOffset ?? 0
  const verticalSticky: CSSProperties = stickyHeaderOffset !== undefined
    ? { position: 'sticky', top: `${stickyHeaderOffset + rowTopOffset}px`, zIndex: 4 }
    : headerStickyTop
      ? { position: 'sticky', top: `${rowTopOffset}px`, zIndex: 4 }
      : {}
  const hasVerticalSticky = stickyHeaderOffset !== undefined || !!headerStickyTop
  // corner cell（表头 × 固定列交叉格，双 sticky）：横向+纵向同时存在时，该格需要
  //   **最高 z-index**（5），保证横向滚动时始终盖住"只纵向 sticky 的中间表头格"（z-index 4）
  //   与"只横向 sticky 的固定列表头格"（z-index 3）。
  //   修复 bug：原实现 corner cell 取纵向 z-index（4），与中间表头格（4）相同，
  //   DOM 后渲染的中间表头格横向滚动时会盖住 corner cell。
  //   z-index 层级：普通(auto) < 表体固定列(2) < 表头固定列(3) < 表头顶部(4) < corner 双 sticky(5)。
  const cornerZIndex = 5
  const mergedSticky: CSSProperties = (() => {
    const merged: CSSProperties = { ...horizontalSticky, ...verticalSticky }
    if (hasHorizontalSticky && hasVerticalSticky) {
      merged.zIndex = cornerZIndex
    }
    return merged
  })()
  // 该表头格是否可排序（仅叶子表头格；分组格无排序）。
  const sortable = cell.isLeaf && cell.sortable === true && !cell.hidden
  // 当前排序态（null/ascend/descend）；仅可排序格有意义。
  const sortOrder = sortable ? (cell.sortOrder ?? null) : null
  // 是否为当前激活排序列（order 非 null）→ 加 dg-column-sort 类（表头/表体背景变淡灰）。
  const isSorted = sortable && sortOrder !== null
  // 该表头格是否可筛选（仅叶子表头格；分组格无筛选）。
  // filterable 标志由列树派生（useFilter.isFilterable）；但防御性兜底：即便 cell.filterable 未置位，
  // 只要 cell.filterDropdown 存在 / filters 已定义（含空数组）/ onFilter 存在也视为可筛选
  // （对齐 antd `useFilter/index.tsx:38`：filters || filterDropdown || onFilter 任一即 filterable；
  //   `filters: []` 是 truthy → 画漏斗 + 空面板走 renderEmpty）。
  const filterable =
    cell.isLeaf &&
    !cell.hidden &&
    (cell.filterable === true ||
      (cell.filterDropdown !== undefined && cell.filterDropdown !== null) ||
      !!cell.filters)
  // 表头格内部是否需要"右侧操作区"（sorter caret / filter 漏斗）。
  // sortable 或 filterable 任一为 true → 用 dg-column-sorters flex 容器（title + 右侧图标）。
  const hasActions = sortable || filterable
  // 表头 ellipsis（仅叶子表头格；对齐 antd：长 title 省略 + hover 显示完整标题）。详见 docs/design-notes/ellipsis.md。
  //   - cell.ellipsis=true 且无右侧操作区（非 sortable/filterable）→ 单 .dg-cell-inner 容器，
  //     该容器加 ellipsis 类 + title。
  //   - 有右侧操作区（sortable/filterable）→ 用 .dg-column-sorters 容器（title 在 .dg-column-title
  //     子元素里）；ellipsis 作用于 .dg-column-title（CSS 选择器见 table.css）。title 仍文本化加到
  //     .dg-column-title 上（hover 标题文字提示完整文案）。
  //   注：分组表头格（cell.isLeaf=false）不消费 ellipsis（columnTree 已置 undefined）。
  //   showTitle:false 时不加 native title（让 render/外部 Tooltip 接管）——与表体同款门。
  const headerEllipsis = cell.isLeaf && cell.ellipsis === true
  const headerTitle =
    headerEllipsis && cell.showTitle !== false ? toEllipsisTitle(cell.title) : undefined
  return (
    <div
      className={[
        'dg-cell',
        'dg-cell-header',
        cell.isLeaf ? undefined : 'dg-cell-header-group',
        fixedClass(cell.fixed),
        shadowClass(sticky),
        // 隐藏叶子列表头格加 dg-cell-hidden（详见 docs/design-notes/hidden-column.md）。
        cell.hidden ? 'dg-cell-hidden' : undefined,
        // 叶子表头格 ellipsis 加 dg-cell-ellipsis（作用于 .dg-cell-inner / .dg-column-title）。
        headerEllipsis ? 'dg-cell-ellipsis' : undefined,
        // 表头纵向 sticky：补不透明背景（防止表体透过）+ 配合 inline position/top/zIndex。
        // stickyHeaderOffset（页面级）同样需要不透明背景（grid 不包容器，表头悬浮于表体之上）。
        (headerStickyTop || stickyHeaderOffset !== undefined) ? 'dg-cell-header-vsticky' : undefined,
        // 可排序列表头格加 dg-column-has-sorters（cursor:pointer + hover 背景）。
        sortable ? 'dg-column-has-sorters' : undefined,
        // 可筛选列表头格加 dg-column-has-filter（hover 背景 + 漏斗区域视觉提示）。
        filterable ? 'dg-column-has-filter' : undefined,
        // 当前排序列表头格加 dg-column-sort（淡灰背景，对齐 antd tableHeaderSortBg）。
        isSorted ? 'dg-column-sort' : undefined,
        // 语义化 header.cell 部位 className（合并）。
        semanticHeader?.className?.cell,
        // 语义化 header.row 部位 className（行级 class 透传到该行所有表头格，
        //   与 body.row 对称——grid 无 tr，row class 分发到该行所有表头格）。
        semanticHeader?.className?.row,
        // cell.className（列级）+ onHeaderCell.className（格级）
        //   + onHeaderRow.className（行级）合并（顺序见 mergedHeaderExtraClass 注释）。
        mergedHeaderExtraClass,
      ]
        .filter(Boolean)
        .join(' ')}
      // aria-sort：对齐 antd useSorter.tsx:246-248——仅当该列表头格可排序
      //   且 sortOrder 非 null 时设 aria-sort（ascending/descending）；未排序时不设（与 antd
      //   一致——antd 也是 sortOrder 真值才设）。屏幕阅读器据此播报当前列排序方向。
      aria-sort={
        sortable && sortOrder === 'ascend'
          ? 'ascending'
          : sortable && sortOrder === 'descend'
            ? 'descending'
            : undefined
      }
      data-align={selfAlign ?? undefined}
      data-leaf={cell.isLeaf ? '1' : '0'}
      data-leaf-index={cell.isLeaf && cell.leafIndex !== undefined ? String(cell.leafIndex) : undefined}
      data-column-key={cell.isLeaf ? cell.key : undefined}
      // 表头分隔线排除标记（对齐 antd `thead th:not(:last-child)::before`）— 详见 docs/design-notes/header.md：
      //   data-leaf-last = 全局末列；data-group-last = 分组最右叶子（多级表头分组右边界）。
      //   由 columnTree.markLastLeaves 算出（见该函数注释）；CSS ::before 用 :not() 排除。
      data-leaf-last={cell.isLeaf && cell.isLastLeaf ? '' : undefined}
      data-group-last={cell.isLeaf && cell.isGroupLastLeaf ? '' : undefined}
      // 叶子表头格跨列数（>=2 时标记）。用于 CSS ::before 分割竖线排除跨列表头格
      //   （对齐 antd `thead th:not([colspan])::before`——跨列表头格无内部分割线）。
      //   headerColSpan 由 columnTree.applyHeaderColSpan 设置。
      data-header-colspan={
        cell.isLeaf && cell.headerColSpan !== undefined && cell.headerColSpan >= 2
          ? String(cell.headerColSpan)
          : undefined
      }
      data-sorter-order={isSorted ? (sortOrder ?? undefined) : undefined}
      // showSorterTooltip（非 false）→ hover 提示。简单实现为原生 title（对齐 antd 默认 locale：
      //   ascend → "Click to sort descending"，descend → "Cancel sorting"，null → "Click to sort ascending"）。
      //   完整 Tooltip + target 区分（full-header / sorter-icon）留后续视觉打磨。
      //   ellipsis 冲突处理：表头格 ellipsis 启用时，title 用于显示完整表头文案（对齐 antd：antd 用
      //   独立 Tooltip 显示排序提示、title 属性显示单元格内容，两者不冲突；data-grid 用原生 title
      //   只能取一，ellipsis 时优先 title=完整文案，排序提示让位——与 antd 视觉差异：少一个排序提示
      //   tooltip，但 ellipsis 的核心"hover 看完整文案"行为保留）。非 ellipsis 排序列保持原排序提示。
      title={
        headerEllipsis
          ? headerTitle
          : sortable && cell.showSorterTooltip !== false
            ? sortOrder === 'ascend'
              ? 'Click to sort descending'
              : sortOrder === 'descend'
                ? 'Cancel sorting'
                : 'Click to sort ascending'
            : undefined
      }
      style={{
        gridColumn: `${cell.gridColumnStart} / ${cell.gridColumnEnd}`,
        gridRow: `${cell.gridRowStart} / ${cell.gridRowEnd}`,
        ...(selfAlign ? { textAlign: selfAlign } : null),
        ...mergedSticky,
        // 语义化 header.cell 部位 style（合并覆盖同名字段）。
        ...(semanticHeader?.style?.cell ?? null),
        // 语义化 header.row 部位 style（行级 style 透传到该行所有表头格，与 body.row 对称）。
        ...(semanticHeader?.style?.row ?? null),
        // cell.style + onHeaderCell.style + onHeaderRow.style 合并
        //   （后者覆盖前者同名字段；在 semantic 之后，保证用户注入最优先）。
        ...mergedHeaderExtraStyle,
      }}
      // 可排序列表头格点击触发排序循环。
      // 注意：filter trigger（FilterDropdown）内部已 stopPropagation，点击漏斗不会触发排序。
      onClick={
        sortable && onSorterClick
          ? (e) => {
              // 避免 resizer 手柄点击 / 链接冒泡误触发排序。
              // resizer 自身有 onClick stopPropagation，这里无需额外处理；
              // 但表头格内若有 <a> 等可点击元素，仍会冒泡——antd 行为：点击表头任意位置都触发排序，
              // 这里与 antd 一致（整表头格都是排序点击区）。
              //
              // 幽灵点击防御：仅当点击事件 target 真正落在本表头格内部时才触发排序。
              //   antd Dropdown 弹出层 portaled 到 body，正常情况下点击 OK/Checkbox 不会冒泡到表头格；
              //   但 React 17+ 根委托 + 弹出层在 click 分发途中卸载的边界下，残余 click 可能落到表头格
              //   坐标处（target 仍是弹出层内的元素）。用 currentTarget.contains(target) 判定可彻底
              //   切断这种"幽灵点击"误触发排序。
              if (!e.currentTarget.contains(e.target as Node)) return
              e.stopPropagation()
              // 嵌套叶子排序修复：传 sortKey（column.key ?? dataIndex，如 `'age'`）而非 key
              //   （完整路径如 `Other.Age`）——useSorter.onSorterClick 按 sortKey 查列，传 key 会让
              //   多级表头嵌套叶子的 columns.find 失败 → 不排序。sortKey 由 flattenHeaderCells 从
              //   node.raw 解析填入；顶层叶子 sortKey 与 key 相等。
              onSorterClick((cell.sortKey ?? cell.key) as string)
              // 合并后的 onClick（onHeaderCell + onHeaderRow）在排序之后触发
              //   （与 antd 表头 onClick 行为一致：排序 + 用户自定义 click 都执行）。
              ;(headerEventProps.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
            }
          : (headerEventProps.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
      }
      // 其余事件 props（onDoubleClick/onMouseEnter/...）透传到表头格 div。
      //   onClick 已单独合并到排序逻辑（上方），这里跳过 onClick 避免重复触发。
      {...omitKey(headerEventProps, 'onClick')}
    >
      {hasActions ? (
        // 可排序或可筛选列用 dg-column-sorters 容器（flex space-between：title + 右侧操作区）。
        // 右侧操作区含 sorter caret + filter 漏斗，对齐 antd 同时有 sorter+filter 的列表头布局。
        // ellipsis 作用于 .dg-column-title（CSS `.dg-cell.dg-cell-ellipsis .dg-column-title`）。
        <div className="dg-column-sorters">
          <div
            className="dg-column-title"
            // ellipsis 列 hover 表头文字提示完整标题（非 ellipsis 列无 title）。
            title={headerTitle}
          >
            {cell.title ?? null}
          </div>
          <div className="dg-column-actions">
            {sortable ? (
              <SortIndicator sortOrder={sortOrder} priority={cell.sortPriority} />
            ) : null}
            {filterable && onFilterApply ? (
              <FilterDropdown
                filters={cell.filters ?? []}
                filterMultiple={cell.filterMultiple ?? true}
                filteredValue={cell.filteredValue ?? null}
                filterOnClose={cell.filterOnClose ?? true}
                onApply={(next) => onFilterApply((cell.filterKey ?? cell.key) as string, next)}
                customDropdown={cell.filterDropdown}
                customIcon={cell.filterIcon}
                dropdownProps={cell.filterDropdownProps}
                filterSearch={cell.filterSearch}
                filterMode={cell.filterMode}
                // Table 级 getPopupContainer 作为筛选下拉默认挂载容器。
                getPopupContainer={getPopupContainer}
                // Table 级 locale 透传到 FilterDropdown。
                locale={filterLocale}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className="dg-cell-inner"
          // ellipsis 列 hover 表头提示完整标题（非 ellipsis 列无 title）。
          title={headerTitle}
        >
          {cell.title ?? null}
        </div>
      )}
      {/* 列宽拖拽 resizer：仅在叶子表头格 + 非隐藏列 + resizeEnabled 时渲染。
          分组表头格（isLeaf=false）无 resizer；隐藏列（cell.hidden）0fr track 无可调宽度。 */}
      {resizeEnabled && cell.isLeaf && !cell.hidden && onResizerPointerDown ? (
        <ColumnResizer
          columnKey={cell.key}
          active={resizingKey === cell.key}
          onPointerDown={onResizerPointerDown(cell.key)}
        />
      ) : null}
    </div>
  )
}

interface ColumnCellsProps<RecordType> {
  column: EngineLeafColumn<RecordType>
  /** 叶子列索引（用于 ResizeObserver 测量标记与 sticky 取值）。 */
  colIdx: number
  /**
   * 表头分隔线排除：该列是否为全局末列（单层路径）。详见 docs/design-notes/header.md。
   * 多级路径不传（由 columnTree.markLastLeaves 算 cell.isLastLeaf → data-leaf-last）。
   * CSS 用 `:not([data-leaf-last])` 排除末列表头格的右侧分隔线。
   */
  isLastLeaf?: boolean
  dataSource: Array<RecordType>
  rowKey: string | ((record: RecordType) => string | number)
  showHeader: boolean
  hoveredRowIndex: number | null
  onHoverRow: (index: number | null) => void
  /** sticky 信息（来自 useStickyColumns.leafSticky[colIdx]）。 */
  sticky?: LeafStickyInfo
  /**
   * 表头纵向 sticky（虚拟 + 非虚拟 scroll.y 共用）。详见 HeaderCell 同名 prop。
   * flat 路径下表头格由本组件渲染，此处同样需要应用 sticky top（非 virtual 时
   * flat 路径会启用——无合并/多级 + scroll.y 仍走 flat，表头仍要固定）。
   */
  headerStickyTop?: boolean
  /**
   * 表头页面级 sticky 偏移（px）。详见 HeaderCell 同名 prop。
   * sticky prop 启用时表头格相对 viewport 固定（top: offsetHeader）。
   */
  stickyHeaderOffset?: number
  /**
   * 表头纵向 sticky 的逐行累计偏移（px）。详见 HeaderCell 同名 prop。
   * flat 路径为单行表头，恒传 0；与 HeaderCell 共用同一套 verticalSticky 逻辑。
   */
  headerStickyTopOffset?: number
  /** 是否启用列宽拖拽。 */
  resizeEnabled?: boolean
  /** resizer pointerdown 回调（参数为列 key）。 */
  onResizerPointerDown?: (key: string) => (event: React.PointerEvent<HTMLDivElement>) => void
  /** 当前正在拖拽的列 key（视觉反馈）。 */
  resizingKey?: string | null
  /** 排序点击回调（参数为列 key）。仅可排序列响应。 */
  onSorterClick?: (columnKey: string) => void
  /** 筛选应用回调（参数：列 key + 新筛选值数组）。仅可筛选列触发。 */
  onFilterApply?: (filterKey: string, nextFilteredValue: Array<string | number>) => void
  /** 自定义组件（components.body.cell 替换单元格内容；body.row 暂不在此路径消费）。 */
  components?: import('./types').EngineTableProps['components']
  /** 语义化 header 部位（cell/row/wrapper）。 */
  semanticHeader?: import('./types').EngineSemantic['header']
  /** 语义化 body 部位（cell/row/wrapper）。 */
  semanticBody?: import('./types').EngineSemantic['body']
  /**
   * onHeaderRow / onRow / rowClassName / getPopupContainer / rowHoverable。
   * 详见 EngineTableProps 同名字段 + GridTableInner 接入注释。flat 路径与 multi 路径同款接入。
   */
  onHeaderRow?: import('./types').EngineTableProps['onHeaderRow']
  onRow?: import('./types').EngineTableProps['onRow']
  rowClassName?: import('./types').EngineTableProps['rowClassName']
  getPopupContainer?: import('./types').EngineTableProps['getPopupContainer']
  rowHoverable?: boolean
  /** onHeaderRow(columns, index) 的 columns 参数（顶层列 raw 数组）。 */
  headerColumns?: Array<unknown>
  /** Table 级 locale（透传到本表头格内的 FilterDropdown）。 */
  filterLocale?: import('./types').EngineTableProps['filterLocale']
  /**
   * 行选中态判定回调。详见 docs/design-notes/selection.md。
   * 引擎在命中选中行的所有 body cell 上加 `dg-row-selected` 类（CSS 消费 antd token）。
   * 未提供（undefined）时不加类。详见 EngineTableProps.isRowSelected。
   */
  isRowSelected?: (record: RecordType) => boolean
  /**
   * 取第 index 行的最终/实测高（用于首列 cell 写 data-known-size，实测闭环）。详见 docs/design-notes/virtualization.md。
   * flat 路径与 multi 路径 BodyCell 同款。undefined 时不写 data-known-size。
   */
  effectiveRowHeight?: (index: number) => number
}

/** 单层路径（grid-auto-flow:column）的列渲染：表头格 + 每数据行格。
 *
 * 对齐：格子始终 stretch 占满列宽（不设 justifySelf），文字/内容对齐仅靠
 * .dg-cell[data-align] 的 flex justify-content + 内联 textAlign（与 antd 一致：
 * align 只控制文字，格子占满）。
 *
 * 表头格带 `data-leaf-index` 供 ResizeObserver 测量；sticky 来自 prop。
 * 表头格同样支持纵向 sticky top（与 multi 路径 HeaderCell 同款机制）。 */
function ColumnCells<RecordType>(props: ColumnCellsProps<RecordType>) {
  const {
    column,
    colIdx,
    isLastLeaf,
    dataSource,
    rowKey,
    showHeader,
    hoveredRowIndex,
    onHoverRow,
    sticky,
    headerStickyTop,
    stickyHeaderOffset,
    headerStickyTopOffset,
    resizeEnabled,
    onResizerPointerDown,
    resizingKey,
    onSorterClick,
    onFilterApply,
    components,
    semanticHeader,
    semanticBody,
    onHeaderRow,
    onRow,
    rowClassName,
    getPopupContainer,
    rowHoverable = true,
    headerColumns,
    // 行选中态判定 → 加 dg-row-selected 类。
    isRowSelected,
    // 首列 cell 写 data-known-size（实测闭环）。
    effectiveRowHeight,
    // Table 级 locale（透传到本表头格内的 FilterDropdown）。
    filterLocale,
  } = props

  // onHeaderCell 返回值（flat 路径表头格 props 注入）。
  //   column.onHeaderCell 来自叶子列；返回值整体合并到表头格 div props。与 multi 路径 HeaderCell 同款。
  let onHeaderCellProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (column.onHeaderCell) {
    try {
      onHeaderCellProps = column.onHeaderCell(column.raw as unknown as ColumnType, 0)
    } catch {
      onHeaderCellProps = undefined
    }
  }
  // onHeaderRow 返回值（行级 props）。flat 路径单层表头，index 恒 0。
  let onHeaderRowProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (onHeaderRow) {
    try {
      onHeaderRowProps = onHeaderRow(headerColumns ?? [], 0)
    } catch {
      onHeaderRowProps = undefined
    }
  }
  const mergedHeaderExtraClassFlat = [
    column.className,
    onHeaderCellProps?.className,
    onHeaderRowProps?.className,
  ]
    .filter(Boolean)
    .join(' ') || undefined
  const mergedHeaderExtraStyleFlat: CSSProperties = {
    ...(column.style ?? null),
    ...(onHeaderCellProps?.style ?? null),
    ...(onHeaderRowProps?.style ?? null),
  }
  const headerEventPropsFlat: Record<string, unknown> = {}
  for (const src of [onHeaderCellProps, onHeaderRowProps]) {
    if (!src) continue
    for (const k of Object.keys(src)) {
      if (k === 'className' || k === 'style') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      headerEventPropsFlat[k] = (src as any)[k]
    }
  }

  // 合并 sticky 样式：横向（左/右）+ 纵向（容器内 top:0 或页面级 top:offsetHeader）。与 HeaderCell 同款。
  // 详见 docs/design-notes/fixed-column.md + sticky.md。
  const horizontalSticky = stickyHeaderCellStyle(sticky)
  const hasHorizontalSticky = !!sticky?.side // 固定列（左/右）
  // stickyHeaderOffset（页面级）优先于 headerStickyTop（容器内 top:0）。
  // 叠加逐行偏移 headerStickyTopOffset（flat 单行表头恒 0）；与 HeaderCell 同款逻辑。
  const rowTopOffsetFlat = headerStickyTopOffset ?? 0
  const verticalSticky: CSSProperties = stickyHeaderOffset !== undefined
    ? { position: 'sticky', top: `${stickyHeaderOffset + rowTopOffsetFlat}px`, zIndex: 4 }
    : headerStickyTop
      ? { position: 'sticky', top: `${rowTopOffsetFlat}px`, zIndex: 4 }
      : {}
  const hasVerticalSticky = stickyHeaderOffset !== undefined || !!headerStickyTop
  // corner cell（表头 × 固定列交叉格，双 sticky）：与 HeaderCell 同款——
  //   横向+纵向同时存在时取最高 z-index（5），盖住中间表头格（4）与固定列表头格（3）。
  //   修复 corner cell 横向滚动被中间表头格盖住的 bug。
  const mergedHeaderSticky: CSSProperties = (() => {
    const merged: CSSProperties = { ...horizontalSticky, ...verticalSticky }
    if (hasHorizontalSticky && hasVerticalSticky) {
      merged.zIndex = 5
    }
    return merged
  })()

  // 该列是否可排序 + 当前排序态（与 HeaderCell 同款逻辑）。
  const sortable =
    !!column.sorter && !column.hidden &&
    (column.sorter === true || typeof column.sorter === 'function' || (typeof column.sorter === 'object' && column.sorter !== null))
  const sortOrder = sortable ? (column.sortOrder ?? null) : null
  const isSorted = sortable && sortOrder !== null
  // 该列是否可筛选（filters 已定义（含空数组）|| filterDropdown 存在 || onFilter 是函数）。
  // 对齐 antd `useFilter/index.tsx:38`：onFilter 非必需——服务端筛选列有 filters 但无 onFilter 也渲染漏斗；
  // `filters: []` 是 truthy → 画漏斗 + 空面板走 renderEmpty。
  const filterable =
    !column.hidden &&
    ((column.filterDropdown !== undefined && column.filterDropdown !== null) ||
      !!column.filters ||
      typeof column.onFilter === 'function')
  // 表头格内部是否需要"右侧操作区"（sorter / filter）。
  const hasActions = sortable || filterable
  // 表头 ellipsis（对齐 antd：长 title 省略 + hover 显示完整标题）。详见 HeaderCell 同款注释 + docs/design-notes/ellipsis.md。
  //   showTitle:false 时不加 native title（让 render/外部 Tooltip 接管）——与表体同款门。
  const headerEllipsis = column.ellipsis === true
  const headerTitle =
    headerEllipsis && column.showTitle !== false
      ? toEllipsisTitle(column.title)
      : undefined

  return (
    <>
      {showHeader ? (
        <div
          className={[
            'dg-cell',
            'dg-cell-header',
            fixedClass(column.fixed),
            shadowClass(sticky),
            column.hidden ? 'dg-cell-hidden' : undefined,
            // 表头纵向 sticky（容器内 top:0）或页面级 sticky（top:offsetHeader）：
            //   均需不透明背景（防止表体透过）+ 配合 inline position/top/zIndex。
            (headerStickyTop || stickyHeaderOffset !== undefined) ? 'dg-cell-header-vsticky' : undefined,
            sortable ? 'dg-column-has-sorters' : undefined,
            filterable ? 'dg-column-has-filter' : undefined,
            isSorted ? 'dg-column-sort' : undefined,
            // 叶子表头格 ellipsis 加 dg-cell-ellipsis（作用于 .dg-cell-inner / .dg-column-title）。
            headerEllipsis ? 'dg-cell-ellipsis' : undefined,
            // 语义化 header.cell 部位 className（合并）。
            semanticHeader?.className?.cell,
            // 语义化 header.row 部位 className（行级 class 透传到该行所有表头格，与 body.row 对称）。
            semanticHeader?.className?.row,
            // column.className + onHeaderCell.className + onHeaderRow.className。
            mergedHeaderExtraClassFlat,
          ]
            .filter(Boolean)
            .join(' ')}
          // aria-sort：对齐 antd useSorter.tsx:246-248——仅当该列表头格可排序
          //   且 sortOrder 非 null 时设 aria-sort（ascending/descending）；未排序时不设。
          aria-sort={
            sortable && sortOrder === 'ascend'
              ? 'ascending'
              : sortable && sortOrder === 'descend'
                ? 'descending'
                : undefined
          }
          data-align={column.align ?? undefined}
          data-leaf-index={String(colIdx)}
          data-column-key={column.key}
          // 表头分隔线排除（单层末列，对齐 antd `thead th:not(:last-child)::before`）— 详见 docs/design-notes/header.md。
          //   单层无分组，仅设 data-leaf-last；多级路径在 HeaderCell 设 data-group-last。
          data-leaf-last={isLastLeaf ? '' : undefined}
          data-sorter-order={isSorted ? (sortOrder ?? undefined) : undefined}
          // showSorterTooltip hover 提示（简单 title，详见 HeaderCell 同款注释）。
          //   ellipsis 冲突处理：ellipsis 启用时 title=完整表头文案（优先），排序提示让位（详见 HeaderCell）。
          title={
            headerEllipsis
              ? headerTitle
              : sortable && column.showSorterTooltip !== false
                ? sortOrder === 'ascend'
                  ? 'Click to sort descending'
                  : sortOrder === 'descend'
                    ? 'Cancel sorting'
                    : 'Click to sort ascending'
                : undefined
          }
          style={{
            ...(column.align ? { textAlign: column.align } : null),
            ...mergedHeaderSticky,
            // 语义化 header.cell 部位 style（合并覆盖同名字段）。
            ...(semanticHeader?.style?.cell ?? null),
            // 语义化 header.row 部位 style（行级 style 透传到该行所有表头格，与 body.row 对称）。
            ...(semanticHeader?.style?.row ?? null),
            // column.style + onHeaderCell.style + onHeaderRow.style。
            ...mergedHeaderExtraStyleFlat,
          }}
          onClick={
            sortable && onSorterClick
              ? (e) => {
                  // 幽灵点击防御：仅当点击 target 真正落在本表头格内部时才触发排序（同非虚拟分支）。
                  if (!e.currentTarget.contains(e.target as Node)) return
                  e.stopPropagation()
                  // 单层表头分支：column 是 EngineLeafColumn（collectLeaves 产物），无 parentPath
                  //   → column.key === sortKey（column.key ?? dataIndex）恒成立，故直接用 key 即正确。
                  //   多级表头嵌套叶子的 key≠sortKey 问题在上方 HeaderCell 分支用 cell.sortKey 解决。
                  onSorterClick(column.key)
                  // 合并后的 onClick 在排序之后触发。
                  ;(headerEventPropsFlat.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
                }
              : (headerEventPropsFlat.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
          }
          // 其余事件 props 透传（onClick 已单独合并，跳过避免重复）。
          {...omitKey(headerEventPropsFlat, 'onClick')}
        >
          {hasActions ? (
            <div className="dg-column-sorters">
              <div
                className="dg-column-title"
                // ellipsis 列 hover 表头文字提示完整标题（非 ellipsis 列无 title）。
                title={headerTitle}
              >
                {column.title ?? null}
              </div>
              <div className="dg-column-actions">
                {sortable ? (
                  <SortIndicator sortOrder={sortOrder} priority={column.sortPriority} />
                ) : null}
                {filterable && onFilterApply ? (
                  <FilterDropdown
                    filters={column.filters ?? []}
                    filterMultiple={column.filterMultiple ?? true}
                    filteredValue={column.filteredValue ?? null}
                    filterOnClose={column.filterOnClose ?? true}
                    onApply={(next) => onFilterApply(column.key, next)}
                    customDropdown={column.filterDropdown}
                    customIcon={column.filterIcon}
                    dropdownProps={column.filterDropdownProps}
                    filterSearch={column.filterSearch}
                    filterMode={column.filterMode}
                    // Table 级 getPopupContainer 作为筛选下拉默认挂载容器。
                    getPopupContainer={getPopupContainer}
                    // Table 级 locale 透传到 FilterDropdown。
                    locale={filterLocale}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div
              className="dg-cell-inner"
              // ellipsis 列 hover 表头提示完整标题（非 ellipsis 列无 title）。
              title={headerTitle}
            >
              {column.title ?? null}
            </div>
          )}
          {/* 列宽拖拽 resizer：非隐藏列 + resizeEnabled 时渲染。 */}
          {resizeEnabled && !column.hidden && onResizerPointerDown ? (
            <ColumnResizer
              columnKey={column.key}
              active={resizingKey === column.key}
              onPointerDown={onResizerPointerDown(column.key)}
            />
          ) : null}
        </div>
      ) : null}

      {dataSource.map((record, index) => {
        const text = getValueByDataIndex(record, column.dataIndex)
        const rendered: ReactNode = column.render
          ? column.render(text, record, index)
          : text
        // ellipsis 列默认 title 提示（详见 BodyCell 同款注释 + docs/design-notes/ellipsis.md）。取原始 dataIndex 值文本化。
        //   showTitle:false 时不加 native title（详见 BodyCell 同款注释）。
        const ellipsisTitle =
          column.ellipsis === true && column.showTitle !== false
            ? typeof text === 'string'
              ? text
              : typeof text === 'number'
                ? String(text)
                : undefined
            : undefined
        // 调用 onCell 取完整返回值（透传给 components.body.cell）。详见 multi 路径同款注释。
        let onCellProps: Record<string, any> | undefined
        if (column.onCell && components?.body?.cell) {
          try {
            onCellProps = column.onCell(record, index)
          } catch {
            onCellProps = undefined
          }
        }
        const isHovered = hoveredRowIndex === index
        // onRow 返回值（行级 props 注入到该单元格）。
        let onRowProps: import('react').HTMLAttributes<HTMLElement> | undefined
        if (onRow) {
          try {
            onRowProps = onRow(record, index)
          } catch {
            onRowProps = undefined
          }
        }
        // rowClassName（行级 class）：string 直接用；函数按行求值。
        const rowClassNameStr =
          rowClassName === undefined
            ? undefined
            : typeof rowClassName === 'string'
              ? rowClassName
              : (() => {
                  try {
                    return rowClassName(record, index)
                  } catch {
                    return undefined
                  }
                })()
        // rowHoverable=false 时不加 dg-row-hover（关闭内置 hover 视觉）。
        const hoverClass = rowHoverable === false ? undefined : isHovered ? 'dg-row-hover' : undefined
        // 行选中态 → 加 dg-row-selected 类（CSS 消费 --ant-table-row-selected-bg / row-selected-hover-bg）。
        const selectedClass =
          isRowSelected && isRowSelected(record) ? 'dg-row-selected' : undefined
        // 合并 cell 级 + 行级 className（column.className + rowClassName + onRow.className）。
        const mergedBodyExtraClassFlat = [
          column.className,
          rowClassNameStr,
          onRowProps?.className,
        ]
          .filter(Boolean)
          .join(' ') || undefined
        const mergedBodyExtraStyleFlat: CSSProperties = {
          ...(column.style ?? null),
          ...(onRowProps?.style ?? null),
        }
        // 提取 onRow 事件 props（除 className/style）。
        const bodyEventPropsFlat: Record<string, unknown> = {}
        if (onRowProps) {
          for (const k of Object.keys(onRowProps)) {
            if (k === 'className' || k === 'style') continue
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            bodyEventPropsFlat[k] = (onRowProps as any)[k]
          }
        }
        return (
          <div
            key={getRowKey(record, rowKey) ?? index}
            className={[
              'dg-cell',
              'dg-cell-body',
              fixedClass(column.fixed),
              shadowClass(sticky),
              column.hidden ? 'dg-cell-hidden' : undefined,
              // ellipsis 列加 dg-cell-ellipsis 类（.dg-cell-inner 应用 ellipsis CSS）。
              //   showTitle:false 仍加类（CSS 省略号照常），只是不加 native title。
              column.ellipsis === true ? 'dg-cell-ellipsis' : undefined,
              // 当前排序列的表体格加 dg-column-sort（淡灰底，对齐 antd tableBodySortBg）。
              isSorted ? 'dg-column-sort' : undefined,
              // rowHoverable=false 时关闭内置 hover 视觉。
              hoverClass,
              // 行选中态 → dg-row-selected 类。
              selectedClass,
              // 语义化 body.row 部位 className（行级 class 透传到该行所有单元格）。
              semanticBody?.className?.row,
              // 语义化 body.cell 部位 className（单元格级）。
              semanticBody?.className?.cell,
              // column.className + rowClassName + onRow.className。
              mergedBodyExtraClassFlat,
            ]
              .filter(Boolean)
              .join(' ')}
            data-align={column.align ?? undefined}
            data-row-index={index}
            // 实测闭环：写本行实测/最终高（effectiveRowHeight），仅首列（colIdx===0）写。
            //   与 multi 路径 BodyCell 同款（详见上方注释 + docs/design-notes/virtualization.md）。
            {...(colIdx === 0 && effectiveRowHeight ? { 'data-known-size': effectiveRowHeight(index) } : null)}
            // 表体格也标 data-column-key（与上方 BodyCell 多级表头路径 + 表头格一致）。
            //   选择列（key='__dg_selection__'）专用样式定位——antd selection.ts:49-61 选择列 padding
            //   = paddingXS(4px)，区别于普通列 cellPaddingInline。详见 BodyCell 同款注释 + docs/design-notes/selection.md。
            data-column-key={column.key}
            style={{
              ...(column.align ? { textAlign: column.align } : null),
              ...stickyCellStyle(sticky),
              // 语义化 body.row 部位 style（行级）。
              ...(semanticBody?.style?.row ?? null),
              // 语义化 body.cell 部位 style（单元格级；后于 row 合并）。
              ...(semanticBody?.style?.cell ?? null),
              // column.style + onRow.style 合并。
              ...mergedBodyExtraStyleFlat,
            }}
            onMouseEnter={
              rowHoverable === false
                ? (bodyEventPropsFlat.onMouseEnter as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
                : (e: React.MouseEvent<HTMLElement>) => {
                    onHoverRow(index)
                    ;(bodyEventPropsFlat.onMouseEnter as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
                  }
            }
            onMouseLeave={
              rowHoverable === false
                ? (bodyEventPropsFlat.onMouseLeave as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
                : (e: React.MouseEvent<HTMLElement>) => {
                    onHoverRow(null)
                    ;(bodyEventPropsFlat.onMouseLeave as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
                  }
            }
            // 其余 onRow 事件 props 透传（onMouseEnter/Leave 已单独合并，跳过）。
            {...omitKey(omitKey(bodyEventPropsFlat, 'onMouseEnter'), 'onMouseLeave')}
          >
            <div
              className="dg-cell-inner"
              // ellipsis 列默认 title 提示（hover 显示完整文本；非 ellipsis 列无 title）。
              title={ellipsisTitle}
            >
              {/* 若提供 components.body.cell，单元格内容用它渲染；否则直接渲染 rendered。 */}
              {renderCellContent({
                components,
                column,
                record,
                index,
                rendered,
                onCellProps,
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}

/**
 * 列宽拖拽 resizer 手柄。详见 docs/design-notes/column-width.md + `useColumnResize.ts` 文件头注释。
 *
 * 渲染在叶子表头格**右侧边缘**（绝对定位 `inset-inline-end:0`），默认透明且 pointer-events:none，
 * 表头 hover 时显形并接收事件。pointerdown 由 `useColumnResize.onPointerDown(key)` 处理
 * （setPointerCapture + 原生 move/up 监听 → 实时改 resizedWidths → 重算 grid-template-columns）。
 *
 * 仅在 `resizeEnabled === true` 且**非隐藏列**时渲染（隐藏列 0fr track 无可调宽度）。
 * 分组表头格不渲染 resizer（无对应单一叶子列）。
 */
function ColumnResizer({
  columnKey,
  active,
  onPointerDown,
}: {
  columnKey: string
  /** 是否正在拖拽该列（视觉反馈：加 dg-resizer-active 类）。 */
  active: boolean
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      className={['dg-resizer', active ? 'dg-resizer-active' : undefined]
        .filter(Boolean)
        .join(' ')}
      // pointerdown 触发拖拽（useColumnResize 内部 setPointerCapture + 注册 move/up）。
      onPointerDown={onPointerDown}
      // 阻止 click 冒泡到表头格（避免触发后续排序等 header click 交互）。
      onClick={(e) => e.stopPropagation()}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      data-column-key={columnKey}
    />
  )
}

function fixedClass(fixed: FixedSide | undefined): string | undefined {
  if (fixed === 'start') return 'dg-cell-fixed-start'
  if (fixed === 'end') return 'dg-cell-fixed-end'
  return undefined
}

/**
 * 浅拷贝对象并剔除指定 key。
 *
 * 用于 HeaderCell / BodyCell 的事件 props 合并——onClick 等已单独处理（与排序/hover 逻辑合并），
 * 剩余 on* 事件透传到 div 时需剔除已处理的 key，避免重复触发。
 */
function omitKey<T extends Record<string, unknown>>(obj: T, key: string): Record<string, unknown> {
  if (!obj) return {}
  const { [key]: _omit, ...rest } = obj
  return rest
}

/**
 * 固定列边缘阴影 class。详见 docs/design-notes/fixed-column.md。
 * - 'start' 侧且 isEdge（start 侧最右一列，与普通列交界）→ 'dg-sticky-shadow-start'
 *   （右侧画淡阴影，提示其右还有可滚动内容）。
 * - 'end' 侧且 isEdge（end 侧最左一列）→ 'dg-sticky-shadow-end'
 *   （左侧画淡阴影）。
 *
 * 参数同时兼容 LeafStickyInfo（leafSticky 项）与 headerSticky 的简化对象（{side,isEdge}）。
 */
function shadowClass(
  info: { side?: FixedSide; isEdge?: boolean } | undefined,
): string | undefined {
  if (!info || !info.side || !info.isEdge) return undefined
  return info.side === 'start' ? 'dg-sticky-shadow-start' : 'dg-sticky-shadow-end'
}

// 仅为兼容潜在的外部导入（columnTree 类型）；引擎外部应通过 Table.tsx 适配层使用。
export type { EngineColumnNode }

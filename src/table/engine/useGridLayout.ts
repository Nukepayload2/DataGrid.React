/**
 * grid 模板计算 hook — 详见 docs/features/scrolling/virtualization.md / docs/features/layout/row-height.md / docs/features/interaction/expand.md / docs/features/columns/column-width.md
 *
 * 职责：从 GridTableInner 编排层抽出的 grid 模板 useMemo 块（先移动不重写，字节级保真）。
 *
 * 计算 6 个派生值：
 *   - gridTemplateRows：表头行 + 数据行（含 paddingTop/paddingBottom 占位 track、展开 track、summary track）拼接
 *   - gridTemplateColumns：列 track（委托 computeGridTemplateColumns，本 hook 只调用不改）
 *   - gridAutoFlow：历史兼容字段，当前所有路径关闭 auto-flow（用显式 grid-column/grid-row 定位）
 *   - summaryStartLine：summary 区起始 1-based grid line（无 summary 时 0）
 *   - paddingTopLine / paddingBottomLine：FillerRow 占位 track 的 grid-row 起始线（虚拟模式专用）
 *
 * 分支矩阵（字节级对齐原 GridTable.tsx 内联块）：
 *   虚拟 × 非虚拟 × 展开 × 无展开 × 有界行高(boundedRowHeight) × 固定行高 × summary 有无 × mode flat/multi
 *
 * 铁律：拆分过程不重写布局算法；任何分支条件 / 模板字符串拼接顺序 / 边界值变化都视为回归。
 */
import { useMemo, type CSSProperties } from 'react'
import { toTrack } from './cellRenderUtils'
import { computeGridTemplateColumns } from './gridTemplateColumnsUtils'
import { getRowKey } from './recordAccess'
import { summaryRowsTrack } from './SummaryLayer'
import type {
  EngineExpandState,
  EngineLeafColumn,
  RowHeight,
} from './engineTypes'

/** virtualState 的最小依赖形状（仅 start/end；来自 useVirtualList，避免引入完整类型）。 */
export interface GridLayoutVirtualStateLike {
  start: number
  end: number
}

/** summaryParsed 的最小依赖形状（仅 count）。 */
export interface GridLayoutSummaryParsedLike {
  count: number
}

/** useGridLayout 入参。所有字段语义与原 GridTable.tsx 内联 useMemo 块的闭包变量一一对应。 */
export interface UseGridLayoutOptions<RecordType> {
  /** 渲染模式（flat/multi 均使用显式定位；保留 mode 参与依赖与分支判断）。 */
  mode: 'flat' | 'multi'
  /** 表头最大层级（columnTree 解析得到；showHeader 时用于 headerTracks 数量）。 */
  maxDepth: number
  /** 是否渲染表头。 */
  showHeader: boolean
  /** 表头行高约定（缺省 'auto'；多级表头统一使用）。 */
  headerHeight: number | string | undefined
  /** 虚拟滚动是否启用。 */
  virtualEnabled: boolean
  /** 虚拟窗口（start/end 半开区间）。 */
  virtualState: GridLayoutVirtualStateLike
  /** 有界行高模型是否启用（min/max 同设）。 */
  boundedRowHeight: boolean
  /**
   * 有界模型解析出的 minRowHeight（原 GridTable 闭包冗余依赖；本 hook body 不直接读，
   * 仅为依赖数组与原 useMemo 字节级对齐，触发同样的重算时机）。
   */
  minRowHeight: number | undefined
  /**
   * 有界模型解析出的 maxRowHeight（同 minRowHeight，原闭包冗余依赖）。
   */
  maxRowHeight: number | undefined
  /** 行级行高取值（虚拟 / 非虚拟分支共用：虚拟 = effectiveRowHeight(i)，非虚拟回退 rowHeight(record,i)）。 */
  effectiveRowHeight: (i: number) => number
  /**
   * useRowHeightSystem 的 getRowHeight callback（原闭包冗余依赖；本 hook body 不直接读，
   * 仅为依赖数组字节级对齐）。
   */
  getRowHeight: (index: number) => number
  /** 是否启用展开。 */
  expandEnabled: boolean
  /** 展开状态（提供 isExpandable / isExpanded；undefined 时无展开逻辑）。 */
  expandState?: EngineExpandState
  /** 数据源。 */
  dataSource: Array<RecordType>
  /** 行 key 取值器。 */
  rowKey: string | ((record: RecordType) => string | number)
  /** gridOptions.rowHeight 原值（非虚拟 + 非有界分支用）。 */
  rowHeight: RowHeight<RecordType> | undefined
  /** 叶子列（gridTemplateColumns 计算用）。 */
  leafColumns: ReadonlyArray<EngineLeafColumn<RecordType>>
  /** 列拖拽后的宽度覆盖（key → px）。 */
  resizedWidths: ReadonlyMap<string, number>
  /** 列宽策略（'auto' / 'fixed'；缺省按 'auto' 处理）。 */
  tableLayout: 'auto' | 'fixed' | undefined
  /** summary 解析结果（含 count）；null 表示无 summary。 */
  summaryParsed: GridLayoutSummaryParsedLike | null
  /** summary 是否启用（= !!summaryParsed）。 */
  summaryEnabled: boolean
}

/** useGridLayout 返回值 — 与原 useMemo 解构出的 6 个字段一一对应。 */
export interface UseGridLayoutResult {
  /** grid-template-rows 字符串（headerTracks + bodyTracks + summaryTracks 拼接；空时 'none'）。 */
  gridTemplateRows: string
  /** grid-template-columns 字符串（委托 computeGridTemplateColumns）。 */
  gridTemplateColumns: string
  /** grid-auto-flow 值（历史兼容字段；当前所有路径均显式定位）。 */
  gridAutoFlow: CSSProperties['gridAutoFlow']
  /** summary 区起始 1-based grid line（无 summary → 0）。 */
  summaryStartLine: number
  /** paddingTop track 起始 grid line（= headerTracks.length + 1）。 */
  paddingTopLine: number
  /** paddingBottom track 起始 grid line（= headerTracks.length + bodyTracks.length）。 */
  paddingBottomLine: number
}

/**
 * grid 模板计算 hook。
 *
 * 铁律：先移动不重写——分支条件 / 模板字符串拼接顺序 / 边界值 / 计算顺序与原 GridTable.tsx
 * 内联 useMemo 块字节级一致。任何改动视为回归（CSS Grid 布局核心）。
 */
export function useGridLayout<RecordType>(
  options: UseGridLayoutOptions<RecordType>,
): UseGridLayoutResult {
  const {
    mode,
    maxDepth,
    showHeader,
    headerHeight,
    virtualEnabled,
    virtualState,
    boundedRowHeight,
    minRowHeight,
    maxRowHeight,
    effectiveRowHeight,
    getRowHeight,
    expandEnabled,
    expandState,
    dataSource,
    rowKey,
    rowHeight,
    leafColumns,
    resizedWidths,
    tableLayout,
    summaryParsed,
    summaryEnabled,
  } = options

  return useMemo(() => {
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
        // 有界行高模型（详见 docs/features/layout/row-height.md）：
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
            if (key !== undefined && expandState.isExpandable(key)) {
              visibleTracks.push(expandState.isExpanded(key) ? '1fr' : '0fr')
            }
          }
        }
      }
      // paddingTop/paddingBottom track 用 `'auto'`，由独立的 FillerRow grid item 撑高——
      // 详见 docs/features/scrolling/virtualization.md 的「占位 track / FillerRow（spacer 解耦）」一节。
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
          if (key !== undefined && expandState.isExpandable(key)) {
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

    const gridTemplateColumns = computeGridTemplateColumns({
      leafColumns,
      resizedWidths,
      tableLayout: tableLayout ?? 'auto',
    })

    // summary 区 tracks（grid-template-rows 末尾追加，每行一条 'auto' track）。
    // summary 行高按内容自适应（'auto'），与表体行高约定无关——summary 通常是单行文本，
    // 不需要参与虚拟窗口/行高约定计算。
    const summaryTracks = summaryParsed ? summaryRowsTrack(summaryParsed.count).split(' ').filter(Boolean) : []
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
    //   详见 docs/features/scrolling/virtualization.md 的「占位 track / FillerRow（spacer 解耦）」一节。
    const paddingTopLine = headerTracks.length + 1
    const paddingBottomLine = headerTracks.length + bodyTracks.length

    // 所有路径关闭 auto-flow，统一用显式 grid-column/grid-row 定位。
    // 这让 DOM 顺序可以按 row-major 输出，避免浏览器原生文字选择按列穿透多行。
    return {
      gridTemplateRows: [...headerTracks, ...bodyTracks, ...summaryTracks].join(' ') || 'none',
      gridTemplateColumns,
      gridAutoFlow: undefined,
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
}

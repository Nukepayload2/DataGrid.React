/**
 * 分页适配 hook（从 Table.tsx 抽出，机械搬运）。
 *
 * 把 `Table.tsx` L947–1049（paginationEnabled/paginationConfig 派生 + usePagination 调用 +
 * effectivePaginationState + paginationStateRef.current 写入 + slicePage 切片 + resolvePlacement +
 * showPagination + getPaginationSize + renderPaginationNode 两个）整体搬进 hook。
 *
 * paginationDataSource 允许调用方把“分页统计/切片源”与实际渲染源分开。树形表格用顶层
 * filteredDataSource 统计 pageSize，再在 Table 层把当前页顶层行扁平化成可见行，对齐 antd。
 *
 * 关键：`paginationStateRef` 由调用方（Table.tsx）传入——它必须在 useSorter 之前声明（当前
 * Table.tsx L343），因为 useSorter/useFilter 的 onChange 包装闭包要读它。本 hook 只负责写。
 *
 * 详见 `docs/engineering-refactor-table-hooks.md` §3.2④。
 */
import type { ReactNode } from 'react'
import {
  shouldResetPagination,
  usePagination,
  slicePage,
  resolvePlacement,
} from './engine/usePagination'
import type {
  FilterValue,
  SorterResult,
  SizeType,
  TableCurrentDataSource,
  TablePaginationConfig,
  TablePaginationState,
  TableProps,
  TableSemanticClassNames,
  TableSemanticStyles,
} from './types'
import {
  getPaginationSize,
  renderPaginationNode,
} from './paginationAdapter'

export interface UsePaginationAdapterOptions<RecordType> {
  pagination: false | TablePaginationConfig | undefined
  flattenedDataSource: Array<RecordType>
  paginationDataSource?: Array<RecordType>
  paginationStateRef: React.MutableRefObject<TablePaginationState>
  onChange: TableProps<RecordType>['onChange']
  onFirstRowChange?: () => void
  getFiltersArg: () => Record<string, Array<FilterValue> | null>
  currentSorterResult: SorterResult<RecordType> | Array<SorterResult<RecordType>>
  size: SizeType | undefined
  classNamesResolved: TableSemanticClassNames | undefined
  stylesResolved: TableSemanticStyles | undefined
}

export interface UsePaginationAdapterResult<RecordType> {
  paginationEnabled: boolean
  pagedDataSource: Array<RecordType>
  effectivePaginationState: TablePaginationState
  topPaginationNode: ReactNode
  bottomPaginationNode: ReactNode
  showPagination: boolean
  /**
   * Table 级 `onChange` 的统一发射口（sort / filter 两条交互路径都走它）。
   * 对应参照 `InternalTable.js:180-205 triggerOnChange`：先按 `shouldResetPagination(extra.action)`
   * 做「复位三件套」，再打 table 级 `onChange`。详见函数体注释。
   */
  fireTableChange: (
    filters: Record<string, Array<FilterValue> | null>,
    sorter: SorterResult<RecordType> | Array<SorterResult<RecordType>>,
    extra: TableCurrentDataSource<RecordType>,
  ) => void
}

export function usePaginationAdapter<RecordType>(
  options: UsePaginationAdapterOptions<RecordType>,
): UsePaginationAdapterResult<RecordType> {
  const {
    pagination,
    flattenedDataSource,
    paginationDataSource = flattenedDataSource,
    paginationStateRef,
    onChange,
    onFirstRowChange,
    getFiltersArg,
    currentSorterResult,
    size,
    classNamesResolved,
    stylesResolved,
  } = options

  // === 分页集成 ===
  // antd 兼容默认：pagination 未传时等价 `{}`，默认 pageSize=10 + bottomEnd 分页器。
  // 仅 `pagination={false}` 明确关闭分页并全量渲染。
  const paginationEnabled = pagination !== false
  const paginationConfig = (pagination === false ? {} : (pagination ?? {})) as TablePaginationConfig

  const paginationInfo = usePagination({
    // #18a：用户的 `onShowSizeChange` 由 `renderPaginationNode` **原样透传**给 `<Pagination>`
    // （antd 同款做法：`es/table/hooks/usePagination.js:52-59` 只把 `onChange` 绑到内部处理）。
    // 这里必须把它从引擎可见的配置里摘掉——引擎的 `pageSize !== mergedPageSize` 分支
    // （src/table/engine/usePagination.ts:113-115）也会调一次，两条腿并存会退回「一次改页长
    // 用户回调跑 2 次」；且透传那条拿到的是钳制前的 `current`，语义与 antd 一致。
    pagination: { ...paginationConfig, onShowSizeChange: undefined },
    dataSourceLength: paginationDataSource.length,
    onPaginationChange: (nextCurrent, nextPageSize) => {
      onFirstRowChange?.()
      // 翻页/改 pageSize → 触发 Table onChange(action:'paginate')。
      // paginationState 用回调参数构造（antd Pagination 不会传越界 page，current 已 effective）。
      if (!onChange) return
      const total =
        typeof paginationConfig.total === 'number' && paginationConfig.total > 0
          ? paginationConfig.total
          : paginationDataSource.length
      const nextState: TablePaginationState = {
        current: nextCurrent,
        pageSize: nextPageSize,
        total,
      }
      onChange(
        nextState,
        getFiltersArg(),
        currentSorterResult,
        // currentDataSource：分页**前**的全量数据源（与 antd 一致）。
        { currentDataSource: paginationDataSource, action: 'paginate' },
      )
    },
  })

  // 同步 paginationStateRef（供 useSorter/useFilter 的 onChange 闭包注入最新分页）。
  // 分页未启用时构造"全量态"（current=1, pageSize=长度, total=长度），保证 onChange.pagination
  // 始终有意义（与 antd 未开分页时 onChange.pagination 仍含 {current,pageSize,total} 一致）。
  const effectivePaginationState: TablePaginationState = paginationEnabled
    ? paginationInfo.paginationState
    : { current: 1, pageSize: flattenedDataSource.length, total: flattenedDataSource.length }
  paginationStateRef.current = effectivePaginationState

  // 分页切片（未启用 → 全量）。
  // 传入 paginationInfo.total 用于服务端模式检测——dataSource.length < total（server/async）
  // 时不切片（对齐 antd InternalTable.tsx:547-557），避免双重分页。
  const pagedDataSource = paginationEnabled
    ? slicePage(
        paginationDataSource,
        paginationInfo.current,
        paginationInfo.pageSize,
        paginationInfo.total,
      )
    : flattenedDataSource

  // === Table 级 onChange 统一发射口（对齐参照 `triggerOnChange`，InternalTable.js:180-205）===
  // 「复位」在参照里是一个 action 上的**三件事组合**（工单坑 2），少做一件就是半个修复：
  //   ① `:186 changeEventInfo.resetPagination?.()` ⇒ 我方 `paginationInfo.resetPagination()`
  //      （写 inner current=1 ⇒ 非受控时**可见行**真的回第 1 页；受控时被 mergeProps 掩掉）。
  //   ② `:188-189 if (changeInfo.pagination?.current) changeInfo.pagination.current = 1`
  //      ⇒ 只改**回调参数**（注意参照的 `if` 条件：current 为假值时不改，这里同形）。
  //   ③ `:192-194 if (pagination) pagination.onChange?.(1, pageSize)`
  //      ⇒ 打的是**用户裸 prop**，不是 `paginationInfo.onInternalChange`——后者会顺带驱动
  //      `onPaginationChange` ⇒ 多吐一次 table 级 `onChange(action:'paginate')`（工单坑 1）。
  // 三条都在 table 级 `onChange` 存在与否**之外**（参照 `:201 onChange?.()` 在最后，前面三条
  // 不受它约束 ⇒ ①③ 必须在 `if (!onChange) return` 之前）。
  // `paginationConfig.onChange` 就是用户裸 prop（`pagination===false` 时归一为 `{}` ⇒ 天然不 fire，
  // 与参照 `if (pagination)` 同形）。
  const fireTableChange: UsePaginationAdapterResult<RecordType>['fireTableChange'] = (
    filters,
    sorter,
    extra,
  ) => {
    const reset = shouldResetPagination(extra.action)
    const base = paginationStateRef.current
    if (reset) {
      paginationInfo.resetPagination()
      paginationConfig.onChange?.(1, base.pageSize)
    }
    if (!onChange) return
    onChange(
      reset && base.current ? { ...base, current: 1 } : base,
      filters,
      sorter,
      extra,
    )
  }

  // 解析 placement → top/bottom 对齐（未启用分页 → 两侧均 null，不渲染）。
  const placement = paginationEnabled
    ? resolvePlacement(paginationConfig.placement)
    : { top: null, bottom: null }
  // antd 行为：仅当 total > 0 且分页启用时渲染分页器。
  // `hideOnSinglePage` 的判据并入这里（#18c）：rc-pagination 命中时自己 `return null`
  // （@rc-component/pagination/es/Pagination.js:222 `hideOnSinglePage && total <= pageSize`），
  // 只把开关传给内层 `<Pagination>` 的话，外层 `.dg-pagination` div 仍会留下**空壳**：全仓没有
  // 针对它的 `display:none`，命中的只有 `table.css:133-138` 那条**无条件** `margin:16px 0`
  // ⇒ 所有 `scroll.y` 形态下表尾都约 32px 量级空白（真实观感未经浏览器实测，只有单测层面证据），
  // 双 placement 时留两个空壳。判据用 effective pageSize（未传时回落引擎默认 10），与 rc 同源。
  const hideOnSinglePageActive =
    paginationConfig.hideOnSinglePage === true && paginationInfo.total <= paginationInfo.pageSize
  const showPagination =
    paginationEnabled && paginationInfo.total > 0 && !hideOnSinglePageActive
  // 分页器尺寸：pagination.size 优先；否则随 Table size（small/middle→'small'，其余 default/undefined）。
  const paginationSize = getPaginationSize(size, paginationConfig.size)
  const topPaginationNode =
    showPagination && placement.top
      ? renderPaginationNode({
          align: placement.top,
          paginationConfig,
          paginationInfo,
          paginationSize,
          classNamesResolved,
          stylesResolved,
        })
      : null
  const bottomPaginationNode =
    showPagination && placement.bottom
      ? renderPaginationNode({
          align: placement.bottom,
          paginationConfig,
          paginationInfo,
          paginationSize,
          classNamesResolved,
          stylesResolved,
        })
      : null

  return {
    paginationEnabled,
    pagedDataSource,
    effectivePaginationState,
    topPaginationNode,
    bottomPaginationNode,
    showPagination,
    fireTableChange,
  }
}

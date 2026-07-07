/**
 * 分页适配 hook（从 Table.tsx 抽出，机械搬运）。
 *
 * 把 `Table.tsx` L947–1049（paginationEnabled/paginationConfig 派生 + usePagination 调用 +
 * effectivePaginationState + paginationStateRef.current 写入 + slicePage 切片 + resolvePlacement +
 * showPagination + getPaginationSize + renderPaginationNode 两个）整体搬进 hook。
 *
 * 关键：`paginationStateRef` 由调用方（Table.tsx）传入——它必须在 useSorter 之前声明（当前
 * Table.tsx L343），因为 useSorter/useFilter 的 onChange 包装闭包要读它。本 hook 只负责写。
 *
 * 详见 `docs/engineering-refactor-table-hooks.md` §3.2④。
 */
import type { ReactNode } from 'react'
import {
  usePagination,
  slicePage,
  resolvePlacement,
} from './engine/usePagination'
import type {
  FilterValue,
  SorterResult,
  SizeType,
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
  paginationStateRef: React.MutableRefObject<TablePaginationState>
  onChange: TableProps<RecordType>['onChange']
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
}

export function usePaginationAdapter<RecordType>(
  options: UsePaginationAdapterOptions<RecordType>,
): UsePaginationAdapterResult<RecordType> {
  const {
    pagination,
    flattenedDataSource,
    paginationStateRef,
    onChange,
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
    pagination: paginationConfig,
    // 树形模式下分页基于扁平化后数据源长度（仅可见行）；非树形同 filteredDataSource。
    dataSourceLength: flattenedDataSource.length,
    onPaginationChange: (nextCurrent, nextPageSize) => {
      // 翻页/改 pageSize → 触发 Table onChange(action:'paginate')。
      // paginationState 用回调参数构造（antd Pagination 不会传越界 page，current 已 effective）。
      if (!onChange) return
      const total =
        typeof paginationConfig.total === 'number' && paginationConfig.total > 0
          ? paginationConfig.total
          : flattenedDataSource.length
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
        { currentDataSource: flattenedDataSource, action: 'paginate' },
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
  // 基于 flattenedDataSource（树形扁平化后）切片；非树形同 filteredDataSource。
  const pagedDataSource = paginationEnabled
    ? slicePage(
        flattenedDataSource,
        paginationInfo.current,
        paginationInfo.pageSize,
        paginationInfo.total,
      )
    : flattenedDataSource

  // 解析 placement → top/bottom 对齐（未启用分页 → 两侧均 null，不渲染）。
  const placement = paginationEnabled
    ? resolvePlacement(paginationConfig.placement)
    : { top: null, bottom: null }
  // antd 行为：仅当 total > 0 且分页启用时渲染分页器。
  const showPagination = paginationEnabled && paginationInfo.total > 0
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
  }
}

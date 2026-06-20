/**
 * 分页状态机（S11 分页集成与位置）。
 *
 * **自研核心 + antd Pagination 控件**（决策 6：分页器 UI 用 antd，分页状态机/切片自研）。
 *
 * === 受控 / 非受控 ===
 *
 * - 受控：外部传 `current` / `pageSize`（任一传入即视为该字段受控，真理源在外部）。
 * - 非受控：内部 state（初始取 `defaultCurrent`（默认 1）/ `defaultPageSize`（默认 10））。
 * - 混合：允许 current 受控、pageSize 非受控（或反之），各字段独立判定。
 *
 * === total 派生 ===
 *
 * `total` 默认 = 当前页数据源长度（适配层传入 `dataSourceLength`，即排序+筛选后的长度）。
 * 外部传 `pagination.total` 覆盖（ajax 场景：服务端 total，前端 dataSource 仅当前页——S12）。
 *
 * === 越界回退（对齐 antd usePagination）===
 *
 * 若 `current > maxPage`（maxPage = ceil(total / pageSize)），回退到 `maxPage || 1`。
 * 此回退**仅影响派生的 effectiveCurrent**（渲染 + onChange 注入用），**不**回写内部 state
 * （避免渲染期副作用；与 antd 直接 mutate mergedPagination.current 一致——antd 也是每次 render
 * 重算而非 setState）。受控模式下同样只影响派生值（外部 current 不变，但切片用 effectiveCurrent）。
 *
 * === 切片 ===
 *
 * `pagedDataSource = dataSource.slice((effectiveCurrent-1)*pageSize, effectiveCurrent*pageSize)`。
 * pageSize <= 0 或 dataSource 为空 → 空切片（不崩）。
 *
 * === onChange 分发 ===
 *
 * 翻页/改 pageSize 时调 `onPaginationChange(nextCurrent, nextPageSize)`，适配层据此：
 *   - 非受控字段更新内部 state。
 *   - 触发 Table onChange(paginationState, filters, sorter, { action: 'paginate', currentDataSource })。
 *
 * `paginationState` = `{ current, pageSize, total }`（effective 值，含越界回退）。
 * `currentDataSource` = 分页**前**的全量数据源（与 antd 一致：antd onChange 的 currentDataSource
 * 是分页前的渲染数据）。
 *
 * === 不直接调 antd Pagination.onChange ===
 *
 * 适配层把本 hook 的 `onPaginationChange` 包成 antd `<Pagination>` 的 `onChange`/`onShowSizeChange`
 * （antd Pagination 自身只在用户交互时触发 onChange，与这里语义一致）。
 */

import { useCallback, useMemo, useState } from 'react'
import type { TablePaginationConfig, TablePaginationState } from '../types'

/** 默认每页条数（对齐 antd `DEFAULT_PAGE_SIZE = 10`）。 */
export const DEFAULT_PAGE_SIZE = 10

/** 默认分页位置（对齐 antd v6：`['bottomEnd']`）。 */
export const DEFAULT_PLACEMENT: Array<NonNullable<TablePaginationConfig['placement']>[number]> = [
  'bottomEnd',
]

export interface UsePaginationOptions {
  /** 分页配置（`undefined`/`false` 时不启用——适配层应在调本 hook 前判定）。 */
  pagination: TablePaginationConfig
  /**
   * 当前页数据源长度（排序+筛选后），用于派生 total（当 pagination.total 未传时）。
   */
  dataSourceLength: number
  /**
   * 翻页/改 pageSize 回调。参数为 effective 后的 (current, pageSize)。
   * 适配层据此更新非受控 state + 触发 Table onChange(action:'paginate')。
   */
  onPaginationChange: (current: number, pageSize: number) => void
}

export interface UsePaginationResult {
  /** effective 当前页（含越界回退）。 */
  current: number
  /** effective pageSize（受控/非受控合并）。 */
  pageSize: number
  /** total（外部覆盖或数据源长度）。 */
  total: number
  /** maxPage = ceil(total / pageSize)（至少 1）。 */
  maxPage: number
  /**
   * 传给 antd `<Pagination>` 的 onChange（翻页/改 pageSize）。
   * 内部：先调外部 pagination.onChange/onShowSizeChange（透传），再调 onPaginationChange（驱动 state + Table onChange）。
   */
  onInternalChange: (page: number, pageSize: number) => void
  /**
   * 注入 Table onChange 第一个参数的 pagination 状态对象（含 effective current/pageSize/total）。
   * 供 sort/filter/paginate 各路径统一注入（对齐 antd：onChange 的 pagination 始终反映当前分页）。
   */
  paginationState: TablePaginationState
}

/**
 * 把"含方向词的位置串"归一化为对齐（'start' | 'center' | 'end'），对齐 antd `normalizePlacement`。
 * - 含 'center' → 'center'。
 * - 含 'start' 或 'left' → 'start'。
 * - 否则 → 'end'。
 */
export function normalizePlacement(
  pos: string,
): 'start' | 'center' | 'end' {
  const lower = pos.toLowerCase()
  if (lower.includes('center')) return 'center'
  if (lower.includes('start') || lower.includes('left')) return 'start'
  return 'end'
}

export function usePagination(
  options: UsePaginationOptions,
): UsePaginationResult {
  const { pagination, dataSourceLength, onPaginationChange } = options

  const {
    current: controlledCurrent,
    pageSize: controlledPageSize,
    defaultCurrent,
    defaultPageSize,
    total: controlledTotal,
    onChange: paginationOnChange,
    onShowSizeChange: paginationOnShowSizeChange,
  } = pagination

  // 非受控内部 state（仅对应字段未受控时参与）。
  const [innerCurrent, setInnerCurrent] = useState<number>(
    () => controlledCurrent ?? defaultCurrent ?? 1,
  )
  const [innerPageSize, setInnerPageSize] = useState<number>(
    () => controlledPageSize ?? defaultPageSize ?? DEFAULT_PAGE_SIZE,
  )

  // 合并 current/pageSize（受控优先）。
  const mergedCurrent = controlledCurrent ?? innerCurrent
  const mergedPageSize = controlledPageSize ?? innerPageSize

  // total：外部覆盖优先，否则取数据源长度。
  const total =
    typeof controlledTotal === 'number' && controlledTotal > 0
      ? controlledTotal
      : dataSourceLength

  // 越界回退（对齐 antd：current > maxPage → maxPage || 1；仅影响 effective 值，不回写 state）。
  const maxPage = Math.max(1, Math.ceil(total / mergedPageSize))
  const effectiveCurrent =
    mergedCurrent > maxPage ? maxPage : mergedCurrent

  const onInternalChange = useCallback(
    (page: number, pageSize: number) => {
      // 透传 antd Pagination 原生回调（独立于 Table onChange）。
      paginationOnChange?.(page, pageSize)
      // pageSize 变化时 antd 也会触发 onShowSizeChange（current, size）。
      if (pageSize !== mergedPageSize) {
        paginationOnShowSizeChange?.(page, pageSize)
      }
      // 非受控字段更新内部 state。
      if (controlledCurrent === undefined) {
        setInnerCurrent(page)
      }
      if (controlledPageSize === undefined) {
        setInnerPageSize(pageSize)
      }
      // 驱动适配层 Table onChange(action:'paginate')。
      onPaginationChange(page, pageSize)
    },
    [
      paginationOnChange,
      paginationOnShowSizeChange,
      mergedPageSize,
      controlledCurrent,
      controlledPageSize,
      onPaginationChange,
    ],
  )

  const paginationState = useMemo<TablePaginationState>(
    () => ({ current: effectiveCurrent, pageSize: mergedPageSize, total }),
    [effectiveCurrent, mergedPageSize, total],
  )

  return {
    current: effectiveCurrent,
    pageSize: mergedPageSize,
    total,
    maxPage,
    onInternalChange,
    paginationState,
  }
}

/**
 * 计算分页切片（不改原数组；越界/空安全）。
 *
 * **服务端模式检测（S12，对齐 antd `InternalTable.tsx:538-559`）**：
 *   - `pageSize <= 0` 或 `dataSource` 为空 → 空切片。
 *   - **`total !== undefined && dataSource.length < total`**（server/async 模式：
 *     dataSource 已是当前页、外部 total 表示服务端总量）→ 不切片（返回原 dataSource）；
 *     异常配置（`dataSource.length > pageSize`）仍切片 + 警告。
 *   - 否则（客户端模式：`total` 未定义或 `dataSource.length >= total`）→ 正常切片。
 *
 * 用法：server 模式（ajax demo：dataSource=当前页 10 行、外部 total=100）走「不切片」分支，
 * 客户端模式（S11 pagination demo：total=3=length）走「切片」分支，避免双重分页。
 */
export function slicePage<RecordType>(
  dataSource: Array<RecordType>,
  current: number,
  pageSize: number,
  total?: number,
): Array<RecordType> {
  if (pageSize <= 0 || dataSource.length === 0) return []
  // 服务端/async 模式：dataSource 已是当前页（length < total）→ 不切片（对齐 antd InternalTable.tsx:547-557）。
  if (total !== undefined && dataSource.length < total) {
    // 异常配置（dataSource.length > pageSize，疑似配置错误）→ 仍切片防数据过多，并警告。
    if (dataSource.length > pageSize) {
      // 不抛错仅降级（对齐 antd warning，引擎层不引 antd warning 依赖，console.warn 替代）。
      // eslint-disable-next-line no-console
      console.warn(
        '[data-grid] `dataSource` length is less than `pagination.total` but greater than `pagination.pageSize`. ' +
          'Verify async mode config.',
      )
      const start = (current - 1) * pageSize
      if (start < 0) return []
      return dataSource.slice(start, start + pageSize)
    }
    return dataSource
  }
  // 客户端模式：正常切片。
  const start = (current - 1) * pageSize
  if (start < 0) return []
  return dataSource.slice(start, start + pageSize)
}

/**
 * 解析 placement 数组，返回 { top, bottom } 两侧各自的对齐（'start'|'center'|'end'）或 null（该侧不显示）。
 *
 * 对齐 antd InternalTable.renderPagination + normalizePlacement 语义：
 *   - 取数组中"含 'top' 的首个元素" → top 侧对齐；"含 'bottom' 的首个元素" → bottom 侧对齐。
 *   - 'none' 不含 top/bottom → 该侧不命中。
 *   - 数组全部为 'none' 或未命中任何 top/bottom → 按调用方默认（这里返回 { top: null, bottom: null }，
 *     由调用方决定是否回退默认；antd 行为是"全部 none → 不渲染"）。
 */
export function resolvePlacement(
  placement: Array<NonNullable<TablePaginationConfig['placement']>[number]> | undefined,
): {
  top: 'start' | 'center' | 'end' | null
  bottom: 'start' | 'center' | 'end' | null
} {
  const arr = placement ?? DEFAULT_PLACEMENT
  let top: 'start' | 'center' | 'end' | null = null
  let bottom: 'start' | 'center' | 'end' | null = null
  for (const p of arr) {
    const lower = `${p}`.toLowerCase()
    if (top === null && lower.includes('top')) {
      top = normalizePlacement(lower)
    } else if (bottom === null && lower.includes('bottom')) {
      bottom = normalizePlacement(lower)
    }
  }
  return { top, bottom }
}

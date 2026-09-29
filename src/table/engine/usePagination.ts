/**
 * 分页状态机 — 详见 docs/features/interaction/pagination-and-data.md（引擎状态机 usePagination）
 *
 * 受控/非受控 current/pageSize（各字段独立判定）；total 派生（数据源长度或外部覆盖）；
 * 越界回退仅影响派生值；切片 + 服务端模式检测；onChange 经适配层组装 Table onChange。
 * 分页器 UI 用 antd `<Pagination>`，状态机/切片自研。
 */

import { useCallback, useMemo, useState } from 'react'
import { devWarnOnce } from '../devWarn'
import type { TableCurrentDataSource, TablePaginationConfig, TablePaginationState } from '../types'

/** 默认每页条数（对齐 antd `DEFAULT_PAGE_SIZE = 10`）。 */
export const DEFAULT_PAGE_SIZE = 10

/** 默认分页位置（对齐 antd v6：`['bottomEnd']`）。 */
export const DEFAULT_PLACEMENT: Array<NonNullable<TablePaginationConfig['placement']>[number]> = [
  'bottomEnd',
]

/**
 * **「哪些 action 要把分页拉回第 1 页」的唯一判据**（本仓只此一份，别处不许再写 `action === 'filter'`）。
 *
 * 参照口径＝antd 6.4.4 实测（非推测）：`triggerOnChange(info, action, reset = false)` 的第三参
 *   - `es/table/InternalTable.js:232-237` **筛选** ⇒ `reset = true` ⇒ 复位
 *   - `es/table/InternalTable.js:213-218` **排序** ⇒ 显式 `false` ⇒ **不复位**
 *   - `es/table/InternalTable.js:265-273` **翻页/改 pageSize** ⇒ 缺省 `false` ⇒ **不复位**
 * ⇒ 集合就是 `{ 'filter' }`。
 *
 * 复位不是一个动作，而是**三件事的组合**（落点见 `src/table/usePaginationAdapter.ts` 的
 * `fireTableChange`）：① 归位内部 current（⇒ 非受控时可见行真的回第 1 页）；② 改写 Table
 * `onChange` 的 pagination 参数 `current = 1`；③ fire 用户**裸 `pagination.onChange` prop**
 * （参照 `:192-194` 打的是裸 prop，不是内部 `onInternalChange`——后者会再驱动一次 table 级
 * `onChange(action:'paginate')`）。
 *
 * ⚠️ 与「越界回退」是**两件事**：`usePagination` 里 `current > maxPage` 的钳位（antd
 * `hooks/usePagination.js:33-37` 同形）只在页码越界时生效，筛到"还剩好几页"时它不会动
 * ⇒ 拿钳位当复位证据是伪读数（步骤 68 探针 V1c 就是这条盲区）。
 */
export function shouldResetPagination(
  action: TableCurrentDataSource['action'],
): boolean {
  return action === 'filter'
}

export interface UsePaginationOptions {
  /** 分页配置；适配层把未传 pagination 归一为 `{}`，仅 `pagination={false}` 不启用。 */
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
   * 复位分页：把**内部 state** 的 current 归 1（pageSize 取当前 effective 值）。
   * 同形于参照 `hooks/usePagination.js:38-43 refreshPagination` 的**无参调用**
   * （`{current: undefined ?? 1, pageSize: undefined || mergedPagination.pageSize}`），
   * 参照里它的唯一外部调用点是 `InternalTable.js:186`。
   *
   * ⚠️ 只写 inner ⇒ 受控 `current`/`pageSize` 时外观**不动**（参照 `mergeProps(inner, prop, …)`
   * 是 prop 覆盖 inner，`usePagination.js:29-31`）——受控态的"复位"只体现在回调通知上，
   * 由适配层的 `fireTableChange` 负责，不在这里改用户的受控值。
   */
  resetPagination: () => void
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

  /**
   * 参照 `refreshPagination(undefined, undefined)` 同形：**无条件**写 inner
   * （受控字段由合并优先级掩掉，不在这里分支跳过）。
   */
  const resetPagination = useCallback(() => {
    setInnerCurrent(1)
    setInnerPageSize(mergedPageSize)
  }, [mergedPageSize])

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
    resetPagination,
    paginationState,
  }
}

/**
 * 计算分页切片（不改原数组；越界/空安全）— 详见 docs/features/interaction/pagination-and-data.md（服务端模式检测）
 *
 * 服务端模式检测（对齐 antd `InternalTable.tsx`）：
 *   - `pageSize <= 0` 或 `dataSource` 为空 → 空切片。
 *   - **`total !== undefined && dataSource.length < total`**（server/async 模式：
 *     dataSource 已是当前页、外部 total 表示服务端总量）→ 不切片（返回原 dataSource）；
 *     异常配置（`dataSource.length > pageSize`）仍切片 + 警告。
 *   - 否则（客户端模式：`total` 未定义或 `dataSource.length >= total`）→ 正常切片。
 *
 * 用法：server 模式（ajax demo：dataSource=当前页 10 行、外部 total=100）走「不切片」分支；
 * 客户端模式（pagination demo：total=3=length）走「切片」分支，避免双重分页。
 */
export function slicePage<RecordType>(
  dataSource: Array<RecordType>,
  current: number,
  pageSize: number,
  total?: number,
): Array<RecordType> {
  if (pageSize <= 0 || dataSource.length === 0) return []
  // 服务端/async 模式：dataSource 已是当前页（length < total）→ 不切片（对齐 antd InternalTable.tsx）。
  if (total !== undefined && dataSource.length < total) {
    // 异常配置（dataSource.length > pageSize，疑似配置错误）→ 仍切片防数据过多，并警告。
    if (dataSource.length > pageSize) {
      // 仍降级为切片、不抛错；告警走 `[data-grid]` 唯一出口 `devWarnOnce`
      //   （环境门、前缀、去重都在 `../devWarn.ts` 里判一次）。
      devWarnOnce(
        '`dataSource` length is less than `pagination.total` but greater than `pagination.pageSize`. ' +
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

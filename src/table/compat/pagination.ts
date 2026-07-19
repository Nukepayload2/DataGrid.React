/**
 * 分页相关类型（按业务域从 compatTypes.ts 拆出）。
 *
 * 对齐 antd v6 `TablePaginationPlacement` / `TablePaginationConfig` /
 * onChange 第一个参数 `TablePaginationState`。
 */

import type { ReactNode } from 'react'

/**
 * 分页位置（v6 数组语义，**以 antd 6.4.4 实测为准**）。
 *
 * antd v6 的 `Pagination.placement` 是**数组**（非 v5 的 `position`）：
 *   - `'topStart' | 'topCenter' | 'topEnd'`：顶部 + 对齐（Start 左 / Center 中 / End 右）。
 *   - `'bottomStart' | 'bottomCenter' | 'bottomEnd'`：底部 + 对齐。
 *   - `'none'`：该侧不显示分页器。
 *
 * 数组取"含 'top' 的首个元素"决定顶部位置 + 对齐；"含 'bottom' 的首个元素"决定底部位置 + 对齐；
 * 全部为 'none' → 不渲染分页器。默认 `['bottomEnd']`（底部右对齐）。
 *
 * 同名同义于 antd v6 `TablePaginationPlacement`。
 */
export type TablePaginationPlacement =
  | 'topStart'
  | 'topCenter'
  | 'topEnd'
  | 'bottomStart'
  | 'bottomCenter'
  | 'bottomEnd'
  | 'none'

/**
 * 分页配置（data-grid 透传给底层 antd `<Pagination>`）。
 *
 * **默认分页对齐 antd**：`pagination` 为 `undefined` 时等价 `{}`，默认 pageSize=10 并渲染
 * bottomEnd 分页器；`pagination={false}` 才关闭分页、数据全显。
 *
 * 覆盖 antd demo 实际用到的子集 + 常用字段：
 *   - 受控：`current` / `pageSize`（传入即受控）。
 *   - 非受控初始：`defaultCurrent`（默认 1）/ `defaultPageSize`（默认 10）。
 *   - `total`：默认 = 当前页数据源长度（排序+筛选后）；外部可覆盖（ajax 场景）。
 *   - `showSizeChanger` / `pageSizeOptions`：透传 antd Pagination。
 *   - `showTotal` / `hideOnSinglePage` / `size`：透传 antd Pagination。
 *   - `placement`：v6 数组语义（见 TablePaginationPlacement）。
 *   - `onChange(page, pageSize)` / `onShowSizeChange(current, size)`：透传 antd Pagination（在 Table onChange 之外独立）。
 *
 * 非核心控件用 antd `<Pagination>`，不自研。详见 `docs/features/interaction/pagination-and-data.md`。
 *
 * 类型同名同义于 antd v6 `TablePaginationConfig extends PaginationProps`。
 */
export interface TablePaginationConfig {
  /** 受控当前页（1-based）。传入即受控。 */
  current?: number
  /** 受控每页条数。传入即受控。 */
  pageSize?: number
  /** 非受控初始当前页（默认 1）。仅当 `current` 未传时生效。 */
  defaultCurrent?: number
  /** 非受控初始每页条数（默认 10）。仅当 `pageSize` 未传时生效。 */
  defaultPageSize?: number
  /**
   * 总条数。默认 = 当前页数据源长度（排序+筛选后）。
   * 外部覆盖（如 ajax 场景：服务端 total，前端 dataSource 仅当前页数据）。
   */
  total?: number
  /** 是否显示 pageSize 切换器（透传 antd Pagination）。 */
  showSizeChanger?: boolean
  /** 可选 pageSize 列表（透传 antd Pagination，默认 ['10','20','50','100']）。 */
  pageSizeOptions?: Array<number | string>
  /** 显示总条数回调（透传 antd Pagination）。 */
  showTotal?: (total: number, range: [number, number]) => ReactNode
  /** 只有一页时是否隐藏分页器（透传 antd Pagination）。 */
  hideOnSinglePage?: boolean
  /**
   * 分页器尺寸（透传 antd Pagination）。缺省随 Table size（small/middle→'small'，其余 default）。
   * 取值 `'small'`（紧凑）/ `'default'`（标准）。
   */
  size?: 'small' | 'default'
  /** 分页位置（v6 数组语义，见 TablePaginationPlacement；默认 `['bottomEnd']`）。 */
  placement?: Array<TablePaginationPlacement>
  /**
   * 分页变化回调（透传 antd Pagination，独立于 Table onChange）。
   * 翻页/改 pageSize 时触发：先于此处的 onChange。
   */
  onChange?: (page: number, pageSize: number) => void
  /** pageSize 变化回调（透传 antd Pagination）。 */
  onShowSizeChange?: (current: number, size: number) => void
  /** 透传给 antd Pagination 的 className。 */
  className?: string
  /** 透传给 antd Pagination 的 style。 */
  style?: import('react').CSSProperties
}

/**
 * onChange 第一个参数 `pagination` 的实际值类型。
 *
 * 无论受控与否，onChange 的 pagination 参数始终反映**当前实际分页状态**（与 antd 一致）：
 *   - `current`：当前页（1-based）。
 *   - `pageSize`：每页条数。
 *   - `total`：总条数（外部 total 或当前数据源长度）。
 */
export interface TablePaginationState {
  current: number
  pageSize: number
  total: number
}

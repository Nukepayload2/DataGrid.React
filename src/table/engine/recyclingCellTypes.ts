import type { ReactElement } from 'react'

/**
 * 虚拟渲染模式。
 *
 * - `standard`：默认虚拟滚动路径，React 正常 mount/unmount 当前窗口内的行和单元格。
 * - `recycling`：DOM 复用路径，滚动时尽量复用已有 cell 容器，减少超大表格滚动中的 DOM 创建。
 *
 * 该类型是公开 API，可通过 `gridOptions.virtualizationMode` 配置。只有在 `virtual` 与
 * `scroll={{ y: true }}` 同时启用时才有意义；非虚拟表格会忽略该选项。
 */
export type VirtualizationMode = 'standard' | 'recycling'

/** recycling / 自定义 cell 渲染收到的稳定上下文。 */
export interface GridCellRenderParams<RecordType> {
  /** 当前单元格按 `dataIndex` 取出的值；无 dataIndex 时为 undefined。 */
  value: unknown
  /** 当前行记录。 */
  record: RecordType
  /** 当前行在渲染数据中的索引。 */
  rowIndex: number
  /** 当前叶子列索引。 */
  columnIndex: number
  /** 当前列的稳定 key。 */
  columnKey: string
  /** 当前列的 dataIndex，透传原始列配置。 */
  dataIndex?: string | number | Array<string | number>
  /** 当前行 key。 */
  rowKey: string | number | undefined
}

export interface GridCellElementRenderParams<RecordType> extends GridCellRenderParams<RecordType> {}

/** React slot 渲染必须透传给返回元素的 props。 */
export interface GridCellReactSlotProps {
  /** 复用 slot 的稳定 key；返回 ReactElement 时必须作为 key 使用。 */
  key: string
}

/** 自定义 HTMLElement cell 被释放时的原因。 */
export type DisposeCellElementReason =
  /** cell 被 recycling 池回收，未来可能复用。 */
  | 'recycle'
  /** 同一 slot 被新的 element 替换。 */
  | 'replace'
  /** 当前 element 不再适合复用，被丢弃。 */
  | 'discard'
  /** 表格或 recycling body 卸载。 */
  | 'unmount'

/**
 * data-grid 专属列级选项。
 *
 * 这些字段不属于 antd ColumnType，必须放在 `column.gridColumnOptions` 下。普通业务优先使用
 * `render` / `onCell` / `components.body.cell`；下面的 cell render hooks 是为 recycling 虚拟化、
 * 大规模列表或非 React DOM 集成准备的逃逸舱（escape-hatch）。
 */
export interface GridColumnOptions<RecordType> {
  /**
   * 列拖拽锁定。
   *
   * - `undefined`：该列可发起拖拽，也可被其它列重排影响。
   * - `lockDrag`：该列不可作为拖拽起点，但可被其它列重排影响。
   * - `lockPosition`：该列不可作为拖拽起点，且最终列 index 保持不变。
   */
  dragColumnLock?: 'lockDrag' | 'lockPosition'
  /**
   * 逃逸舱（escape-hatch）HTMLElement 渲染 hook，仅在 recycling cell 路径下使用。
   *
   * `oldElement` 是上一轮可复用的元素；可返回它并自行更新 DOM，也可返回新元素。返回的元素由
   * data-grid 接管定位和生命周期。不要在这里读取 React state 闭包后长期缓存，滚动复用会让同一
   * element 对应不同 record。
   */
  renderCellElement?: (
    params: GridCellElementRenderParams<RecordType>,
    oldElement: HTMLElement | undefined,
  ) => HTMLElement
  /**
   * recycling cell 的 React slot 渲染 hook。
   *
   * 返回的 ReactElement 必须使用 `slot.key` 作为 key；返回 null 表示该格无 React 内容。
   * 适合仍想写 React 内容、但希望由 recycling 路径控制外层 cell 复用的场景。
   */
  renderCellReact?: (
    params: GridCellRenderParams<RecordType>,
    slot: GridCellReactSlotProps,
  ) => ReactElement | null
  /**
   * `renderCellElement` 创建的 HTMLElement 被释放时调用。
   *
   * 用于清理事件监听、第三方 widget 或外部资源。只清理自己创建的副作用，不要修改表格其它 DOM。
   */
  disposeCellElement?: (
    element: HTMLElement,
    reason: DisposeCellElementReason,
    params: GridCellElementRenderParams<RecordType> | undefined,
  ) => void
}

export type RecyclingCellElementMode = 'reuse' | 'no-reuse'

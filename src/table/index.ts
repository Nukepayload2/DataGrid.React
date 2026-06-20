export { Table, getRowKey } from './Table'
// S17 行拖拽排序（方案 B 自研 pointer；不依赖 @dnd-kit/*）。
export { useRowDragSort, arrayMove } from './engine/useRowDragSort'
export type {
  UseRowDragSortOptions,
  UseRowDragSortResult,
  DragIndicatorStyle,
} from './engine/useRowDragSort'
// S19 列拖拽排序（方案 B 自研 pointer 列方向；不依赖 @dnd-kit/*，与 S17/S18 同族）。
export {
  useColumnDragSort,
  arrayMoveColumns,
} from './engine/useColumnDragSort'
export type {
  UseColumnDragSortOptions,
  UseColumnDragSortResult,
  ColumnDragIndicatorStyle,
} from './engine/useColumnDragSort'
export { EXPAND_COLUMN, SELECTION_COLUMN } from './types'
// S9：内置选择项哨兵（Table.SELECTION_ALL/NONE/INVERT 同款对象，对齐 antd）。
export {
  SELECTION_ALL,
  SELECTION_NONE,
  SELECTION_INVERT,
} from './engine/useRowSelection'
export type { SelectionItem } from './engine/useRowSelection'
// S22 汇总 summary 组件（对齐 antd `Table.Summary`；也通过 Table.Summary 静态属性访问）。
export { Summary } from './engine/Summary'
export type {
  SummaryProps,
  SummaryRowProps,
  SummaryCellProps,
} from './engine/Summary'
export type {
  TableProps,
  ColumnType,
  SizeType,
  RowKeyType,
  Align,
  FixedInput,
  TableRef,
  TableRowSelection,
  RowSelectionType,
  RowSelectMethod,
  RowCheckboxProps,
  Expandable,
  ColumnOrSentinel,
  SortOrder,
  SortDirections,
  CompareFn,
  ColumnSorter,
  SorterResult,
  TableCurrentDataSource,
  ColumnFilterItem,
  FilterConfirmProps,
  FilterResetProps,
  FilterDropdownProps,
  ColumnFilterDropdownProps,
  TablePaginationConfig,
  TablePaginationPlacement,
  TablePaginationState,
  TableSemanticClassNames,
  TableSemanticStyles,
  TableSemanticInfo,
  TableClassNames,
  TableStyles,
  StickyConfig,
} from './types'

/**
 * `TableColumnType` 别名——对齐 antd `TableColumnType<RecordType>`（与 `ColumnType` 同义）。
 * 便于 antd demo 原样拷贝（custom-filter-panel 等用 `TableColumnType<DataType>`）。
 */
export type { ColumnType as TableColumnType } from './types'

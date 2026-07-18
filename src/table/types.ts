/**
 * data-grid 对外类型 barrel（re-export hub）。
 *
 * 类型已按层级拆到 3 个文件：
 *   - nativeOptions.ts：原子层（无项目内 import 依赖，对齐/选择/固定方向/滚动条折叠等）。
 *   - compatTypes.ts：antd 桥接类型 + 公开常量值（filter/sorter/pagination/locale 等）。
 *   - publicTypes.ts：Table 顶层 props + ref（聚合 nativeOptions + compatTypes）。
 *
 * 此文件作为 barrel，**透明** re-export 全部公共表面；consumer 的 `from './types'` /
 * `from '../types'` 无需改动。
 */

export type {
  Align,
  FixedInput,
  RowSelectionType,
  GridSelectionValue,
  GridSelectionMode,
  RowCheckboxProps,
  RowSelectMethod,
  GridSelectionOptions,
  TableComponents,
  ScrollBarFoldMode,
} from './nativeOptions'

export type { RowKeyType, TableProps, TableRef } from './publicTypes'

export type {
  FilterValue,
  FilterConfirmProps,
  FilterResetProps,
  FilterDropdownProps,
  ColumnFilterDropdownProps,
  ColumnFilterItem,
  SelectionRenderCellResult,
  TableRowSelection,
  SortOrder,
  CompareFn,
  ColumnSorter,
  SortDirections,
  SorterResult,
  ColumnType,
  ColumnsType,
  RenderedCell,
  TablePaginationPlacement,
  TablePaginationConfig,
  TablePaginationState,
  SizeType,
  ComponentsSemanticClassNames,
  ComponentsSemanticStyles,
  PaginationSemanticClassNames,
  PaginationSemanticStyles,
  TableSemanticClassNames,
  TableSemanticStyles,
  TableSemanticInfo,
  TableClassNames,
  TableStyles,
  StickyConfig,
  TableLocale,
  Expandable,
  ColumnOrSentinel,
  ColumnProps,
  ColumnGroupProps,
  TableCurrentDataSource,
} from './compatTypes'

/** 值 re-export（非 type-only，consumer 用 `import { TABLE_LOCALE_DEFAULT }` 等值 import）。 */
export { TABLE_LOCALE_DEFAULT, EXPAND_COLUMN, SELECTION_COLUMN } from './compatTypes'

/** 跨层 re-export：选择菜单项类型，作为公共表面的一部分（绝对保留）。 */
export type { SelectionItem } from './engine/useRowSelection'

export type {
  DisposeCellElementReason,
  GridCellElementRenderParams,
  GridCellReactSlotProps,
  GridCellRenderParams,
  GridColumnOptions,
  VirtualizationMode,
} from './engine/recyclingCellTypes'

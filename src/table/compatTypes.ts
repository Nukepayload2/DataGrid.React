/**
 * data-grid antd 兼容类型层 + 公开枚举常量（barrel）。
 *
 * 类型按业务域拆到 `./compat/` 子目录；本文件作为 barrel 透明 re-export，
 * 让所有 `from './compatTypes'` / `from '../compatTypes'` 的 import 路径完全不变。
 *
 * 拆分粒度（各文件 80–150 行、内聚）：
 *   - filter.ts：FilterValue / FilterConfirmProps / FilterResetProps / FilterDropdownProps /
 *     ColumnFilterDropdownProps / ColumnFilterItem。
 *   - selection.ts：SelectionRenderCellResult / TableRowSelection。
 *   - sort.ts：SortOrder / CompareFn / ColumnSorter / SortDirections / SorterResult。
 *   - column.ts：ColumnType（巨型 antd column 子集）。
 *   - pagination.ts：TablePaginationPlacement / TablePaginationConfig / TablePaginationState。
 *   - size.ts：SizeType。
 *   - semantic.ts：ComponentsSemanticClassNames/Styles、Pagination/Table Semantic*、
 *     TableClassNames/Styles、TableSemanticInfo。
 *   - sticky.ts：StickyConfig。
 *   - locale.ts：TableLocale + TABLE_LOCALE_DEFAULT const。
 *   - expand.ts：Expandable + EXPAND_COLUMN const + SELECTION_COLUMN const + ColumnOrSentinel。
 *   - jsx.ts：ColumnProps / ColumnGroupProps。
 *   - onChange.ts：TableCurrentDataSource。
 *
 * 3 个 `as const` 哨兵常量（TABLE_LOCALE_DEFAULT / EXPAND_COLUMN / SELECTION_COLUMN）
 * 随所属域就近定义；本 barrel 用 `export *` 透传——**引用相等不破坏**（barrel 只转发不重建）。
 */

export * from './compat/filter'
export * from './compat/selection'
export * from './compat/sort'
export * from './compat/column'
export * from './compat/pagination'
export * from './compat/size'
export * from './compat/semantic'
export * from './compat/sticky'
export * from './compat/locale'
export * from './compat/expand'
export * from './compat/jsx'
export * from './compat/onChange'

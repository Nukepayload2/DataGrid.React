/**
 * data-grid antd 兼容类型层 + 公开枚举常量。
 *
 * 暴露与 antd Table 对齐的兼容类型（`ColumnType` / `TableRowSelection` / `SorterResult` /
 * `FilterValue` / `TablePaginationConfig` / `TableLocale` / `Expandable` / `StickyConfig` 等）
 * 以及 `EXPAND_COLUMN` / `SELECTION_COLUMN` 哨兵常量。
 *
 * @internal 类型按业务域拆到 `./compat/` 子目录（filter/selection/sort/column/pagination/
 *   size/semantic/sticky/locale/expand/jsx/onChange）；本文件作为 barrel 透明 re-export，
 *   让所有 `from './compatTypes'` 的 import 路径不变。3 个 `as const` 哨兵常量
 *   （`TABLE_LOCALE_DEFAULT` / `EXPAND_COLUMN` / `SELECTION_COLUMN`）随所属域就近定义；
 *   barrel 用 `export *` 透传，引用相等不破坏（只转发不重建）。
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

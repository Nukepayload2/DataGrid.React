/**
 * 引擎层排序类型。
 *
 * 从 engineTypes.ts 拆出（档二·纯类型）。与对外 `SortOrder` / `CompareFn` / `ColumnSorter` 同语义；
 * 引擎层独立类型避免对外类型外泄到内部约定。
 */

/**
 * 排序方向。对齐 antd `SortOrder`。
 * 注意：引擎层与对外 `SortOrder` 同语义，这里独立定义避免对外类型外泄到内部约定。
 */
export type EngineSortOrder = 'ascend' | 'descend' | null

/**
 * 排序比较函数。对齐 antd `CompareFn`。
 */
export type EngineCompareFn<RecordType = any> = (
  a: RecordType,
  b: RecordType,
  sortOrder?: EngineSortOrder,
) => number

/**
 * 排序器配置。与对外 `ColumnSorter` 同语义；引擎层独立类型。
 */
export type EngineColumnSorter<RecordType = any> =
  | boolean
  | EngineCompareFn<RecordType>
  | { compare?: EngineCompareFn<RecordType>; multiple?: number }

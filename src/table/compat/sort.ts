/**
 * 排序相关类型（按业务域从 compatTypes.ts 拆出）。
 *
 * 对齐 antd v6 `SortOrder` / `CompareFn` / `ColumnSorter` / `SortDirections` / `SorterResult`。
 *
 * 注意：`SorterResult.column` 引用 `ColumnType`（来自 `./column`），
 * 形成类型层面的相互引用（双方均 `import type`，纯类型无运行时循环）。
 */

import type { ColumnType } from './column'

/**
 * 排序方向。
 * 对齐 antd `SortOrder`：'ascend'（升序）/ 'descend'（降序）/ null（未排序）。
 */
export type SortOrder = 'ascend' | 'descend' | null

/**
 * 排序比较函数。
 * 对齐 antd `CompareFn<RecordType>`：`(a, b, sortOrder?) => number`。
 * 返回值语义与 `Array.prototype.sort` 一致（<0 a 在前，>0 a 在后，=0 不变）。
 */
export type CompareFn<RecordType = any> = (
  a: RecordType,
  b: RecordType,
  sortOrder?: SortOrder,
) => number

/**
 * 排序器配置。
 * - `boolean`：true 表示用默认比较（按 `dataIndex` 字段值升序），false/undefined 不排序。
 * - 函数：自定义比较（`(a, b, sortOrder?) => number`）。
 * - 对象 `{ compare, multiple }`：多列排序用（multiple 为优先级数字）。
 */
export type ColumnSorter<RecordType = any> =
  | boolean
  | CompareFn<RecordType>
  | { compare?: CompareFn<RecordType>; multiple?: number }

/**
 * 点击表头切换排序的循环顺序。
 * 默认 `['ascend', 'descend']`；末尾隐式 `null`（取消排序）回退。
 * 对齐 antd `sortDirections`：值为 `'ascend'`/`'descend'`（不含 null，null 是循环到末尾的隐式回退）。
 *
 * **两级共用同一类型**：列级 `column.sortDirections` 与 Table 级 `TableProps.sortDirections`
 * （后者为前者的默认值）。优先级解析式见 `engine/useSorter.ts` 的
 * `column.sortDirections ?? defaultSortDirections ?? DEFAULT_SORT_DIRECTIONS`
 * （对齐 antd `useSorter.js:75` 的 `column.sortDirections || defaultSortDirections`）。
 */
export type SortDirections = Array<'ascend' | 'descend'>

/**
 * 单列排序结果（对应 antd `SorterResult`）。
 * - `column`：触发排序的列定义（原 antd column 对象）。
 * - `order`：当前排序方向（'ascend'/'descend'/null）。
 * - `field`：排序字段（取自 `column.dataIndex`）。
 * - `columnKey`：排序标识（取自 `column.key`，无 key 时退化为 `column.dataIndex`）。
 */
export interface SorterResult<RecordType = any> {
  column?: ColumnType<RecordType>
  order?: SortOrder
  field?: string | number | ReadonlyArray<string | number>
  columnKey?: React.Key
}

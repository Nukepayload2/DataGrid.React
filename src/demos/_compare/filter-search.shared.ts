/**
 * 决策 9：filter-search 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型不同（data-grid `ColumnType` 与
 * antd `TableProps['columns']` 的 filters/filterSearch/onFilter 类型归属不同）+ filter 模式
 * 取舍差异（左栏 menu 模式 vs 右栏 antd 原样 tree 模式），保留在各自 demo 文件，但两侧均引用
 * 本文件的 `RecordType` 与 `data`。
 *
 * 数据与 antd `components/table/demo/filter-search.tsx` 逐字一致。
 */

/** antd filter-search demo 的记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
}

/** antd filter-search demo 的数据（4 行）。两侧共用，保证对照基准一致。 */
export const data: RecordType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park' },
  { key: '4', name: 'Jim Red', age: 32, address: 'London No. 2 Lake Park' },
]

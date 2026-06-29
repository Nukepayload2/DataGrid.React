/**
 * filter-in-tree 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型不同（data-grid `ColumnType` 与
 * antd `TableProps['columns']` 的 filters/filterMode/filterSearch/onFilter 类型归属不同），
 * 保留在各自 demo 文件，但两侧均引用本文件的 `RecordType` 与 `data`。列字段（Name 树形筛选
 * 含 children / Age sorter / Address menu 筛选）两侧逐字一致。
 *
 * 数据与 antd `components/table/demo/filter-in-tree.tsx` 逐字一致。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
}

/** 数据（4 行）。两侧共用，保证对照基准一致。 */
export const data: RecordType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park' },
  { key: '4', name: 'Jim Red', age: 32, address: 'London No. 2 Lake Park' },
]

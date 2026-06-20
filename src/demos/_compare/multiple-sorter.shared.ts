/**
 * 决策 9：multiple-sorter 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型不同（data-grid `ColumnType` 与
 * antd `TableProps['columns']` 的 sorter 对象 compare/multiple 类型归属不同），保留在各自
 * demo 文件，但均引用本文件的 `RecordType` 与 `data`，且列字段逐字一致（Name 不可排序 /
 * Chinese multiple:3 / Math multiple:2 / English multiple:1）。
 *
 * 与 antd `components/table/demo/multiple-sorter.tsx` 逐字一致。
 */

/** antd multiple-sorter demo 的记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  chinese: number
  math: number
  english: number
}

/** antd multiple-sorter demo 的数据（4 行）。两侧共用，保证对照基准一致。 */
export const data: RecordType[] = [
  { key: '1', name: 'John Brown', chinese: 98, math: 60, english: 70 },
  { key: '2', name: 'Jim Green', chinese: 98, math: 66, english: 89 },
  { key: '3', name: 'Joe Black', chinese: 98, math: 90, english: 70 },
  { key: '4', name: 'Jim Red', chinese: 88, math: 99, english: 89 },
]

/**
 * 决策 9：reset-filter 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型不同（data-grid `ColumnType` 与
 * antd `TableProps['columns']` 的 sorter/filters 类型归属不同；filter 下拉控件
 * data-grid 引擎自绘 vs antd 原生），保留在各自 demo 文件，但均引用本文件的
 * `RecordType`、`data`、`Filters`、`Sorts`，且列字段逐字一致
 * （Name filters+sorter / Age sorter / Address filters+sorter + 三列 ellipsis）。
 *
 * 与 antd `components/table/demo/reset-filter.tsx` 逐字一致。
 *
 * ★ 注意：reset-filter 与 custom-filter-panel 的 data 第 2/3 行顺序不同
 *   （antd 官方两份 demo 各自独立声明），故各自单独建 shared 文件，不复用 head.shared。
 */

/** antd reset-filter demo 的记录类型。两侧共用。 */
export interface RecordType {
  key: string
  name: string
  age: number
  address: string
}

/** antd reset-filter demo 的数据（4 行）。两侧共用，保证对照基准一致。 */
export const data: RecordType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park' },
  { key: '4', name: 'Jim Red', age: 32, address: 'London No. 2 Lake Park' },
]

/**
 * 决策 9：ellipsis-custom-tooltip 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型/render 不同（data-grid `ColumnType` 与
 * antd `TableProps['columns']` 的 ellipsis/render 重载类型不兼容；两侧 render 均用 antd
 * `<Tooltip>` 但函数签名归属不同列类型），保留在各自 demo 文件，但均引用本文件的 `RecordType`
 * 与 `data`，且列字段逐字一致（6 列：Name render `<a>` width150 / Age width80 / Address ×4
 * `ellipsis:{showTitle:false}` + `<Tooltip>` render，title 长度递增）。
 *
 * 与 antd `components/table/demo/ellipsis-custom-tooltip.tsx` 逐字一致。
 */

/** antd ellipsis-custom-tooltip demo 的记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
}

/** antd ellipsis-custom-tooltip demo 的数据（3 行，address 均为超长文本）。两侧共用。 */
export const data: RecordType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park, New York No. 1 Lake Park',
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 2 Lake Park, London No. 2 Lake Park',
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park, Sydney No. 1 Lake Park',
  },
]

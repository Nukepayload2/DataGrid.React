/**
 * custom-filter-panel 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型/render 不同（data-grid `ColumnType`
 * + 内联 SearchOutlined + HTMLInputElement ref；antd `TableProps['columns']` + antd
 * 原生 SearchOutlined + InputRef），保留在各自 demo 文件，但均引用本文件的
 * `RecordType`、`data`、`DataIndex`。
 *
 * 与 antd `components/table/demo/custom-filter-panel.tsx` 逐字一致。
 *
 * 注意：custom-filter-panel 的 data 第 2/3 行顺序与 reset-filter/head 不同
 * （key 2 = Joe Black / key 3 = Jim Green），antd 官方三份 demo 各自独立声明，
 * 故各自单独建 shared 文件。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: string
  name: string
  age: number
  address: string
}

/** RecordType 的字段名联合（dataIndex 取值）。两侧 getColumnSearchProps 工厂共用。 */
export type DataIndex = keyof RecordType

/** 数据（4 行）。两侧共用，保证对照基准一致。 */
export const data: RecordType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Joe Black', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Jim Green', age: 32, address: 'Sydney No. 1 Lake Park' },
  { key: '4', name: 'Jim Red', age: 32, address: 'London No. 2 Lake Park' },
]

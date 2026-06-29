/**
 * column-defaults 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型不同（data-grid `ColumnType` Address 用
 * `align:'start'`；antd `TableProps['columns']` Address 用 `align:'left'`）且 width 字段各自
 * 保留在 demo 文件，仅共享 `RecordType` + `data`。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  address: string
  description: string
}

/** 数据（2 行）。两侧共用。 */
export const data: RecordType[] = [
  {
    key: '1',
    name: 'John Brown',
    description: 'Shared column props let repeated column settings live on the table.',
    address: 'No. 1 Lake Park Road, Hangzhou, Zhejiang, China',
  },
  {
    key: '2',
    name: 'Jim Green',
    description: 'Columns can still override the default alignment or other shared props.',
    address: 'No. 99 Garden Avenue, Pudong, Shanghai, China',
  },
]

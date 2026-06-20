/**
 * 决策 9：expand 左右对比 demo 的共享配置（M9 行展开）。
 *
 * 提取两侧都复用的类型与数据（Name/Age/Address/Action + description）。
 * 列定义因类型不同（data-grid `ColumnType` / antd `ColumnsType`）由各自 demo 声明，
 * 本文件只共享 `RecordType` + `data`。
 *
 * antd `expand` demo 要素：
 *   - `expandable.expandedRowRender` 渲染 description。
 *   - `expandable.rowExpandable`：record.name === 'Not Expandable' 禁用展开图标。
 *   - 默认非受控展开态。
 */

/** antd expand demo 的记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
  description: string
}

/** antd expand demo 的数据（4 行，第 3 行 "Not Expandable"）。两侧共用。 */
export const data: RecordType[] = [
  {
    key: 1,
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    description: 'My name is John Brown, I am 32 years old, living in New York No. 1 Lake Park.',
  },
  {
    key: 2,
    name: 'Jim Green',
    age: 42,
    address: 'London No.1 Lake Park',
    description: 'My name is Jim Green, I am 42 years old, living in London No.1 Lake Park.',
  },
  {
    key: 3,
    name: 'Not Expandable',
    age: 29,
    address: 'Jiangsu No. 1 Lake Park',
    description: 'This not expandable',
  },
  {
    key: 4,
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    description: 'My name is Joe Black, I am 32 years old, living in Sydney No. 1 Lake Park.',
  },
]

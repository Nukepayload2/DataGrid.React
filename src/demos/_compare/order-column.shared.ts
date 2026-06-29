/**
 * order-column 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列顺序（Name → EXPAND_COLUMN → Age → SELECTION_COLUMN →
 * Address）两侧一致；列定义因类型不同（data-grid `ColumnOrSentinel` / antd `ColumnsType`）
 * 各自在 demo 文件内声明，本文件只共享 `RecordType` + `data`。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: number
  address: string
  description: string
}

/**
 * 数据（4 行）。两侧共用。
 *
 * 第 3 行 "Not Expandable" 与其它 3 行有 description；antd demo 未设 rowExpandable，
 * 4 行均可展开（"Not Expandable" 仅文字）。两侧忠实复刻此行为。
 */
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
    address: 'London No. 1 Lake Park',
    description: 'My name is Jim Green, I am 42 years old, living in London No. 1 Lake Park.',
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

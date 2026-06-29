/**
 * jsx 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义两侧都用 JSX `<Table.Column>`/`<Table.ColumnGroup>`
 * 子元素声明（data-grid 与 antd 各自从自家 Table 静态属性解构），render 内 Tag/Flex/Space
 * 各自实现，故列不在此共享；仅共享 `RecordType` + `data`。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  firstName: string
  lastName: string
  age: number
  address: string
  tags: string[]
}

/** 数据（3 行）。两侧共用。 */
export const data: RecordType[] = [
  {
    key: '1',
    firstName: 'John',
    lastName: 'Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    tags: ['nice', 'developer'],
  },
  {
    key: '2',
    firstName: 'Jim',
    lastName: 'Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    tags: ['kawaii'],
  },
  {
    key: '3',
    firstName: 'Joe',
    lastName: 'Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    tags: ['cool', 'teacher'],
  },
]

/**
 * 计算 Tag 颜色。两侧 render 复用此函数保证颜色判定一致。
 */
export function tagColor(tag: string): string {
  let color = tag.length > 5 ? 'geekblue' : 'green'
  if (tag === 'kawaii') {
    color = 'volcano'
  }
  return color
}

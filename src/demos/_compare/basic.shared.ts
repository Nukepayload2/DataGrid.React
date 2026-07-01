/** 记录类型。两侧共用。 */
export interface RecordType {
  key: string
  name: string
  age: number
  address: string
  tags: string[]
}

/** 数据（3 行）。两侧共用，保证对照基准一致。 */
export const data: RecordType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    tags: ['nice', 'developer'],
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    tags: ['kawaii'],
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    tags: ['cool', 'teacher'],
  },
]

/**
 * 计算 Tag 颜色（tag.length > 5 → geekblue；'kawaii' → volcano；
 * 否则 green）。两侧 render 复用此函数保证颜色判定一致。
 */
export function tagColor(tag: string): string {
  let color = tag.length > 5 ? 'geekblue' : 'green'
  if (tag === 'kawaii') {
    color = 'volcano'
  }
  return color
}

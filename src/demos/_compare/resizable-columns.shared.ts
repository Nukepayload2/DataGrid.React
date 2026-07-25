/**
 * resizable 左右对比 demo 的共享配置（列宽拖拽）。
 *
 * 左右两栏共享同一组数据和列定义；右栏只作静态基线，不提供拖拽手柄。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: string
  name: string
  age: number
  address: string
  tags: string[]
  description: string
}

/** resizable demo 数据（3 行）。两侧共用。 */
export const data: RecordType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    tags: ['nice', 'developer'],
    description: 'A friendly developer from New York.',
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    tags: ['kawaii'],
    description: 'Lives near the park in London.',
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    tags: ['cool', 'teacher'],
    description: 'A cool teacher based in Sydney.',
  },
]

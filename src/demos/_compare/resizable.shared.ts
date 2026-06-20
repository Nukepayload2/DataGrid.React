/**
 * 决策 9：resizable 左右对比 demo 的共享配置（M7 列宽拖拽）。
 *
 * **特例**：antd Table **无原生列宽拖拽（resizable）能力**，右栏不渲染 antd 同名 demo；
 * 右栏仅显示说明区 + 一张静态 antd `<Table>` 作基线参照（同数据/同列，无拖拽）。
 * 本文件共享 `RecordType` + `data` + `Tag` 配色，供左栏 data-grid 与右栏静态基线
 * antd Table 复用，对照基准一致。
 *
 * antd 侧无额外依赖（仅用 antd `<Table>`/`<Tag>`/`<Space>` 渲染静态基线）。
 */

/** resizable demo 记录类型。两侧共用。 */
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

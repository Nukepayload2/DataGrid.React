/**
 * expand-sticky 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据（Team/Name/Age/Address/Action + description）。
 * 列定义因类型不同（data-grid `ColumnOrSentinel` / antd `ColumnsType`，且含哨兵
 * `Table.EXPAND_COLUMN`）由各自 demo 声明，本文件只共享 `RecordType` + `data`。
 *
 * antd `expand-sticky` demo 要素：
 *   - `bordered`。
 *   - Team 列每 2 行合并（`onCell` 返回 `rowSpan: 2 / 0`）。
 *   - `Table.EXPAND_COLUMN` 哨兵控制展开列位置（Team 之后）。
 *   - `expandable.expandedRowRender(record)` 渲染 description。
 *   - antd demo 原本用 `expandable.expandedRowOffset: 3`（v5.26+ **已废弃**，
 *     官方建议改用 `Table.EXPAND_COLUMN`）—— 左栏 data-grid 本就用 EXPAND_COLUMN
 *     控位置；右栏 antd 为忠实复刻 antd demo 原样保留 `expandedRowOffset: 3`
 *     （antd 本体仍接受该 prop，内部转为 EXPAND_COLUMN 等效行为），对照两侧
 *     展开列位置是否一致。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  team: string
  name: string
  age: number
  address: string
  description: string
}

/** 数据（4 行，Team A/B 各 2 行）。两侧共用。 */
export const data: RecordType[] = [
  {
    key: 1,
    team: 'Team A',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    description: 'My name is John Brown, I am 32 years old, living in New York No. 1 Lake Park.',
  },
  {
    key: 2,
    team: 'Team A',
    name: 'Jim Green',
    age: 42,
    address: 'London No.1 Lake Park',
    description: 'My name is Jim Green, I am 42 years old, living in London No.1 Lake Park.',
  },
  {
    key: 3,
    team: 'Team B',
    name: 'Not Expandable',
    age: 29,
    address: 'Jiangsu No. 1 Lake Park',
    description: 'This not expandable',
  },
  {
    key: 4,
    team: 'Team B',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    description: 'My name is Joe Black, I am 32 years old, living in Sydney No. 1 Lake Park.',
  },
]

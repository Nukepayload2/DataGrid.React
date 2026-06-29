/**
 * bordered demo 的 data-grid 段（左栏）。
 * - `BorderedTitleFooterDg`：示例1（bordered + title/footer，复刻 antd 官方 bordered demo）。
 * - `BorderedFixedDg`：示例2（bordered + fixed 组合）。
 * - 默认导出 `BorderedDg`：div gap 堆叠两个示例。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import {
  data,
  fixedData,
  type FixedRow,
  type RowType,
} from './_compare/bordered.shared'

// 示例 1 列定义：Name / Cash Assets(align end + className 'column-money') / Address，
// 3 列 + title/footer。
const dgColumnsExample1: ColumnType<RowType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Cash Assets',
    // className 'column-money' 是 antd demo 演示 column.className 透传的 placeholder，
    // antd 自身无对应 CSS 规则——两栏均无视觉高亮。详见 docs/design-notes/bordered.md。
    className: 'column-money',
    dataIndex: 'money',
    // data-grid 用逻辑属性 'end'（等价 antd 'right'，RTL 自动适配）。
    align: 'end',
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
]

// 示例 2 列定义：bordered + fixed 组合，fixed 用逻辑属性 'start'/'end'（等价 antd 'left'/'right'）。
const dgColumnsExample2: ColumnType<FixedRow>[] = [
  {
    title: 'Full Name',
    dataIndex: 'name',
    width: 120,
    fixed: 'start',
  },
  { title: 'Age', dataIndex: 'age', width: 100, fixed: 'start' },
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  {
    title: 'Action',
    key: 'operation',
    width: 100,
    fixed: 'end',
    render: () => <a>action</a>,
  },
]

// 示例 1：bordered + title/footer
export function BorderedTitleFooterDg({
  bordered = true,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
} = {}) {
  return (
    <Table<RowType>
      columns={dgColumnsExample1}
      dataSource={data}
      bordered={bordered}
      title={() => 'Header'}
      footer={() => 'Footer'}
      pagination={{}}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

// 示例 2：bordered + fixed 组合
export function BorderedFixedDg({
  bordered = true,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
} = {}) {
  return (
    <Table<FixedRow>
      columns={dgColumnsExample2}
      dataSource={fixedData}
      bordered={bordered}
      virtual={virtual}
      scroll={virtual ? { x: 'max-content', y: true } : { x: 'max-content' }}
      pagination={{}}
    />
  )
}

// 默认导出：div gap 堆叠两个示例。
export default function BorderedDg({
  bordered = true,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
} = {}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <BorderedTitleFooterDg bordered={bordered} virtual={virtual} />
      <BorderedFixedDg bordered={bordered} virtual={virtual} />
    </div>
  )
}

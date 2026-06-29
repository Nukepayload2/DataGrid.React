/**
 * bordered demo 的 antd 段（右栏）。
 * - `BorderedTitleFooterAntd`：示例1（bordered + title/footer，忠实复刻 antd 官方 bordered demo）。
 * - `BorderedFixedAntd`：示例2（bordered + fixed 组合，fixed:'left'/'right'）。
 * - 默认导出 `BorderedAntd`：div gap 堆叠两个示例。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import {
  data,
  fixedData,
  type FixedRow,
  type RowType,
} from './_compare/bordered.shared'

// 示例 1 列定义：Name / Cash Assets(align right + className 'column-money') / Address，
// 3 列 + title/footer。
const antdColumnsExample1: NonNullable<TableProps<RowType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Cash Assets',
    className: 'column-money',
    dataIndex: 'money',
    align: 'right',
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
]

// 示例 2 列定义：bordered + fixed 组合，fixed 用 'left'/'right'（antd 原生）。
const antdColumnsExample2: NonNullable<TableProps<FixedRow>['columns']> = [
  {
    title: 'Full Name',
    dataIndex: 'name',
    width: 120,
    fixed: 'left',
  },
  { title: 'Age', dataIndex: 'age', width: 100, fixed: 'left' },
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  {
    title: 'Action',
    key: 'operation',
    width: 100,
    fixed: 'right',
    render: () => <a>action</a>,
  },
]

// 示例 1：bordered + title/footer
export function BorderedTitleFooterAntd({
  bordered = true,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
} = {}) {
  return (
    <AntdTable<RowType>
      columns={antdColumnsExample1}
      dataSource={data}
      bordered={bordered}
      title={() => 'Header'}
      footer={() => 'Footer'}
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}

// 示例 2：bordered + fixed 组合
export function BorderedFixedAntd({
  bordered = true,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
} = {}) {
  return (
    <AntdTable<FixedRow>
      columns={antdColumnsExample2}
      dataSource={fixedData}
      bordered={bordered}
      /* antd virtual 要求 scroll.x 为数字（字符串 'max-content' 会抛 "scroll.x must be
         number"），故 ON 时改传数字 2000；OFF 时回 'max-content'。data-grid 左栏不受此限。
         详见 docs/design-notes/virtualization.md */
      virtual={virtual}
      scroll={virtual ? { x: 2000, y: 280 } : { x: 'max-content' }}
    />
  )
}

// 默认导出：div gap 堆叠两个示例。
export default function BorderedAntd({
  bordered = true,
  virtual = false,
}: {
  bordered?: boolean
  virtual?: boolean
} = {}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <BorderedTitleFooterAntd bordered={bordered} virtual={virtual} />
      <BorderedFixedAntd bordered={bordered} virtual={virtual} />
    </div>
  )
}

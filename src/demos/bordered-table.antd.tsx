import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import {
  data,
  fixedData,
  type FixedRow,
  type RowType,
} from './_compare/bordered-table.shared'
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
      virtual={virtual}
      scroll={virtual ? { x: 2000, y: 280 } : { x: 'max-content' }}
    />
  )
}
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



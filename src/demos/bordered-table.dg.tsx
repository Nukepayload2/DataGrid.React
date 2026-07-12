import { Table } from '../table'
import type { ColumnType } from '../table'
import {
  data,
  fixedData,
  type FixedRow,
  type RowType,
} from './_compare/bordered-table.shared'
const dgColumnsExample1: ColumnType<RowType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Cash Assets',
    className: 'column-money',
    dataIndex: 'money',
    align: 'end',
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
]
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


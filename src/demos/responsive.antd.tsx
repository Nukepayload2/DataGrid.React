/**
 * responsive demo 的 antd 段（右栏）。
 *
 * 忠实复刻 antd responsive demo：原生 column.responsive（Name 无 responsive + Age `responsive:['md']`
 * + Address `responsive:['lg']`）。断点检测由 antd Table 内部 responsiveObserver 自动订阅。
 * props `{ bordered, virtual }` 由父组件传入。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/responsive.shared'

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name (all screens)',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age (medium screen or bigger)',
    dataIndex: 'age',
    key: 'age',
    responsive: ['md'],
  },
  {
    title: 'Address (large screen or bigger)',
    dataIndex: 'address',
    key: 'address',
    responsive: ['lg'],
  },
]

export default function ResponsiveAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      dataSource={data}
      bordered={bordered}
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}

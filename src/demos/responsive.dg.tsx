/**
 * responsive demo 的 data-grid 段（左栏）。
 *
 * 列定义：Name（无 responsive 始终显示）/ Age（`responsive:['md']`）/ Address（`responsive:['lg']`）。
 * 引擎内部订阅 antd responsiveObserver 按断点显隐列。props `{ bordered, virtual }` 由父组件传入。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/responsive.shared'

const dgColumns: ColumnType<RecordType>[] = [
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

export default function ResponsiveDg({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      bordered={bordered}
      // 对齐右栏 antd 默认分页（antd 对任意行数都渲染 .ant-pagination disabled 态分页条；
      //   data-grid omit=不渲染）。补 pagination={{}} 启用默认分页器，两侧分页条存在性一致。
      pagination={{}}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

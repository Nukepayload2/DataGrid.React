import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/ellipsis.shared'

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
    width: 150,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: 80,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address 1',
    ellipsis: true,
  },
  {
    title: 'Long Column Long Column Long Column',
    dataIndex: 'address',
    key: 'address 2',
    ellipsis: true,
  },
  {
    title: 'Long Column Long Column',
    dataIndex: 'address',
    key: 'address 3',
    ellipsis: true,
  },
  {
    title: 'Long Column',
    dataIndex: 'address',
    key: 'address 4',
    ellipsis: true,
  },
]

export default function EllipsisDg({
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
      /* pagination={{}}：对齐 antd 默认分页条（antd 对任意行数都渲染 .ant-pagination）。 */
      pagination={{}}
      /* virtual 开关 ON 时 virtual=true + scroll:{y:true}（数据区域模式，CSS 自适应填满
         SplitDemo 给的 400px 限高，虚拟窗口才有滚动区）；OFF 时 scroll=undefined。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}


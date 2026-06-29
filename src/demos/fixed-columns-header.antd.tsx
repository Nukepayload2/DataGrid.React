/**
 * fixed-columns-header demo 的 antd 段（右栏）。
 *
 * props 驱动 `{ bordered, virtual }`（由 fixed-columns-header.tsx 父组件传）。
 * 自包含：含 `antdColumns`（Full Name/Age fixed start + Column 1-20 + Action fixed end）+
 * `<AntdTable>` JSX。
 * 忠实复刻 antd 官方 fixed-columns-header demo：scroll x max-content + y 55*5 + pagination false。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { dataSource, type DataType } from './_compare/fixed-columns-header.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 fixed-columns-header demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<DataType> = [
  { title: 'Full Name', width: 100, dataIndex: 'name', key: 'name', fixed: 'start' },
  { title: 'Age', width: 100, dataIndex: 'age', key: 'age', fixed: 'start' },
  { title: 'Column 1', dataIndex: 'address', key: '1', width: 150 },
  { title: 'Column 2', dataIndex: 'address', key: '2', width: 150 },
  { title: 'Column 3', dataIndex: 'address', key: '3', width: 150 },
  { title: 'Column 4', dataIndex: 'address', key: '4', width: 150 },
  { title: 'Column 5', dataIndex: 'address', key: '5', width: 150 },
  { title: 'Column 6', dataIndex: 'address', key: '6', width: 150 },
  { title: 'Column 7', dataIndex: 'address', key: '7', width: 150 },
  { title: 'Column 8', dataIndex: 'address', key: '8' },
  { title: 'Column 9', dataIndex: 'address', key: '9' },
  { title: 'Column 10', dataIndex: 'address', key: '10' },
  { title: 'Column 11', dataIndex: 'address', key: '11' },
  { title: 'Column 12', dataIndex: 'address', key: '12' },
  { title: 'Column 13', dataIndex: 'address', key: '13' },
  { title: 'Column 14', dataIndex: 'address', key: '14' },
  { title: 'Column 15', dataIndex: 'address', key: '15' },
  { title: 'Column 16', dataIndex: 'address', key: '16' },
  { title: 'Column 17', dataIndex: 'address', key: '17' },
  { title: 'Column 18', dataIndex: 'address', key: '18' },
  { title: 'Column 19', dataIndex: 'address', key: '19' },
  { title: 'Column 20', dataIndex: 'address', key: '20' },
  {
    title: 'Action',
    key: 'operation',
    fixed: 'end',
    width: 100,
    render: () => <a>action</a>,
  },
]

export default function FixedColumnsHeaderAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <AntdTable<DataType>
      columns={antdColumns}
      dataSource={dataSource}
      bordered={bordered}
      /* virtual 开关 ON 时叠加 virtual + x 转数字 2000（antd virtual 不接受 'max-content'）；
         OFF 时回退原 max-content。 */
      virtual={virtual}
      scroll={virtual ? { x: 2000, y: 55 * 5 } : { x: 'max-content', y: 55 * 5 }}
      pagination={false}
    />
  )
}

import { Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { dataSource, type DataType } from './_compare/fixed-columns.shared'

// 右栏（antd）列定义 —— 忠实复刻 antd 官方 fixed-columns demo

const antdColumns: TableColumnsType<DataType> = [
  {
    title: 'Full Name',
    width: 100,
    dataIndex: 'name',
    key: 'name',
    fixed: 'start',
  },
  {
    title: 'Age',
    width: 100,
    dataIndex: 'age',
    key: 'age',
    fixed: 'start',
    sorter: true,
  },
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  { title: 'Column 6', dataIndex: 'address', key: '6' },
  { title: 'Column 7', dataIndex: 'address', key: '7' },
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

export default function FixedColumnsAntd({
  bordered = false,
  size = 'medium',
  virtual = false,
}: {
  bordered: boolean
  size: 'medium' | 'large'
  virtual: boolean
}) {
  return (
    <AntdTable<DataType>
      columns={antdColumns}
      dataSource={dataSource}
      bordered={bordered}
      size={size}
      /* 虚拟化开关接入：ON 时在原 scroll.x 基础上叠加 virtual=true + scroll.y:340
         （antd 不认 true；本 demo 无分页故扣除表头~55 → 约 340 才能塞进 ~400px pane）。
         antd virtual 要求 scroll.x 必须为数字（字符串 'max-content' 会抛 "scroll.x must be number"），
         故 ON 时改传数字 2000（按列宽估算取保险值足够触发横滚）；OFF 时回原 'max-content'。
         data-grid 左栏不受此限（保持 'max-content'）。详见 docs/design-notes/virtualization.md */
      virtual={virtual}
      scroll={virtual ? { x: 2000, y: 340 } : { x: 'max-content' }}
      pagination={false}
    />
  )
}


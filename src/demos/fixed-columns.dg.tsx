import { Table } from '../table'
import type { ColumnType } from '../table'
import { dataSource, type DataType } from './_compare/fixed-columns.shared'

// 左栏（data-grid）列定义 —— 与 antd demo 列结构逐字一致（含 Age sorter:true）。
// fixed 用 antd v6 逻辑属性 'start'/'end'（等价 'left'/'right'，RTL 自动适配）。

const dgColumns: ColumnType<DataType>[] = [
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

export default function FixedColumnsDg({
  bordered = false,
  size = 'medium',
  virtual = false,
}: {
  bordered: boolean
  size: 'medium' | 'large'
  virtual: boolean
}) {
  return (
    <Table<DataType>
      columns={dgColumns}
      dataSource={dataSource}
      bordered={bordered}
      size={size === 'medium' ? 'middle' : 'large'}
      /* 虚拟化开关接入：ON 时在原 scroll.x 基础上叠加 virtual=true + scroll.y:true
         （CSS 自适应填满 SplitDemo 给的 400px 限高，虚拟窗口才有滚动区）；
         OFF 时仅保留原 scroll.x:'max-content'。详见 docs/features/scrolling/virtualization.md */
      virtual={virtual}
      scroll={virtual ? { x: 'max-content', y: true } : { x: 'max-content' }}
      pagination={false}
    />
  )
}


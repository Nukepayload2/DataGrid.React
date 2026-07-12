import { Table } from '../table'
import type { ColumnType } from '../table'
import { dataSource, type DataType } from './_compare/non-contiguous-fixed-columns.shared'

// 左栏（data-grid）列定义 —— 与 antd demo 列结构逐字一致。
// 分散固定列堆叠：start 侧 FullName + Column1（不相邻），end 侧 Action1 + Action3（不相邻）。
// useStickyColumns 按列顺序累加偏移：start 从左扫遇 fixed=start 累加；end 从右扫遇 fixed=end 累加。

const dgColumns: ColumnType<DataType>[] = [
  {
    title: 'Full Name',
    width: 100,
    dataIndex: 'name',
    fixed: 'start',
  },
  {
    title: 'Age',
    width: 100,
    dataIndex: 'age',
  },
  { title: 'Column 1', dataIndex: 'address', key: '1', fixed: 'start' },
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
    title: 'Action 1',
    fixed: 'end',
    width: 90,
    render: () => <a>action</a>,
  },
  {
    title: 'Action 2',
    width: 90,
    render: () => <a>action</a>,
  },
  {
    title: 'Action 3',
    fixed: 'end',
    width: 90,
    render: () => <a>action</a>,
  },
]

export default function FixedGappedColumnsDg({
  bordered = true,
  size = 'medium',
  virtual = false,
}: {
  bordered: boolean
  size: 'medium' | 'large'
  virtual: boolean
}) {
  return (
    <Table<DataType>
      bordered={bordered}
      columns={dgColumns}
      dataSource={dataSource}
      size={size === 'medium' ? 'middle' : 'large'}
      // 虚拟化开关接入：ON 时 scroll.y:true（表体纵向滚动）；OFF 仅保留原 max-content。
      virtual={virtual}
      scroll={virtual ? { x: 'max-content', y: true } : { x: 'max-content' }}
      pagination={false}
    />
  )
}


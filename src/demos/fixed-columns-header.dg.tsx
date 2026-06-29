/**
 * fixed-columns-header demo 的 data-grid 段（左栏）。
 *
 * props 驱动 `{ bordered, virtual }`（由 fixed-columns-header.tsx 父组件传）。
 * 自包含：含 `dgColumns`（Full Name/Age fixed start + Column 1-20 + Action fixed end）+
 * `<Table>` JSX + 父容器 height:330 wrapper。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { dataSource, type DataType } from './_compare/fixed-columns-header.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 与 antd demo 列结构逐字一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<DataType>[] = [
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

export default function FixedColumnsHeaderDg({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    /* 数据区域模式 — 详见 docs/design-notes/layout.md
       父容器需有明确 height（330 ≈ antd y:55*5=275 表体 + 表头 ~55，对齐右栏可视高度）；
       scroll.y:true，表体 flex:1 填满容器剩余空间。 */
    <div style={{ height: 330 }}>
      <Table<DataType>
        columns={dgColumns}
        dataSource={dataSource}
        bordered={bordered}
        virtual={virtual}
        scroll={{ x: 'max-content', y: true }}
      />
    </div>
  )
}

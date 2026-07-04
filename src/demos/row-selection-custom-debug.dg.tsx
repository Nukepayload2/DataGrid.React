import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
import { dataSource, type RecordType } from './_compare/row-selection-custom-debug.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 + rowSelection
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
]

// Keep `renderCell` pure because the grid consumes it from both render and onCell paths.
const dgRowSelection: TableRowSelection<RecordType> = {
  renderCell: (checked, _record, index, node) => ({
    props: { rowSpan: index % 2 === 0 ? 2 : 0 },
    children: (
      <>
        {String(checked)}: {node}
      </>
    ),
  }),
}

export default function RowSelectionCustomDebugDg({
  virtual = false,
}: {
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      rowSelection={dgRowSelection}
      columns={dgColumns}
      dataSource={dataSource}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
      pagination={false}
    />
  )
}

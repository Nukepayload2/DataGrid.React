import { Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import { dataSource, type RecordType } from './_compare/row-selection-custom-debug.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 + rowSelection —— 忠实复刻 antd row-selection-custom-debug demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<RecordType> = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
]

type AntdTableRowSelection<T extends object = object> = TableProps<T>['rowSelection']

const antdRowSelection: AntdTableRowSelection<RecordType> = {
  renderCell: (checked, _record, index, node) => ({
    props: { rowSpan: index % 2 === 0 ? 2 : 0 },
    children: (
      <>
        {String(checked)}: {node}
      </>
    ),
  }),
}

export default function RowSelectionCustomDebugAntd({
  virtual = false,
}: {
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      rowSelection={antdRowSelection}
      columns={antdColumns}
      dataSource={dataSource}
      pagination={false}
      virtual={virtual}
      scroll={virtual ? { y: 340 } : undefined}
    />
  )
}

import { useState } from 'react'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { theme } from 'antd'
import { initialData, type RecordType } from './_compare/drag-row-sorting.shared'
const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: '10%' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: '7%' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

export default function DragSortingDg({
  bordered = false,
  autoScroll = true,
  virtual = false,
}: {
  bordered: boolean
  autoScroll: boolean
  virtual: boolean
}) {
  const { token } = theme.useToken()
  const [dataSource, setDataSource] = useState<RecordType[]>(initialData)

  return (
    <div>
      <Table<RecordType>
        rowKey="key"
        columns={dgColumns}
        dataSource={dataSource}
        bordered={bordered}
        pagination={{}}
        tableLayout="fixed"
        styles={{ body: { cell: { cursor: 'move' } } }}
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
        gridOptions={{
          rowDragSort: { onSort: setDataSource, autoScroll },
        }}
      />
      <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary }}>
        当前行顺序：{dataSource.map((r) => r.name).join(' / ')}
      </div>
    </div>
  )
}

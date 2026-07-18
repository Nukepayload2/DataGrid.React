import { useState } from 'react'
import { theme } from 'antd'
import { Table } from '../table'
import type { ColumnOrSentinel, ColumnType } from '../table'
import { data, type RecordType } from './_compare/drag-column-sorting.shared'

const dgBaseColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  {
    title: 'Gender',
    dataIndex: 'gender',
    key: 'gender',
    gridColumnOptions: { dragColumnLock: 'lockDrag' },
  },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    gridColumnOptions: { dragColumnLock: 'lockPosition' },
  },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

export default function DragColumnSortingDg({
  bordered = false,
  autoScroll = true,
  columnReorder = true,
  virtual = false,
}: {
  bordered: boolean
  autoScroll: boolean
  columnReorder: boolean
  virtual: boolean
}) {
  const [columns, setColumns] = useState<ColumnType<RecordType>[]>(() =>
    dgBaseColumns.map((column, i) => ({ ...column, key: `${i}` })),
  )

  const { token } = theme.useToken()
  const onColumnSort = (next: Array<ColumnOrSentinel<RecordType>>) => {
    setColumns(next as Array<ColumnType<RecordType>>)
  }

  return (
    <div>
      <Table<RecordType>
        rowKey="key"
        columns={columns}
        dataSource={data}
        bordered={bordered}
        pagination={{}}
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
        gridOptions={{
          columnDragSort: { onSort: onColumnSort, autoScroll },
          columnReorder,
        }}
      />
      <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary }}>
        当前列顺序：{columns.map((c) => c.title).join(' / ')}
        <br />
        
        <span style={{ color: token.colorPrimary }}>
          Gender: 不可发起拖(lockDrag)；Email: 锁定位置(lockPosition)；ColumnReorder
          全局开关：{columnReorder ? '开' : '关（所有列头不可拖）'}
        </span>
      </div>
    </div>
  )
}


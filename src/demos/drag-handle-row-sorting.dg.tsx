import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { ReactNode } from 'react'
import { Button, theme } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { initialData, type RecordType } from './_compare/drag-handle-row-sorting.shared'
function InlineHolderOutlined({ style }: { style?: CSSProperties }): ReactNode {
  return (
    <svg
      viewBox="64 64 896 896"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-0.125em', ...style }}
    >
      <path d="M300 276.5a56 56 0 1056-97 56 56 0 00-56 97zm0 284a56 56 0 1056-97 56 56 0 00-56 97zM640 228a56 56 0 10112 0 56 56 0 00-112 0zm0 284a56 56 0 10112 0 56 56 0 00-112 0zM300 844.5a56 56 0 1056-97 56 56 0 00-56 97zM640 796a56 56 0 10112 0 56 56 0 00-112 0z" />
    </svg>
  )
}
function DgDragHandle() {
  return (
    <Button
      type="text"
      size="small"
      className="dg-drag-handle"
      icon={<InlineHolderOutlined />}
      style={{ cursor: 'move' }}
    />
  )
}

const dgColumns: ColumnType<RecordType>[] = [
  { key: 'sort', align: 'center', width: 80, render: () => <DgDragHandle /> },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

export default function DragSortingHandlerDg({
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
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
        gridOptions={{
          rowDragSort: {
            onSort: setDataSource,
            handleSelector: '.dg-drag-handle',
            autoScroll,
          },
        }}
      />
      <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary }}>
        当前行顺序：{dataSource.map((r) => r.name).join(' / ')}
      </div>
    </div>
  )
}

import { useMemo, useRef, useState } from 'react'
import { theme } from 'antd'
import { Table, useColumnDragSort } from '../table'
import type { ColumnType } from '../table'
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

  const containerRef = useRef<HTMLDivElement>(null)
  const { token } = theme.useToken()
  const tableColumns = useMemo(
    () =>
      columns.map((column) => {
        const draggable =
          columnReorder &&
          column.gridColumnOptions?.dragColumnLock === undefined
        return {
          ...column,
          onHeaderCell: (col, index) => {
            const base = column.onHeaderCell?.(col, index) ?? {}
            return {
              ...base,
              style: {
                ...base.style,
                cursor: draggable ? 'move' : undefined,
              },
            }
          },
        } satisfies ColumnType<RecordType>
      }),
    [columnReorder, columns],
  )

  const { dragState, indicator, containerProps } = useColumnDragSort<ColumnType<RecordType>>({
    columns,
    onSort: setColumns,
    containerRef,
    autoScroll,
    reorder: columnReorder,
  })

  return (
    <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
      <Table<RecordType>
        rowKey="key"
        columns={tableColumns}
        dataSource={data}
        bordered={bordered}
        pagination={{}}
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
      
      {indicator.visible ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: indicator.left,
            top: indicator.top,
            height: indicator.height,
            width: 2,
            background: token.colorPrimary,
            zIndex: 9999,
            pointerEvents: 'none',
            borderRadius: 1,
          }}
        />
      ) : null}
      <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary }}>
        当前拖拽：
        {dragState ? `from #${dragState.fromIndex + 1} → 目标 #${dragState.overIndex + 1}` : '无'}
        ；当前列顺序：{columns.map((c) => c.title).join(' / ')}
        <br />
        
        <span style={{ color: token.colorPrimary }}>
          Gender: 不可发起拖(lockDrag)；Email: 锁定位置(lockPosition)；ColumnReorder
          全局开关：{columnReorder ? '开' : '关（所有列头不可拖）'}
        </span>
      </div>
    </div>
  )
}


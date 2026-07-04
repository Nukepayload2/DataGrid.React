import { useMemo } from 'react'
import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
import { data, type RecordType } from './_compare/row-selection-fixed.shared'

// ---------------------------------------------------------------------------
// 类型与选项
// ---------------------------------------------------------------------------

export type SelectionType = 'checkbox' | 'radio'
export type SelFixed = 'auto' | 'start' | 'end'

// ---------------------------------------------------------------------------
// 列定义（首列 fixed 由 firstColFixed 开关控；末列固定 'end'）
// ---------------------------------------------------------------------------

function buildColumns(firstColFixed: boolean): ColumnType<RecordType>[] {
  const middle: ColumnType<RecordType>[] = Array.from({ length: 6 }, (_, i) => ({
    title: `Col ${i + 1}`,
    dataIndex: `col${i + 1}`,
    width: 100,
    render: () => '—',
  }))
  return [
    {
      title: 'Name',
      dataIndex: 'name',
      width: 200,
      fixed: firstColFixed ? 'start' : undefined,
    },
    ...middle,
    {
      title: 'Action',
      key: 'action',
      width: 100,
      fixed: 'end',
      render: () => <a>action</a>,
    },
  ]
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

export default function RowSelectionFixedDg({
  selectionType = 'checkbox',
  firstColFixed = true,
  selFixed = 'auto',
  selectedKeys = [],
  onSelectedKeysChange,
  virtual = false,
}: {
  selectionType: SelectionType
  firstColFixed: boolean
  selFixed: SelFixed
  selectedKeys: Array<React.Key>
  onSelectedKeysChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  const dgColumns = useMemo(() => buildColumns(firstColFixed), [firstColFixed])

  // `auto` means "let the engine inherit from neighboring fixed columns".
  const fixedProp = selFixed === 'auto' ? undefined : selFixed

  const dgRowSelection: TableRowSelection<RecordType> = {
    type: selectionType,
    fixed: fixedProp,
    selectedRowKeys: selectedKeys,
    onChange: (keys) => onSelectedKeysChange(keys),
  }

  return (
    <Table<RecordType>
      columns={dgColumns}
      rowSelection={dgRowSelection}
      dataSource={data}
      virtual={virtual}
      scroll={virtual ? { x: 1200, y: true } : { x: 1200 }}
      pagination={false}
    />
  )
}

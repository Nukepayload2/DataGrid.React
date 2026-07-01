import { useMemo } from 'react'
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/row-selection-fixed.shared'

// 类型本地声明（与 dg 子文件同款）。
type SelectionType = 'checkbox' | 'radio'
type SelFixed = 'auto' | 'start' | 'end'

// ---------------------------------------------------------------------------
// 列定义（首列 fixed 由 firstColFixed 开关控；末列固定 'right'）
// ---------------------------------------------------------------------------

function buildAntdColumns(
  firstColFixed: boolean,
): NonNullable<TableProps<RecordType>['columns']> {
  const middle: NonNullable<TableProps<RecordType>['columns']>[number][] =
    Array.from({ length: 6 }, (_, i) => ({
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
      fixed: firstColFixed ? 'left' : undefined,
    },
    ...middle,
    {
      title: 'Action',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: () => <a>action</a>,
    },
  ]
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

export default function RowSelectionFixedAntd({
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
  const antdColumns = useMemo(() => buildAntdColumns(firstColFixed), [
    firstColFixed,
  ])

  // `auto` means "let antd inherit from neighboring fixed columns".
  const antdFixedProp =
    selFixed === 'start' ? 'left' : selFixed === 'end' ? 'right' : undefined

  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {
    type: selectionType,
    fixed: antdFixedProp,
    selectedRowKeys: selectedKeys,
    onChange: (keys: React.Key[]) => onSelectedKeysChange(keys),
  }

  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      rowSelection={antdRowSelection}
      dataSource={data}
      virtual={virtual}
      scroll={virtual ? { x: 1200, y: 300 } : { x: 1200 }}
      pagination={false}
    />
  )
}

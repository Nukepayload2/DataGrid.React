/**
 * order-column demo 的 antd 段（右栏）。
 *
 * - props 驱动 `{ virtual }`（由父组件传）。
 *   右栏 antd rowSelection 用 `rowSelection={{}}` 非受控（与 antd demo 逐字一致），
 *   选择 state 完全在 antd 内部维护，父不参与（左栏 dg 受控仅用于父底部可视化区）。
 * - 自包含：含 `antdColumns`（antd `Table.EXPAND_COLUMN` + antd `Table.SELECTION_COLUMN` 哨兵）+
 *   `<AntdTable>` JSX + `antdExpandable` 派生。
 * - 忠实复刻 antd order-column demo：antd `<Table>` + antd 哨兵 + antd rowSelection + expandable。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/order-column.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）columns —— 忠实复刻 antd order-column demo
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  AntdTable.EXPAND_COLUMN,
  { title: 'Age', dataIndex: 'age', key: 'age' },
  AntdTable.SELECTION_COLUMN,
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// expandable antd 同款（expandedRowRender 渲染 description 段落）。
const antdExpandable: NonNullable<TableProps<RecordType>['expandable']> = {
  expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.description}</p>,
}

export default function OrderColumnAntd({
  virtual = false,
}: {
  virtual: boolean
}) {
  // 右栏 antd rowSelection 与 antd demo 逐字一致（{} 非受控默认 checkbox）。
  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {}

  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      rowSelection={antdRowSelection}
      expandable={antdExpandable}
      dataSource={data}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:300（antd 不认 true，需数字像素高度；
         OFF 时回 undefined）。 */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}

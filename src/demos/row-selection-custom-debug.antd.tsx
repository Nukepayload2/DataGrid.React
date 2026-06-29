/**
 * row-selection-custom-debug demo 的 antd 段（右栏）。
 *
 * - props 驱动 `{ virtual }`（与左栏 dg 子组件同款，由父组件传）：virtual：全局虚拟化开关。
 *   注：本 demo 含 rowSpan 合并行，合并 × 虚拟属已知简化（不在此处理）。
 * - 自包含：含 `antdColumns`（单列 Name）+ `antdRowSelection`（renderCell 自定义勾选格 +
 *   返回 `props.rowSpan` 合并行，与左栏逻辑逐字一致）+ `<AntdTable>` JSX。无控制条。
 * - 忠实复刻 antd row-selection-custom-debug demo：antd `<Table>` + antd 原生 `rowSelection.renderCell`。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import { dataSource, type RecordType } from './_compare/row-selection-custom-debug.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 + rowSelection —— 忠实复刻 antd row-selection-custom-debug demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<RecordType>[] = [
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

// virtual 默认值用 false（瞬时态，父 useVirtualization 顶栏 Switch 驱动）。
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

/**
 * row-selection-custom-debug demo 的 data-grid 段（左栏）。
 *
 * - props 驱动 `{ virtual }`（由父组件传）：virtual：全局虚拟化开关。
 *   注：本 demo 含 rowSpan 合并行，合并 × 虚拟属已知简化（不在此处理）。
 * - 自包含：含 `dgColumns`（单列 Name）+ `dgRowSelection`（renderCell 自定义勾选格 + 返回
 *   `props.rowSpan` 接入 cellMerge）+ `<Table>` JSX。无控制条（renderCell 逻辑固定，两侧同款）。
 */
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

// renderCell（对齐 antd demo 逐字）：props.rowSpan 决定合并行数，children 渲染勾选文本 + node。
// renderCell 必须为纯函数（引擎内 render 和 onCell 各调用一次）— 详见 docs/design-notes/selection.md
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

// virtual 默认值用 false（瞬时态，父 useVirtualization 顶栏 Switch 驱动）。
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
    />
  )
}

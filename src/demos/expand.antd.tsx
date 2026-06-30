/**
 * expand demo 的 antd 段（右栏），忠实复刻 antd expand demo。
 *
 * props：`{ expandedRowKeys, onExpandedRowsChange, virtual }`（与左栏同款，真理源在父）。
 * 改为受控展开（antd demo 原本非受控），便于对照两侧展开行为同步。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/expand.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  {
    title: 'Action',
    dataIndex: '',
    key: 'x',
    render: () => <a>Delete</a>,
  },
]

// expandedRowKeys 默认值用 []（纯瞬时展开态初始无展开合理）。
export default function ExpandAntd({
  expandedRowKeys = [],
  onExpandedRowsChange,
  virtual = false,
}: {
  expandedRowKeys: readonly React.Key[]
  onExpandedRowsChange: (keys: readonly React.Key[]) => void
  virtual: boolean
}) {
  // expandable：expandedRowRender + rowExpandable + 受控 expandedRowKeys。
  const antdExpandable: NonNullable<TableProps<RecordType>['expandable']> = {
    expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.description}</p>,
    rowExpandable: (record) => record.name !== 'Not Expandable',
    expandedRowKeys,
    onExpandedRowsChange,
  }

  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      expandable={antdExpandable}
      dataSource={data}
      /* ON 时 virtual=true + scroll.y:300（antd 不认 true，需数字像素高度）。 */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}

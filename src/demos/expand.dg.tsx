/**
 * expand demo 的 data-grid 段（左栏）。
 *
 * props：`{ expandedRowKeys, onExpandedRowsChange, virtual }`（由父组件传）。
 * expandable.expandedRowRender 渲染 description + rowExpandable 禁用 "Not Expandable" 行
 * + grid 0fr↔1fr 过渡 + expandRowByClick（点击行体切换展开）+ expandedRowClassName（展开行加 class）。
 */
import { Table } from '../table'
import type { ColumnType, Expandable } from '../table'
import { data, type RecordType } from './_compare/expand.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
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
export default function ExpandDg({
  expandedRowKeys = [],
  onExpandedRowsChange,
  virtual = false,
}: {
  expandedRowKeys: Array<React.Key>
  onExpandedRowsChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  // expandable：expandedRowRender + rowExpandable + 受控 expandedRowKeys。
  // 左栏额外开启 expandRowByClick（点击行体切换展开）+ expandedRowClassName（展开行加 class）。
  const dgExpandable: Expandable<RecordType> = {
    expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.description}</p>,
    rowExpandable: (record) => record.name !== 'Not Expandable',
    expandedRowKeys,
    onExpandedRowsChange,
    expandRowByClick: true,
    expandedRowClassName: () => 'dg-demo-expanded-row',
  }

  return (
    <Table<RecordType>
      columns={dgColumns}
      expandable={dgExpandable}
      dataSource={data}
      pagination={{}}
      /* ON 时 virtual=true + scroll.y:true（CSS 自适应填满 SplitDemo 限高）。
         展开内容直接渲染但不参与虚拟窗口大小—详见 docs/design-notes/virtualization.md */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

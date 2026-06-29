/**
 * expand demo 的 antd 段（右栏），从 expand.tsx 拆出。
 *
 * - props 驱动 `{ expandedRowKeys, onExpandedRowsChange, virtual }`（与左栏 dg 子组件同款，
 *   真理源在父——共享 expandedRowKeys 受控同时驱动两侧）。
 * - 自包含：含 `antdColumns` + `<AntdTable>` JSX + `antdExpandable` 派生。
 * - 忠实复刻 antd expand demo：antd `<Table>` + antd expandable（expandedRowRender + rowExpandable）。
 *   决策 9 下改为受控展开（antd demo 原本非受控），便于对照两侧展开行为同步。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/expand.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/expand.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd expand demo
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

// ★ expandedRowKeys 默认值用 []（无选择是有效态——纯瞬时展开态初始无展开合理）。
export default function ExpandAntd({
  expandedRowKeys = [],
  onExpandedRowsChange,
  virtual = false,
}: {
  expandedRowKeys: Array<React.Key>
  onExpandedRowsChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  // expandable antd 同款（expandedRowRender + rowExpandable + 受控 expandedRowKeys）。
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
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:300（antd 不认 true，需数字像素高度；
         OFF 时回 undefined，行为与改造前一致）。 */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}

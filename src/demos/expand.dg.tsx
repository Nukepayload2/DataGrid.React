/**
 * expand demo 的 data-grid 段（左栏），从 expand.tsx 拆出。
 *
 * - props 驱动 `{ expandedRowKeys, onExpandedRowsChange, virtual }`（由 expand.tsx 父组件传）：
 *   * expandedRowKeys：当前展开行 key 列表（真理源在父——父 Expand All/Collapse All 按钮组直接读写它）。
 *   * onExpandedRowsChange：展开行变化回调（左栏 data-grid 用 onExpandedRowsChange）。
 *   * virtual：全局虚拟化开关。
 * - 自包含：含 `dgColumns`（Name/Age/Address/Action）+ `<Table>` JSX + `dgExpandable` 派生。
 * - 行为与改造前一致：`expandable.expandedRowRender` 渲染 description + `rowExpandable` 禁用
 *   "Not Expandable" 行 + grid 0fr↔1fr 过渡 + ★T7 `expandRowByClick` + `expandedRowClassName`
 *   （点击行体切换展开 + 展开行加 class，仅左栏 data-grid，右栏 antd 不加，对照）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/expand.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType, Expandable } from '../table'
import { data, type RecordType } from './_compare/expand.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
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

// ★ expandedRowKeys 默认值用 []（无选择是有效态——纯瞬时展开态初始无展开合理，
//   非配置型 state 不需 defaultCheckedList 全选式兜底）。
// 编辑模式 SplitDemoPreview 的 propsFor 超集 {bordered,virtual,size,autoScroll} 不含
// expandedRowKeys，此时子组件用 [] 默认值 → 所有行收起（合理有效初值），渲染正常。
export default function ExpandDg({
  expandedRowKeys = [],
  onExpandedRowsChange,
  virtual = false,
}: {
  expandedRowKeys: Array<React.Key>
  onExpandedRowsChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  // expandable 左栏同款（expandedRowRender + rowExpandable + 受控 expandedRowKeys）。
  // ★ T7：左栏（data-grid）额外开启 expandRowByClick + expandedRowClassName，便于 verifier
  //   验证「点击行体（非图标）切换展开」+「展开行加 class」。右栏 antd 不加（对照）。
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
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         给的限高，虚拟窗口才有滚动区；决策2——展开内容直接渲染但不参与虚拟窗口大小）；
         OFF 时回 undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

/**
 * tree-table-preserveSelectedRowKeys demo 的 data-grid 段（左栏），从
 * tree-table-preserveSelectedRowKeys.tsx 拆出。
 *
 * - props 驱动 `{ checkStrictly, preserveSelectedRowKeys, virtual }`（由父组件传；
 *   前两个由共享 DemoToolbar Switch 控制，virtual 由全局虚拟化开关控制）。
 * - 自包含：含 `dgColumns`（Name/Age/Address 纯文本）+ `<Table>` JSX + 本侧 rowSelection
 *   的 `onChange`（控制台日志，各侧独立，非跨栏同步选中态——本 demo 演示 preserve/checkStrictly
 *   联动行为对照，勾选独立便于 diff 两侧行为差异）。
 * - 行为与改造前一致：树形 × 分页（defaultPageSize:5）× checkStrictly × preserveSelectedRowKeys
 *   （issue #50621）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - checkStrictly=false（对齐 antd demo 初值：父子联动）。
 * - preserveSelectedRowKeys=true（对齐 antd demo 初值：翻页/折叠保留 key）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 已覆盖 virtual；checkStrictly/
 * preserveSelectedRowKeys 是本 demo 特有 prop，靠默认值兜底让编辑模式未编辑侧 fallback +
 * 编辑产物也能完整演示树形 × checkStrictly × preserve 联动。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/tree-table-preserveSelectedRowKeys.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType, TableProps, TableRowSelection } from '../table'
import { dataSource, type RecordType } from './_compare/tree-table-preserveSelectedRowKeys.shared'

// ---------------------------------------------------------------------------
// 列定义 —— Name/Age/Address 纯文本，无 render（两侧同款）。
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: '12%' },
  { title: 'Address', dataIndex: 'address', key: 'address', width: '30%' },
]

// ---------------------------------------------------------------------------
// rowSelection —— onChange 控制台日志（各侧独立）；checkStrictly + preserve 由 props 注入。
// 注：data-grid TableRowSelection 尚未声明 onSelect（决策 3 第二步补齐），仅 onChange（功能等价）。
// ---------------------------------------------------------------------------

const dgRowSelectionBase: TableRowSelection<RecordType> = {
  onChange: (selectedRowKeys, selectedRows, info) => {
    // eslint-disable-next-line no-console
    console.log(
      `[data-grid] selectedRowKeys: ${selectedRowKeys}`,
      'selectedRows: ',
      selectedRows,
      'info',
      info,
    )
  },
}

export default function TreeTablePreserveSelectedRowKeysDg({
  checkStrictly = false,
  preserveSelectedRowKeys = true,
  virtual = false,
}: {
  checkStrictly: boolean
  preserveSelectedRowKeys: boolean
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      rowSelection={{
        ...dgRowSelectionBase,
        checkStrictly,
        preserveSelectedRowKeys,
      }}
      dataSource={dataSource}
      pagination={{ defaultPageSize: 5 }}
      /* 虚拟化（决策 7）：ON→virtual+scroll.y=true（CSS 自适应高度，SplitDemo 限高 pane body
         提供可滚动区域）；OFF→不传，非虚拟全量 DOM（零回归）。
         树形展开行视为普通行（决策 2），虚拟路径同样被 RO 实测（measured-first + 约定兜底）。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

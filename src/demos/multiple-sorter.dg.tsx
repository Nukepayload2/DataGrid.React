/**
 * multiple-sorter demo 的 data-grid 段（左栏），从 multiple-sorter.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual, remountKey }`（由 multiple-sorter.tsx 父组件传）：
 *   * bordered：表格边框开关（控制条驱动）。
 *   * virtual：全局虚拟化开关。
 *   * remountKey：Reset 按钮递增的 key，应用到内部 `<Table key=...>` 强制 remount 清空所有
 *     排序激活态（multiple-sorter demo 多列排序非受控，不能通过受控 setState 重置）。
 * - 自包含：含 `dgColumns`（Chinese multiple:3 / Math multiple:2 / English multiple:1 / Name 不可排序）
 *   + `<Table>` JSX + 共用 `onChange` console.log。
 * - 行为与改造前一致：多列 sorter.multiple 优先级 + 表头优先级序号 + onChange 数组。
 *
 * === ★ 多列排序 state 自管（非受控）===
 * multiple-sorter demo 的排序是 antd 原生非受控语义（不传受控 sortOrder），状态由 Table 内部管理。
 * Reset 按钮通过 React key remount 强制重建（见父文件），故子组件**不需要**排序 state props。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/multiple-sorter.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { data, type RecordType } from './_compare/multiple-sorter.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
  {
    title: 'Chinese Score',
    dataIndex: 'chinese',
    sorter: {
      compare: (a, b) => a.chinese - b.chinese,
      multiple: 3,
    },
  },
  {
    title: 'Math Score',
    dataIndex: 'math',
    sorter: {
      compare: (a, b) => a.math - b.math,
      multiple: 2,
    },
  },
  {
    title: 'English Score',
    dataIndex: 'english',
    sorter: {
      compare: (a, b) => a.english - b.english,
      multiple: 1,
    },
  },
]

// ---------------------------------------------------------------------------
// onChange（console.log 各参数）
// ---------------------------------------------------------------------------

const onChange: DgTableProps<RecordType>['onChange'] = (
  pagination,
  filters,
  sorter,
  extra,
) => {
  // eslint-disable-next-line no-console
  console.log('multiple-sorter demo onChange params:', { pagination, filters, sorter, extra })
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// ★ props 默认值均为合理有效初值（坑5+坑7）：
// - bordered=false（对齐改造前默认，antd multiple-sorter demo 原本无边框）。
// - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
// - remountKey=0（初始 key，编辑模式未传时 Table 用此 key 正常挂载，不影响渲染）。
// 多列排序非受控，由 Table 内部管理；编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll}
// 不含 remountKey，子组件用 0 默认值 → Table 正常挂载（合理有效初值），无需排序 state 兜底。
export default function MultipleSorterDg({
  bordered = false,
  virtual = false,
  remountKey = 0,
}: {
  bordered: boolean
  virtual: boolean
  remountKey: number
}) {
  return (
    <Table<RecordType>
      key={`dg-${remountKey}`}
      columns={dgColumns}
      dataSource={data}
      onChange={onChange}
      bordered={bordered}
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         pane 限高，虚拟窗口才有滚动区）；OFF 时回 undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

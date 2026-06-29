/**
 * filter-search demo 的 data-grid 段（左栏），从 filter-search.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 filter-search.tsx 父组件传）。
 * - 自包含：含 `dgColumns`（Name filterMode:'tree' + filterSearch:true + filters 扁平 3 项
 *   [Joe/Category 1/Category 2] / Age sorter / Address filterSearch:true + filters [London/New York]）
 *   + 共用 `onChange` console.log + `<Table>` JSX。
 * - 行为与改造前一致（与官方 antd filter-search.tsx:30 逐字一致）：Name 列 `filterMode: 'tree'`
 *   （antd `<Tree checkable>` 树形 UI）+ filterSearch:true（输入命中节点高亮，不隐藏）；
 *   Address 列默认 menu + filterSearch:true（顶部搜索框实时过滤筛选项）。
 *
 * === ★ 筛选 state 自管（非受控）===
 * filter-search demo 的筛选是 antd 原生非受控语义（不传受控 filteredValue），状态由 Table 内部管理。
 * 筛选项搜索框（filterSearch 渲染的顶部 Input）也由引擎 FilterDropdown 内部管理（输入实时过滤/高亮
 * 筛选项，关闭下拉清空搜索值）。子组件**不需要**筛选 state props——列定义本身即非受控初始态。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 已覆盖本子组件所需 props，无需额外兜底。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/filter-search.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { data, type RecordType } from './_compare/filter-search.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 行为对齐 antd（Name 带 filterMode:'tree'）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    filters: [
      { text: 'Joe', value: 'Joe' },
      { text: 'Category 1', value: 'Category 1' },
      { text: 'Category 2', value: 'Category 2' },
    ],
    // S6/S7：filterMode:'tree'（与官方 antd filter-search.tsx:30 逐字一致）+ filterSearch:true。
    //    tree 模式输入搜索词高亮命中节点（antd filterTreeNode "highlight" 语义，不隐藏）。
    filterMode: 'tree',
    filterSearch: true,
    onFilter: (value, record) => record.name.startsWith(value as string),
    width: '30%',
  },
  {
    title: 'Age',
    dataIndex: 'age',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    filters: [
      { text: 'London', value: 'London' },
      { text: 'New York', value: 'New York' },
    ],
    onFilter: (value, record) => record.address.startsWith(value as string),
    filterSearch: true,
    width: '40%',
  },
]

// ---------------------------------------------------------------------------
// onChange（与 antd 子组件共用同一个 console.log 形态）
// ---------------------------------------------------------------------------

const onChange: DgTableProps<RecordType>['onChange'] = (pagination, filters, sorter, extra) => {
  // eslint-disable-next-line no-console
  console.log('filter-search demo onChange params:', { pagination, filters, sorter, extra })
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// ★ props 默认值均为合理有效初值（坑5+坑7）：
// - bordered=false（对齐改造前默认，antd filter-search demo 原本无边框）。
// - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
// 筛选非受控（filterSearch 渲染的顶部搜索框由引擎 FilterDropdown 内部管理），无子组件内部 state。
// 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 已覆盖本子组件所需 props。
export default function FilterSearchDg({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      onChange={onChange}
      bordered={bordered}
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         pane 限高，虚拟窗口才有滚动区；filterSearch 下拉是表头 popover，不受虚拟化影响）；
         OFF 时回 undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

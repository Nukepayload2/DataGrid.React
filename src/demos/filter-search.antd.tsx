/**
 * filter-search demo 的 antd 段（右栏），从 filter-search.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（与左栏 dg 子组件同款签名）。
 * - 自包含：含 `antdColumns`（Name filterMode:'tree' + filterSearch:true + filters 扁平 3 项
 *   [Joe/Category 1/Category 2] / Age sorter / Address filterSearch:true + filters [London/New York]）
 *   + 共用 `onChange` console.log + `<AntdTable>` JSX。
 * - 忠实复刻 antd filter-search demo（与官方逐字一致）：Name `filterMode:'tree'`（antd `<Tree checkable>`）；
 *   Address 默认 menu + filterSearch:true。
 *
 * === ★ 筛选 state 自管（非受控）===
 * 同左栏 dg 子组件：筛选非受控（不传受控 filteredValue），状态由 antd Table 内部管理；
 * filterSearch 渲染的顶部搜索框由 antd FilterDropdown 内部管理。子组件不需要筛选 state props。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/filter-search.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import { data, type RecordType } from './_compare/filter-search.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 忠实复刻 antd filter-search demo（Name 带 filterMode:'tree'）
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<RecordType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    filters: [
      {
        text: 'Joe',
        value: 'Joe',
      },
      {
        text: 'Category 1',
        value: 'Category 1',
      },
      {
        text: 'Category 2',
        value: 'Category 2',
      },
    ],
    // ★ antd 原版带 filterMode:'tree'——右栏忠实保留（与左栏逐字一致，两侧均 tree）。
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
      {
        text: 'London',
        value: 'London',
      },
      {
        text: 'New York',
        value: 'New York',
      },
    ],
    onFilter: (value, record) => record.address.startsWith(value as string),
    filterSearch: true,
    width: '40%',
  },
]

// ---------------------------------------------------------------------------
// onChange（与 dg 子组件共用同一个 console.log 形态）
// ---------------------------------------------------------------------------

const onChange: TableProps<RecordType>['onChange'] = (pagination, filters, sorter, extra) => {
  // eslint-disable-next-line no-console
  console.log('filter-search demo onChange params:', { pagination, filters, sorter, extra })
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// ★ props 默认值同左栏 dg（合理有效初值，见 dg 子文件注释）。
export default function FilterSearchAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      dataSource={data}
      onChange={onChange}
      bordered={bordered}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且表头/默认
         分页画在 scroll.y 之外，需扣除表头~55 与分页条~64 → 约 280 才能塞进 pane 限高；
         OFF 时回 undefined，行为与改造前一致）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}

/**
 * filter-search demo 的 data-grid 段（左栏）。
 *
 * props 驱动 `{ bordered, virtual }`（由 filter-search.tsx 父组件传）。
 * 自包含：含 `dgColumns`（Name filterMode:'tree' + filterSearch:true + filters 扁平 3 项
 * [Joe/Category 1/Category 2] / Age sorter / Address filterSearch:true + filters [London/New York]）
 * + 共用 `onChange` console.log + `<Table>` JSX。
 *
 * 筛选非受控（不传受控 filteredValue），filterSearch 渲染的顶部搜索框由 FilterDropdown 内部管理
 * （输入实时过滤/高亮筛选项，关闭下拉清空搜索值）。
 */
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { data, type RecordType } from './_compare/filter-search.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 对齐 antd（Name 带 filterMode:'tree'）
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
    // filterMode:'tree' + filterSearch:true。tree 模式输入搜索词高亮命中节点（不隐藏）。
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

// props 默认值：bordered=false / virtual=false（OFF 回 undefined scroll）。
// 筛选非受控（filterSearch 渲染的顶部搜索框由 FilterDropdown 内部管理），无子组件内部 state。
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
         OFF 时回 undefined，无 scroll。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

/**
 * filter-in-tree demo 的 data-grid 段（左栏）。
 *
 * props 驱动 `{ bordered, virtual }`（由 filter-in-tree.tsx 父组件传）：
 * - bordered：表格边框开关（控制条驱动）。
 * - virtual：全局虚拟化开关。
 *
 * 自包含：含 `dgColumns`（Name filterMode:'tree' + filters 含 children + filterSearch +
 * onFilter name.includes / Age sorter / Address menu filters + filterSearch startsWith）+
 * `<Table>` JSX + 共用 `onChange` console.log。
 *
 * 筛选/排序瞬时态非受控（不传受控 sortOrder/filteredValue），由 Table 内部管理。列定义本身即非受控初始态
 * （Name/Age 无 defaultSortOrder，filters 初始全空）。
 */
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { data, type RecordType } from './_compare/filter-in-tree.shared'

// ---------------------------------------------------------------------------
// 列定义
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    filters: [
      { text: 'Joe', value: 'Joe' },
      {
        text: 'Category 1',
        value: 'Category 1',
        children: [
          { text: 'Yellow', value: 'Yellow' },
          { text: 'Pink', value: 'Pink' },
        ],
      },
      {
        text: 'Category 2',
        value: 'Category 2',
        children: [
          { text: 'Green', value: 'Green' },
          { text: 'Black', value: 'Black' },
        ],
      },
    ],
    filterMode: 'tree',
    filterSearch: true,
    onFilter: (value, record) => record.name.includes(value as string),
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
// onChange（console.log 各参数）
// ---------------------------------------------------------------------------

const onChange: DgTableProps<RecordType>['onChange'] = (
  pagination,
  filters,
  sorter,
  extra,
) => {
  // eslint-disable-next-line no-console
  console.log('filter-in-tree demo onChange params:', {
    pagination,
    filters,
    sorter,
    extra,
  })
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// props 默认值：bordered=false / virtual=false（OFF 回 undefined scroll）。
// 筛选/排序非受控，由 Table 内部管理（Name/Age 无 defaultSortOrder，filters 初始全空——全表数据可见）。
export default function FilterInTreeDg({
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
      /* pagination={{}}：对齐右栏 antd 默认分页条（antd 对任意行数都渲染 .ant-pagination，
         即便行数 ≤ pageSize 也会渲染 disabled 态分页条；data-grid 不传=不渲染）。 */
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         pane 限高，虚拟窗口才有滚动区）；OFF 时回 undefined，无 scroll。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

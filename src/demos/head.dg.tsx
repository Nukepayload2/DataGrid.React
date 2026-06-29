/**
 * head demo 的 data-grid 段（左栏）。
 *
 * - props 驱动 `{ bordered, virtual, remountKey }`（由父组件传）：
 *   bordered：表格边框开关（控制条驱动）；virtual：全局虚拟化开关；
 *   remountKey：Reset 按钮递增的 key，应用到内部 `<Table key=...>` 强制 remount 清空
 *   排序/筛选草稿与激活态（head demo 排序/筛选非受控，不能通过受控 setState 重置）。
 * - 自包含：含 `dgColumns`（Name sorter+filters+sortDirections / Age sorter+defaultSortOrder /
 *   Address filters）+ `<Table>` JSX + 共用 `onChange` console.log。
 * - Name 列 sorter 按名字长度 + sortDirections:['descend'] + filters（含 Submenu children，
 *   扁平化为顶层项）+ onFilter；Age 列 sorter + defaultSortOrder:'descend'；
 *   Address 列 filters（默认多选 Checkbox）+ onFilter。Table 级 showSorterTooltip:{target:'sorter-icon'}。
 *
 * 排序/筛选 state 自管（非受控）：head demo 排序/筛选是 antd 原生非受控语义（不传受控
 * sortOrder/filteredValue），状态由 Table 内部管理。Reset 通过 React key remount 强制重建，
 * 故子组件不需要排序/筛选 state props——列定义即非受控初始态（Age defaultSortOrder:'descend'
 * 是初始值而非受控值）。
 */
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { data, type RecordType } from './_compare/head.shared'

// ---------------------------------------------------------------------------
// 列定义
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    showSorterTooltip: { target: 'full-header' },
    // 筛选（与排序共存）。filters 含 children（Submenu），本 demo 扁平化为顶层项参与勾选。
    filters: [
      { text: 'Joe', value: 'Joe' },
      { text: 'Jim', value: 'Jim' },
      {
        text: 'Submenu',
        value: 'Submenu',
        children: [
          { text: 'Green', value: 'Green' },
          { text: 'Black', value: 'Black' },
        ],
      },
    ],
    // 筛选判定：名字以 value 开头（与 antd demo 一致）。
    onFilter: (value, record) => record.name.indexOf(value as string) === 0,
    sorter: (a, b) => a.name.length - b.name.length,
    sortDirections: ['descend'],
  },
  {
    title: 'Age',
    dataIndex: 'age',
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    // 筛选（默认多选 Checkbox，与 antd 官方 head demo 逐字一致——官方此列无 filterMultiple）。
    filters: [
      { text: 'London', value: 'London' },
      { text: 'New York', value: 'New York' },
    ],
    onFilter: (value, record) =>
      record.address.indexOf(value as string) === 0,
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
  console.log('head demo onChange params:', { pagination, filters, sorter, extra })
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// props 默认值均为合理有效初值：bordered=false（antd head demo 原本无边框）；
// virtual=false（OFF 回 undefined scroll）；remountKey=0（初始 key，正常挂载）。
// 排序/筛选非受控，由 Table 内部管理（Age defaultSortOrder:'descend' 初始降序有效）。
export default function HeadDg({
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
      showSorterTooltip={{ target: 'sorter-icon' }}
      bordered={bordered}
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         pane 限高，虚拟窗口才有滚动区）；OFF 时回 undefined。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

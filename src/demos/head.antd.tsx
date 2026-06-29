/**
 * head demo 的 antd 段（右栏）。
 *
 * - props 驱动 `{ bordered, virtual, remountKey }`（与左栏 dg 子组件同款签名）：
 *   remountKey：Reset 按钮递增的 key，应用到内部 `<AntdTable key=...>` 强制 remount 清空
 *   排序/筛选草稿与激活态（head demo 排序/筛选非受控，不能通过受控 setState 重置）。
 * - 自包含：含 `antdColumns`（Name sorter+filters+sortDirections / Age sorter+defaultSortOrder /
 *   Address filters）+ `<AntdTable>` JSX + 共用 `onChange` console.log。
 * - 忠实复刻 antd head demo：antd 原生 sorter/filters/onFilter/filterMultiple + antd 原生 filter
 *   下拉 Checkbox/Radio + 确定/重置。Table 级 showSorterTooltip:{target:'sorter-icon'}。
 *
 * 排序/筛选 state 自管（非受控）：同左栏 dg 子组件，排序/筛选是 antd 原生非受控语义，
 * 状态由 Table 内部管理。Reset 通过 React key remount 强制重建，子组件不需要排序/筛选 state props。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/head.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 忠实复刻 antd head demo（逐字一致）
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    showSorterTooltip: { target: 'full-header' },
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
    filters: [
      { text: 'London', value: 'London' },
      { text: 'New York', value: 'New York' },
    ],
    onFilter: (value, record) =>
      record.address.indexOf(value as string) === 0,
  },
]

// ---------------------------------------------------------------------------
// onChange（与 dg 子组件共用同一个 console.log 形态）
// ---------------------------------------------------------------------------

const onChange: TableProps<RecordType>['onChange'] = (
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

// props 默认值同左栏 dg（合理有效初值）。
export default function HeadAntd({
  bordered = false,
  virtual = false,
  remountKey = 0,
}: {
  bordered: boolean
  virtual: boolean
  remountKey: number
}) {
  return (
    <AntdTable<RecordType>
      key={`antd-${remountKey}`}
      columns={antdColumns}
      dataSource={data}
      onChange={onChange}
      showSorterTooltip={{ target: 'sorter-icon' }}
      bordered={bordered}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且表头/默认
         分页画在 scroll.y 之外，需扣除表头~55 与分页条~64 → 约 280 才能塞进 pane 限高；
         OFF 时回 undefined）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}

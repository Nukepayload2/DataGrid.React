/**
 * reset-filter demo 的 data-grid 段（左栏）。
 *
 * props 驱动 `{ filteredInfo, sortedInfo, bordered, virtual, onChange }`（由 reset-filter.tsx
 * 父组件传）：
 * - filteredInfo / sortedInfo：受控筛选/排序真理源（父持有，控制条三按钮 + onChange 共同写回）。
 * - bordered：表格边框开关（控制条驱动）。
 * - virtual：全局虚拟化开关。
 * - onChange：写回父级共享 state 的回调（两栏共用同一份 state → 两侧受控同步）。
 *
 * 自包含：含 `buildDgColumns(filteredInfo, sortedInfo)`（受控 filteredValue/sortOrder + ellipsis +
 * 三列均带 key）+ `<Table>` JSX。中文 locale 内联在子组件内（左栏文案验证面）。排序/筛选全部受控，
 * 外部 state 是唯一真理源。
 */
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { data, type RecordType } from './_compare/reset-filter.shared'

// 受控 state 类型（本子文件内部独立声明，对齐 antd demo 的 Filters/Sorts 推导）。
type OnChange = NonNullable<DgTableProps<RecordType>['onChange']>
type Filters = Parameters<OnChange>[1]
type GetSingle<T> = T extends (infer U)[] ? U : never
type Sorts = GetSingle<Parameters<OnChange>[2]>

// ---------------------------------------------------------------------------
// 受控列定义 —— 依赖外部 filteredInfo/sortedInfo
// ---------------------------------------------------------------------------

/** 构造 data-grid 受控列（依赖外部 filteredInfo/sortedInfo）。 */
function buildDgColumns(
  filteredInfo: Filters,
  sortedInfo: Sorts,
): ColumnType<RecordType>[] {
  return [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      filters: [
        { text: 'Joe', value: 'Joe' },
        { text: 'Jim', value: 'Jim' },
      ],
      // 受控 filteredValue：外部 filteredInfo.name 驱动；无则 null（不清筛选）。
      filteredValue: filteredInfo.name || null,
      onFilter: (value, record) => record.name.includes(value as string),
      sorter: (a, b) => a.name.length - b.name.length,
      // 受控 sortOrder：仅当 sortedInfo.columnKey === 'name' 时取 order，否则 null。
      sortOrder: sortedInfo.columnKey === 'name' ? sortedInfo.order : null,
      // ellipsis：超长文本省略号 + title 提示；本 demo 三列均启用。
      ellipsis: true,
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      sorter: (a, b) => a.age - b.age,
      sortOrder: sortedInfo.columnKey === 'age' ? sortedInfo.order : null,
      ellipsis: true,
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      filters: [
        { text: 'London', value: 'London' },
        { text: 'New York', value: 'New York' },
      ],
      filteredValue: filteredInfo.address || null,
      onFilter: (value, record) => record.address.includes(value as string),
      sorter: (a, b) => a.address.length - b.address.length,
      sortOrder: sortedInfo.columnKey === 'address' ? sortedInfo.order : null,
      ellipsis: true,
    },
    // locale 文案验证追加列（左栏中文 / 右栏英文对照）。
    // Status：filterSearch=true → 下拉渲染搜索框，placeholder 应为「搜索」（filterSearchPlaceholder）。
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'active', value: 'active' },
        { text: 'inactive', value: 'inactive' },
        { text: 'pending', value: 'pending' },
      ],
      filteredValue: filteredInfo.status || null,
      onFilter: (value, record) => record.status === value,
      filterSearch: true,
      ellipsis: true,
    },
    // Tag：filterMode='tree'（filterMultiple 默认 true）→ 下拉渲染 tree 全选 Checkbox，
    // 文案应为「全选」（filterCheckAll）。
    {
      title: 'Tag',
      dataIndex: 'tag',
      key: 'tag',
      filters: [
        { text: 'vip', value: 'vip' },
        { text: 'normal', value: 'normal' },
      ],
      filteredValue: filteredInfo.tag || null,
      onFilter: (value, record) => record.tag === value,
      filterMode: 'tree',
      ellipsis: true,
    },
    // Empty：filters=[] 空数组 → 下拉无筛选项，渲染空占位「无筛选」（filterEmptyText）。
    {
      title: 'Empty',
      dataIndex: 'empty',
      key: 'empty',
      filters: [],
      filteredValue: filteredInfo.empty || null,
      onFilter: () => false,
      ellipsis: true,
    },
  ]
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// props 默认值：filteredInfo={} / sortedInfo={}（各列受控态 null，无筛选无排序）/ bordered=false /
// virtual=false（OFF 回 undefined scroll）/ onChange 省略时不写回 state（无害）。
// 排序/筛选全部受控（由 filteredInfo/sortedInfo 驱动），无子组件内部 state。
export default function ResetFilterDg({
  filteredInfo = {},
  sortedInfo = {},
  bordered = false,
  virtual = false,
  onChange,
}: {
  filteredInfo: Filters
  sortedInfo: Sorts
  bordered: boolean
  virtual: boolean
  onChange?: OnChange
}) {
  const dgColumns = buildDgColumns(filteredInfo, sortedInfo)

  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      onChange={onChange}
      bordered={bordered}
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         pane 限高，虚拟窗口才有滚动区）；OFF 时回 undefined，无 scroll。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
      // 左栏传中文 locale（文案验证面），右栏 antd 不传（保持英文，对照）。
      locale={{
        filterConfirm: '确定',
        filterReset: '重置',
        filterEmptyText: '无筛选',
        filterSearchPlaceholder: '搜索',
        filterCheckAll: '全选',
      }}
    />
  )
}

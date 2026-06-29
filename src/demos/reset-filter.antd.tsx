/**
 * reset-filter demo 的 antd 段（右栏），从 reset-filter.tsx 拆出。
 *
 * - props 驱动 `{ filteredInfo, sortedInfo, bordered, virtual, onChange }`（与左栏 dg 子组件同款签名）：
 *   * filteredInfo / sortedInfo：受控筛选/排序真理源（父持有，控制条三按钮 + onChange 共同写回）。
 *   * bordered：表格边框开关（控制条驱动）。
 *   * virtual：全局虚拟化开关。
 *   * onChange：写回父级共享 state 的回调（两栏共用同一份 state → 两侧受控同步）。
 * - 自包含：含 `buildAntdColumns(filteredInfo, sortedInfo)`（受控 filteredValue/sortOrder + ellipsis +
 *   三列均带 key）+ `<AntdTable>` JSX。
 * - 忠实复刻 antd reset-filter demo：antd 原生受控 filteredValue/sortOrder + antd Button 外部按钮重置。
 *
 * === ★ 受控组合（S1 + S3）===
 * 同左栏 dg 子组件：受控 filteredValue/sortOrder 由父级 filteredInfo/sortedInfo 驱动；排序/筛选全部
 * 受控，无子组件内部 state。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/reset-filter.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/reset-filter.shared'

// 受控 state 类型（本子文件内部独立声明，对齐 dg 子文件的 Filters/Sorts 推导）。
type OnChange = NonNullable<TableProps<RecordType>['onChange']>
type Filters = Parameters<OnChange>[1]
type GetSingle<T> = T extends (infer U)[] ? U : never
type Sorts = GetSingle<Parameters<OnChange>[2]>

// ---------------------------------------------------------------------------
// 受控列定义 —— 忠实复刻 antd reset-filter demo（逐字一致）
// ---------------------------------------------------------------------------

/** 构造 antd 受控列（依赖同一份 filteredInfo/sortedInfo）。 */
function buildAntdColumns(
  filteredInfo: Filters,
  sortedInfo: Sorts,
): NonNullable<TableProps<RecordType>['columns']> {
  return [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      filters: [
        { text: 'Joe', value: 'Joe' },
        { text: 'Jim', value: 'Jim' },
      ],
      filteredValue: filteredInfo.name || null,
      onFilter: (value, record) => record.name.includes(value as string),
      sorter: (a, b) => a.name.length - b.name.length,
      sortOrder: sortedInfo.columnKey === 'name' ? sortedInfo.order : null,
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
    // ★ locale 对照列（右栏不传 locale → 英文，与左栏中文对照）。
    // Status：filterSearch=true → antd 下拉渲染搜索框，placeholder='Search'（对照左栏「搜索」）。
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
    // Tag：filterMode='tree' → antd 下拉渲染 tree 全选 Checkbox，文案='Select all'（对照「全选」）。
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
    // Empty：filters=[] 空数组 → antd 下拉空占位='No filters'（对照「无筛选」）。
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

// ★ props 默认值同左栏 dg（合理有效初值，见 dg 子文件注释）。
export default function ResetFilterAntd({
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
  const antdColumns = buildAntdColumns(filteredInfo, sortedInfo)

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

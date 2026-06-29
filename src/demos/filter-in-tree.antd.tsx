/**
 * filter-in-tree demo 的 antd 段（右栏），从 filter-in-tree.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（与左栏 dg 子组件同款签名）。
 * - 自包含：含 `antdColumns`（Name filterMode:'tree' + filters 含 children + filterSearch +
 *   onFilter name.includes / Age sorter / Address menu filters + filterSearch startsWith）+
 *   `<AntdTable>` JSX + 共用 `onChange` console.log。
 * - 忠实复刻 antd filter-in-tree demo（antd 原生 filterMode:'tree' + antd 原生 <Tree checkable>
 *   父子联动 + filterSearch + menu 共存）。
 *
 * === ★ 筛选/排序 state 自管（非受控）===
 * 同左栏 dg 子组件：筛选/排序是 antd 原生非受控语义，状态由 Table 内部管理。子组件不需要
 * 筛选/排序 state props。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/filter-in-tree.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import { data, type RecordType } from './_compare/filter-in-tree.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 忠实复刻 antd filter-in-tree demo（逐字一致）
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
        children: [
          {
            text: 'Yellow',
            value: 'Yellow',
          },
          {
            text: 'Pink',
            value: 'Pink',
          },
        ],
      },
      {
        text: 'Category 2',
        value: 'Category 2',
        children: [
          {
            text: 'Green',
            value: 'Green',
          },
          {
            text: 'Black',
            value: 'Black',
          },
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

const onChange: TableProps<RecordType>['onChange'] = (
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

// ★ props 默认值同左栏 dg（合理有效初值，见 dg 子文件注释）。
export default function FilterInTreeAntd({
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
         分页画在 scroll.y 之外，需扣除表头~55 与分页条~64 → 约 280 才能塞进 ~400px pane；
         OFF 时回 undefined，行为与改造前一致）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}

/**
 * grouping-columns demo 的 antd 段（右栏），从 grouping-columns.tsx 拆出。
 *
 * - props 驱动 `{ bordered, size, virtual, data }`（由 grouping-columns.tsx 父组件传）。
 * - 自包含：含 `antdColumns`（多级表头 children 嵌套 + Name fixed:left + filters/onFilter +
 *   Age sorter + Gender fixed:right）+ `<AntdTable>` JSX。
 * - 忠实复刻 antd 官方 grouping-columns demo：filters + Age sorter + fixed:left/right +
 *   size="medium" + scroll={{x:'calc(700px + 50%)', y:47*5}}（固定表头 5 行高纵滚）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/grouping-columns.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { type DataType, initialData } from './_compare/grouping-columns.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 grouping-columns demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<DataType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 100,
    fixed: 'left',
    filters: [
      {
        text: 'Joe',
        value: 'Joe',
      },
      {
        text: 'John',
        value: 'John',
      },
    ],
    onFilter: (value, record) => record.name.indexOf(value as string) === 0,
  },
  {
    title: 'Other',
    children: [
      {
        title: 'Age',
        dataIndex: 'age',
        key: 'age',
        width: 150,
        sorter: (a, b) => a.age - b.age,
      },
      {
        title: 'Address',
        children: [
          {
            title: 'Street',
            dataIndex: 'street',
            key: 'street',
            width: 150,
          },
          {
            title: 'Block',
            children: [
              {
                title: 'Building',
                dataIndex: 'building',
                key: 'building',
                width: 100,
              },
              {
                title: 'Door No.',
                dataIndex: 'number',
                key: 'number',
                width: 100,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Company',
    children: [
      {
        title: 'Company Address',
        dataIndex: 'companyAddress',
        key: 'companyAddress',
        width: 200,
      },
      {
        title: 'Company Name',
        dataIndex: 'companyName',
        key: 'companyName',
      },
    ],
  },
  {
    title: 'Gender',
    dataIndex: 'gender',
    key: 'gender',
    width: 80,
    fixed: 'right',
  },
]

export default function GroupingColumnsAntd({
  bordered = true,
  size = 'medium',
  virtual = false,
  data = initialData,
}: {
  bordered: boolean
  size: 'medium' | 'large'
  virtual: boolean
  data: DataType[]
}) {
  return (
    <AntdTable<DataType>
      columns={antdColumns}
      dataSource={data}
      bordered={bordered}
      size={size}
      /* 全局虚拟化开关接入：ON 时叠加 virtual=true + scroll.y:300（antd 默认渲染分页条，
         扣除表头~55 + 分页条~50 → 约 300 塞进 split pane 限高）。
         ★ antd virtual 要求 scroll.x 必须为数字（calc 字符串会抛 "scroll.x must be number"
         error），故 ON 时 x 改传数字 2000（按列宽估算：Name100+Age150+Street150+Building100+
         Door100+CompAddr200+Gender80 ≈ 880，加 calc(700px+50%) 扩展，取保险值 2000 足够触发横滚）；
         OFF 时回原 {x:'calc(700px+50%)', y:47*5}，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { x: 2000, y: 300 } : { x: 'calc(700px + 50%)', y: 47 * 5 }}
    />
  )
}

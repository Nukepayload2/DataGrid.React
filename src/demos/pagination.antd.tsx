/**
 * pagination demo 的 antd 段（右栏），从 pagination.tsx 拆出。
 *
 * - props 驱动 `{ placement, virtual }`（与左栏 dg 子组件同款签名）。
 * - 自包含：含 `antdColumns`（Name render `<a>` / Age / Address / Tags Tag / Action Space）+
 *   `<AntdTable>` JSX。
 * - 忠实复刻 antd pagination demo 列定义 + 同款 pagination + 同款 placement 单元素数组。
 *
 * === ★ 分页位置 state 提升父（受控）===
 * 同左栏 dg 子组件：placement 必须留父（父渲染顶部 Radio.Group 控制条需直接读写它）。
 * 子组件用默认值 'bottomEnd'（antd Table 真实默认）兜底编辑模式 propsFor 超集不含 placement 的情况。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/pagination.shared'`）。
 */
import { Flex, Space, Table as AntdTable, Tag } from 'antd'
import type { TableProps } from 'antd'
import {
  data,
  type RecordType,
  type TablePaginationPlacement,
} from './_compare/pagination.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 忠实复刻 antd pagination demo 列定义
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (tags: string[]) => (
      <Flex gap="small" align="center" wrap>
        {tags.map((tag) => {
          let color = tag.length > 5 ? 'geekblue' : 'green'
          if (tag === 'kawaii') {
            color = 'volcano'
          }
          return (
            <Tag color={color} key={tag}>
              {tag.toUpperCase()}
            </Tag>
          )
        })}
      </Flex>
    ),
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="medium">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    ),
  },
]

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// ★ props 默认值同左栏 dg（合理有效初值，见 dg 子文件注释）。
export default function PaginationAntd({
  placement = 'bottomEnd',
  virtual = false,
}: {
  placement: TablePaginationPlacement
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      pagination={{ placement: [placement] }}
      dataSource={data}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 分页条画在 scroll.y 之外，
         需扣除表头~55 与分页条~64 → 约 280 才能塞进 ~400px pane；OFF 时回 undefined）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}

/**
 * pagination demo 的 data-grid 段（左栏），从 pagination.tsx 拆出。
 *
 * - props 驱动 `{ placement, virtual }`（由 pagination.tsx 父组件传）：
 *   * placement：单翻页器位置（真理源在父——父渲染顶部 Radio.Group 控制条，6 位置 + none 互斥）。
 *     子组件把它包成 `placement: [placement]` 单元素数组传给 Table pagination（v6 数组语义）。
 *   * virtual：全局虚拟化开关。
 * - 自包含：含 `dgColumns`（Name render `<a>` / Age / Address / Tags Tag / Action Space）+ `<Table>` JSX。
 * - 行为与改造前一致：显式传 `pagination={{ placement: [placement] }}` 启用分页（data-grid 默认不分页，
 *   §9 已知差异），单元素数组 = 单翻页器在该位置。
 *
 * === ★ 分页位置 state 提升父（受控）===
 * placement 必须留父——父渲染顶部 Radio.Group 控制条需直接读写它；同一 state 驱动两侧同步。
 * 子组件接 placement 后包成单元素数组传给 Table（受控语义由 Table pagination 对象消费）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 不含 placement，子组件用默认值
 * 'bottomEnd'（antd Table 真实默认：单翻页器右下角）→ 合理有效初值，分页器正常渲染。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'../table'` / `'./_compare/pagination.shared'`），源码可原样展示无需路径改写。
 */
import { Flex, Space, Tag } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import {
  data,
  type RecordType,
  type TablePaginationPlacement,
} from './_compare/pagination.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
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
      <Space size="middle">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    ),
  },
]

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// ★ props 默认值均为合理有效初值（坑5+坑7）：
// - placement='bottomEnd'（antd Table 真实默认：单翻页器右下角——非 'none' 否则无分页器空演示）。
//   编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 不含 placement，子组件用此默认值
//   → 分页器在右下角正常渲染（合理有效初值）。
// - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
export default function PaginationDg({
  placement = 'bottomEnd',
  virtual = false,
}: {
  placement: TablePaginationPlacement
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      pagination={{ placement: [placement] }}
      dataSource={data}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         限高，分页条在滚动区下方，wrapper 含分页高）；OFF 时回 undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

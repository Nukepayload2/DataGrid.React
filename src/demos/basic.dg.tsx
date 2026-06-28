/**
 * basic demo 的 data-grid 段（左栏），从 basic.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 basic.tsx 父组件传）。
 * - 自包含：含 `dgColumns` + `<Table>` JSX + `InlineTag` 本地辅助。
 * - 行为与改造前一致：内联最小 Tag、Action 用 `<span>` + flex。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/basic.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, tagColor, type RecordType } from './_compare/basic.shared'

/**
 * 左栏内联最小 Tag（data-grid 不依赖 antd Tag；视觉等价 antd 预设色）。
 * 改造前行为保留。
 */
const inlineTagColorMap: Record<string, string> = {
  geekblue: '#2f54eb',
  green: '#389e0d',
  volcano: '#fa541c',
}

function InlineTag({
  color,
  children,
}: {
  color: string
  children: import('react').ReactNode
}) {
  const bg = color in inlineTagColorMap ? inlineTagColorMap[color] : color
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0 7px',
        fontSize: 12,
        lineHeight: '20px',
        borderRadius: 4,
        color: bg,
        background: `${bg}1a`, // ~10% alpha
        border: `1px solid ${bg}33`,
        marginRight: 4,
      }}
    >
      {children}
    </span>
  )
}

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
    render: (_, { tags }) => (
      <span
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {tags.map((tag) => (
          <InlineTag color={tagColor(tag)} key={tag}>
            {tag.toUpperCase()}
          </InlineTag>
        ))}
      </span>
    ),
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <span style={{ display: 'inline-flex', gap: 8 }}>
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </span>
    ),
  },
]

export default function BasicDg({
  bordered,
  virtual,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      bordered={bordered}
      /* pagination={{}}：对齐 antd 默认分页条（antd 6.4.4 对任意行数都渲染 .ant-pagination，
         即便行数 ≤ pageSize 也会渲染 disabled 态分页条；data-grid 不传=不渲染）。 */
      pagination={{}}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

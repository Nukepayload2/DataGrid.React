/**
 * basic demo 的 antd 段（右栏），从 basic.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 basic.tsx 父组件传）。
 * - 自包含：含 `antdColumns` + `<AntdTable>` JSX。
 * - 忠实复刻 antd basic demo：antd `<Tag>` + `<Flex>` + `<Space>`。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/basic.shared'`）。
 */
import { Flex, Space, Table as AntdTable, Tag } from 'antd'
import type { TableProps } from 'antd'
import { data, tagColor, type RecordType } from './_compare/basic.shared'

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
    render: (_, { tags }) => (
      <Flex gap="small" align="center" wrap>
        {tags.map((tag) => (
          <Tag color={tagColor(tag)} key={tag}>
            {tag.toUpperCase()}
          </Tag>
        ))}
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

export default function BasicAntd({
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
      bordered={bordered}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且表头/默认
         分页画在 scroll.y 之外，需扣除表头~55 与分页条~64 → 约 280 才能塞进 ~400px pane；
         OFF 时回 undefined，行为与改造前一致）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}

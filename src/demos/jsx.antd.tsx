/**
 * jsx demo 的 antd 段（右栏），从 jsx.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 jsx.tsx 父组件传）。
 * - 自包含：用 JSX `<Table.Column>`/`<Table.ColumnGroup>` 子元素声明列 + 本地渲染（Tag/Flex/Space）。
 * - 忠实复刻 antd jsx demo：`const { Column, ColumnGroup } = AntdTable` 从 antd Table 解构，
 *   antd `<Flex>`/`<Tag>`/`<Space>`，Space 用 `size="medium"`（antd demo 原样，v6 别名兼容）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/jsx.shared'`）。
 */
import { Flex, Space, Table as AntdTable, Tag } from 'antd'
import { data, tagColor, type RecordType } from './_compare/jsx.shared'

// 右栏：从 antd Table 解构 Column/ColumnGroup（忠实 antd demo）。
const { Column: AntdColumn, ColumnGroup: AntdColumnGroup } = AntdTable

export default function JsxAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      dataSource={data}
      bordered={bordered}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且两侧均有分页条，
         需扣除表头~55 与分页条~64 → 约 280 才能塞进 ~400px pane；OFF 时回 undefined，
         行为与改造前一致）。virtual/scroll 加在 <Table> 上。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    >
      <AntdColumnGroup title="Name">
        <AntdColumn title="First Name" dataIndex="firstName" key="firstName" />
        <AntdColumn title="Last Name" dataIndex="lastName" key="lastName" />
      </AntdColumnGroup>
      <AntdColumn title="Age" dataIndex="age" key="age" />
      <AntdColumn title="Address" dataIndex="address" key="address" />
      <AntdColumn
        title="Tags"
        dataIndex="tags"
        key="tags"
        render={(tags: string[]) => (
          <Flex gap="small" align="center" wrap>
            {tags.map((tag) => (
              <Tag color={tagColor(tag)} key={tag}>
                {tag.toUpperCase()}
              </Tag>
            ))}
          </Flex>
        )}
      />
      <AntdColumn
        title="Action"
        key="action"
        render={(_: any, record: RecordType) => (
          <Space size="medium">
            <a>Invite {record.lastName}</a>
            <a>Delete</a>
          </Space>
        )}
      />
    </AntdTable>
  )
}

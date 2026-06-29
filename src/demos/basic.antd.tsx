/**
 * basic demo 的 antd 段（右栏）。
 *
 * props：`{ bordered, virtual }`（与左栏 dg 子组件同款）。忠实复刻 antd basic demo：
 * antd `<Tag>` + `<Flex>` + `<Space>`。
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
      /* 虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd virtual 需数字 y，扣除表头~55 与
         分页条~64 塞进 ~400px pane）。详见 docs/design-notes/virtualization.md */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}

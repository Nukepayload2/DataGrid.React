/**
 * jsx demo 的 data-grid 段（左栏），用 JSX `<Table.Column>`/`<Table.ColumnGroup>` 子元素声明列。
 * props 驱动 `{ bordered, virtual }`（由 jsx.tsx 父组件传）。
 */
import { Flex, Space, Tag } from 'antd'
import { Table } from '../table'
import { data, tagColor, type RecordType } from './_compare/jsx.shared'

// 左栏：从 data-grid Table 解构 Column/ColumnGroup（对齐 antd demo 写法）。
const { Column, ColumnGroup } = Table

export default function JsxDg({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      dataSource={data}
      bordered={bordered}
      /* pagination={{}}：对齐 antd 默认分页条（antd 对任意行数都渲染 .ant-pagination，即便行数
         ≤ pageSize 也会渲染 disabled 态分页条；data-grid 不传=不渲染）。 */
      pagination={{}}
      /* 虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         给的 400px 限高，虚拟窗口才有滚动区）；OFF 时回 undefined。
         virtual/scroll 加在 <Table> 上（JSX 子元素 Column/ColumnGroup 仅声明列，不接虚拟化）。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    >
      <ColumnGroup title="Name">
        <Column title="First Name" dataIndex="firstName" key="firstName" />
        <Column title="Last Name" dataIndex="lastName" key="lastName" />
      </ColumnGroup>
      <Column title="Age" dataIndex="age" key="age" />
      <Column title="Address" dataIndex="address" key="address" />
      <Column
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
      <Column
        title="Action"
        key="action"
        render={(_: any, record: RecordType) => (
          <Space size="middle">
            <a>Invite {record.lastName}</a>
            <a>Delete</a>
          </Space>
        )}
      />
    </Table>
  )
}

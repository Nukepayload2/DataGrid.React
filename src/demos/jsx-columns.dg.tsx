import { Flex, Space, Tag } from 'antd'
import { Table } from '../table'
import { data, tagColor, type RecordType } from './_compare/jsx-columns.shared'

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
      pagination={{}}
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

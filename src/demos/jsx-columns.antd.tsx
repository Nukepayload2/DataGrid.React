import { Flex, Space, Table as AntdTable, Tag } from 'antd'
import { data, tagColor, type RecordType } from './_compare/jsx-columns.shared'

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

import { Flex, Table as AntdTable, Tag, theme } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/resizable-columns.shared'

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 150,
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: 80,
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
          <Tag color="blue" key={tag}>
            {tag.toUpperCase()}
          </Tag>
        ))}
      </Flex>
    ),
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
  },
]

export default function ResizableAntd({
  virtual = false,
}: {
  virtual: boolean
}) {
  const { token } = theme.useToken()

  return (
    <>
      <div
        style={{
          padding: 12,
          background: token.colorWarningBg,
          border: `1px solid ${token.colorWarningBorder}`,
          borderRadius: 6,
          marginBottom: 12,
          fontSize: 12,
          color: token.colorText,
          lineHeight: 1.7,
        }}
      >
        <strong>右栏仅作静态基线参照。</strong>
        <br />
        它和左栏使用同一组数据与列定义，但不提供列宽拖拽，便于直接观察拖动前后的差异。
      </div>
      <AntdTable<RecordType>
        columns={antdColumns}
        dataSource={data}
        virtual={virtual}
        scroll={virtual ? { y: 340 } : undefined}
        pagination={false}
      />
    </>
  )
}

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
        <strong>antd 6.4.4 Table 无原生列宽拖拽（resizable）能力。</strong>
        右栏仅 data-grid 演示；此处放一张静态 antd Table 作基线参照（同数据/同列，
        无拖拽手柄）。如需在 antd 下做列宽拖拽，社区常用 <code>react-resizable</code>
        等第三方 wrapper（非 antd 原生，本 demo 不复刻）。
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

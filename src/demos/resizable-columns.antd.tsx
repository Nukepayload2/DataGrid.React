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
        <br />
        本演示不在右栏造假手柄。社区曾用{' '}
        <a
          href="https://github.com/react-grid-layout/react-resizable"
          target="_blank"
          rel="noreferrer"
        >
          react-resizable
        </a>{' '}
        等第三方 wrapper 凑出可拖拽效果，但{' '}
        <a
          href="https://github.com/ant-design/ant-design/issues/56356"
          target="_blank"
          rel="noreferrer"
        >
          #56356
        </a>{' '}
        记录了它的三连故障（卡顿 / 位置漂移 / 松开后卡在拖拽态），维护者确认「这个库已经多年不维护」
        并<strong>下掉了官网可伸缩列 demo</strong>；RFC{' '}
        <a
          href="https://github.com/ant-design/ant-design/discussions/48152"
          target="_blank"
          rel="noreferrer"
        >
          #48152
        </a>{' '}
        2024-03 提出至今未落地。右栏仅放一张静态 antd Table 作基线参照（同数据 / 同列，无任何手柄）。
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

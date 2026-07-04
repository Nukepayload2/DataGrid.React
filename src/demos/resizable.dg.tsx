import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/resizable.shared'

function InlineTag({
  color,
  children,
}: {
  color: string
  children: import('react').ReactNode
}) {
  const bg = color
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
      <span
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {tags.map((tag) => (
          <InlineTag color="#1677ff" key={tag}>
            {tag.toUpperCase()}
          </InlineTag>
        ))}
      </span>
    ),
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
  },
]

export default function ResizableDg({
  columnResizeMode = 'ResizeLeft',
  minWidth = 30,
  maxWidth = 400,
  virtual = false,
}: {
  columnResizeMode: 'Disabled' | 'ResizeLeft' | 'ResizeSibling'
  minWidth: number
  maxWidth: number
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
      pagination={false}
      gridOptions={{
        columnResizeMode,
        resizableMinWidth: minWidth,
        resizableMaxWidth: maxWidth,
      }}
    />
  )
}

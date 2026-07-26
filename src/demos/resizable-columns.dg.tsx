import { useMemo } from 'react'
import { theme } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/resizable-columns.shared'

/**
 * 内联最小 Tag：视觉对齐 antd `<Tag color="blue">`（preset spot color），
 * 但用 `colorPrimary` 系列令牌而非裸 #1677ff——主题切换（colorPrimary 改色）自动跟随。
 */
function InlineTag({ children }: { children: import('react').ReactNode }) {
  const { token } = theme.useToken()
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0 7px',
        fontSize: 12,
        lineHeight: '20px',
        borderRadius: 4,
        color: token.colorPrimary,
        background: token.colorPrimaryBg,
        border: `1px solid ${token.colorPrimaryBorder}`,
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
    // fixed:'start' 演示「固定列 + 可拖拽」组合——Name 钉左缘不动，
    // 拖其他列边界时 Name 的固定偏移由 useStickyColumns 的 ResizeObserver 自动重算。
    // 依据：docs/features/columns/column-width.md「与各能力组合 → 固定列」。
    fixed: 'start',
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
          <InlineTag key={tag}>{tag.toUpperCase()}</InlineTag>
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
  const columns = useMemo(
    () =>
      dgColumns.map((column) => ({
        ...column,
        gridColumnOptions: {
          ...column.gridColumnOptions,
          minWidth,
          maxWidth,
        },
      })),
    [maxWidth, minWidth],
  )

  return (
    <Table<RecordType>
      columns={columns}
      dataSource={data}
      virtual={virtual}
      /* `scroll.x:'max-content'` 让表格横可滚，使 Name(fixed:'start') 可见地钉在左缘。
         虚拟开关接入：ON 时叠加 scroll.y:true（CSS 自适应 SplitDemo 400px 限高，
         虚拟窗口才有滚动区）。 */
      scroll={virtual ? { x: 'max-content', y: true } : { x: 'max-content' }}
      pagination={false}
      gridOptions={{
        columnResizeMode,
      }}
    />
  )
}

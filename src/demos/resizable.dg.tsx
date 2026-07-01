/**
 * resizable demo 的 data-grid 段（左栏）。
 *
 * props 驱动 `{ columnResizeMode, minWidth, maxWidth, virtual }`（由 resizable.tsx 父组件传）：
 *   * columnResizeMode：列宽拖拽模式（Disabled / ResizeLeft / ResizeSibling）。
 *   * minWidth：拖拽最小宽度约束（控制条 InputNumber，px）。
 *   * maxWidth：拖拽最大宽度约束（控制条 InputNumber，px）。
 *   * virtual：全局虚拟化开关。
 * 自包含：含 `dgColumns`（Name/Age 固定 width + Address/Tags/Description 无 width max-content）+
 * `<Table>` JSX + `InlineTag` 本地辅助。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/resizable.shared'

/**
 * 左栏内联最小 Tag（data-grid 不依赖 antd Tag；视觉等价 antd 预设色 blue）。
 */
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

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 150,
    render: (text) => <a>{text}</a>,
  },
  // 无 width 列：拖拽时首次 move 从 max-content 转为受控 px。
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
    // 不给 width → max-content；拖拽后转 px。
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

// props 默认值：columnResizeMode=ResizeLeft / minWidth=30 / maxWidth=400（与父控制条初值一致的有效约束范围）。
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
      /* virtual 开关 ON 时叠加 virtual=true + scroll:{y:true}（数据区域模式，CSS 自适应填满
         SplitDemo 给的 400px 限高，虚拟窗口才有滚动区）；OFF 时 scroll=undefined。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
      gridOptions={{
        columnResizeMode,
        resizableMinWidth: minWidth,
        resizableMaxWidth: maxWidth,
      }}
    />
  )
}

/**
 * resizable demo 的 data-grid 段（左栏），从 resizable.tsx 拆出。
 *
 * - props 驱动 `{ resizable, minWidth, maxWidth, virtual }`（由 resizable.tsx 父组件传）：
 *   * resizable：是否开启列宽拖拽（控制条 Switch）。
 *   * minWidth：拖拽最小宽度约束（控制条 InputNumber，px）。
 *   * maxWidth：拖拽最大宽度约束（控制条 InputNumber，px）。
 *   * virtual：全局虚拟化开关。
 * - 自包含：含 `dgColumns`（Name/Age 固定 width + Address/Tags/Description 无 width max-content）+
 *   `<Table>` JSX + `InlineTag` 本地辅助。
 * - 行为与改造前一致：`resizable` + `resizableMinWidth`/`resizableMaxWidth` 演示 pointer 拖拽改列宽
 *   + min/max 约束 + 部分列给 width / 部分不给（max-content → 首次拖拽转 px）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/resizable.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/resizable.shared'

/**
 * 左栏内联最小 Tag（data-grid 不依赖 antd Tag；视觉等价 antd 预设色 blue）。
 * 改造前行为保留。
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
// 左栏（data-grid）列定义 —— 行为与改造前一致
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

// ★ props 默认值合理有效初值：
// - resizable=true（默认开启拖拽，编辑模式未编辑侧仍可拖拽，行为正常）。
// - minWidth=30 / maxWidth=400（与父控制条初值一致，min/max 约束有效范围；非 0/异常值）。
// 编辑模式 SplitDemoPreview 的 propsFor 超集 {bordered,virtual,size,autoScroll} 不含
// resizable/minWidth/maxWidth，此时子组件用默认值 → 拖拽开启 + 合理约束（合理有效初值）。
export default function ResizableDg({
  resizable = true,
  minWidth = 30,
  maxWidth = 400,
  virtual = false,
}: {
  resizable: boolean
  minWidth: number
  maxWidth: number
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      /* 全局虚拟化开关接入：ON 时叠加 virtual=true + scroll:{y:true}（data-grid 数据区域模式，
         CSS 自适应填满 SplitDemo 给的 400px 限高，虚拟窗口才有滚动区）；
         OFF 时 scroll=undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
      gridOptions={{
        resizable,
        resizableMinWidth: minWidth,
        resizableMaxWidth: maxWidth,
      }}
    />
  )
}

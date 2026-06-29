/**
 * drag-sorting-handler demo 的 antd 段（右栏），从 drag-sorting-handler.tsx 拆出。
 *
 * === 拖拽 state 自管（子组件内）===
 * 与 drag-sorting-handler.dg.tsx 同构：拖拽 dataSource 全在子组件内自管（useState + onDragEnd
 * 的 arrayMove），两栏各自独立（原始 demo 决策「两栏独立」）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - bordered=false（无边框，对齐 antd drag-sorting-handler 默认）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 注意：本子组件不接 autoScroll（antd 无对应概念，仅左栏 data-grid 有 autoScrollOnDrag）。
 *
 * === 忠实复刻 antd 官方 drag-sorting-handler.tsx ===
 * `@dnd-kit/*` DndContext + restrictToVerticalAxis + SortableContext（verticalListSortingStrategy）
 * + RowContext.Provider 透传 setActivatorNodeRef/listeners 到 DragHandle，仅手柄触发拖拽
 * （Name/Age/Address 不触发）。★ 图标用内联 HolderOutlined SVG（与左栏共用 InlineHolderOutlined）——
 * 任务约束：项目未直接声明 @ant-design/icons 依赖（仅 antd 间接依赖，pnpm 严格隔离不可访问），
 * 右栏图标也走内联 SVG（与 custom-filter-panel/nested-table 约定一致）。dnd-kit 的 RowContext/
 * setActivatorNodeRef/listeners 透传机制完全保留（仅图标实现方式不同，功能等价 antd 官方 HolderOutlined）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'react'` / `'antd'` / `'@dnd-kit/core'` / `'@dnd-kit/modifiers'` / `'@dnd-kit/sortable'` /
 * `'./_compare/drag-sorting-handler.shared'`）。
 *
 * ★ type import（`import type { DragEndEvent } from '@dnd-kit/core'` 等）被 sucrase 编译时剥离，
 * require 表只需 value（namespace），故 scope.ts 只注入 @dnd-kit/* 的 value 不注 type。
 * ★ SyntheticListenerMap 类型来自 '@dnd-kit/core/dist/hooks/utilities'——sucrase 剥离 type import，
 * 实际运行时无需此模块，但为保险本子组件用本地内联类型（避免引入新 scope 条目）。
 */
import type { DragEndEvent } from '@dnd-kit/core'
import { DndContext } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import type { CSSProperties, HTMLAttributes } from 'react'
import type { FC, ReactNode } from 'react'
import { createContext, useContext, useMemo, useState } from 'react'
import { initialData, type RecordType } from './_compare/drag-sorting-handler.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）内联 HolderOutlined SVG —— 避免 import @ant-design/icons
// ---------------------------------------------------------------------------

/**
 * 内联 HolderOutlined（拖拽手柄"七点"图标）——避免直接依赖 @ant-design/icons（仅 antd 间接依赖）。
 * 与 antd HolderOutlined **逐字节一致**（viewBox + path 取自
 * `@ant-design/icons-svg/es/asn/HolderOutlined.js`：viewBox "64 64 896 896"，
 * 7 个圆点 path）；size 跟随父节点 font-size（1em）。
 */
function InlineHolderOutlined({ style }: { style?: CSSProperties }): ReactNode {
  return (
    <svg
      viewBox="64 64 896 896"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-0.125em', ...style }}
    >
      <path d="M300 276.5a56 56 0 1056-97 56 56 0 00-56 97zm0 284a56 56 0 1056-97 56 56 0 00-56 97zM640 228a56 56 0 10112 0 56 56 0 00-112 0zm0 284a56 56 0 10112 0 56 56 0 00-112 0zM300 844.5a56 56 0 1056-97 56 56 0 00-56 97zM640 796a56 56 0 10112 0 56 56 0 00-112 0z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// 右栏（antd）Row + RowContext + DragHandle —— 忠实复刻 antd 官方 drag-sorting-handler.tsx
// ---------------------------------------------------------------------------

// ★ SyntheticListenerMap 用本地等价类型（Record<string, Function>），避免引入新 scope 条目
// '@dnd-kit/core/dist/hooks/utilities'。sucrase 编译时剥离 type，运行时无副作用。
type SyntheticListenerMap = Record<string, (...args: unknown[]) => void> | undefined

interface RowContextProps {
  setActivatorNodeRef?: (element: HTMLElement | null) => void
  listeners?: SyntheticListenerMap
}

const RowContext = createContext<RowContextProps>({})

/** 右栏 DragHandle：通过 RowContext 拿 setActivatorNodeRef + listeners（仅手柄触发拖拽）。
 *  ★ 图标用内联 SVG（与左栏共用 InlineHolderOutlined）——任务约束：项目未直接声明
 *  @ant-design/icons 依赖（仅 antd 间接依赖，pnpm 严格隔离不可访问），右栏图标也走内联 SVG
 *  （与 custom-filter-panel/nested-table 约定一致）。dnd-kit 的 RowContext/setActivatorNodeRef/
 *  listeners 透传机制完全保留（仅图标实现方式不同，功能等价 antd 官方 HolderOutlined）。 */
const AntdDragHandle: FC = () => {
  const { setActivatorNodeRef, listeners } = useContext(RowContext)
  return (
    <Button
      type="text"
      size="small"
      icon={<InlineHolderOutlined />}
      style={{ cursor: 'move' }}
      ref={setActivatorNodeRef}
      {...listeners}
    />
  )
}

interface RowProps extends HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string
}

const Row: FC<RowProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props['data-row-key'] })

  const style: CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
  }

  const contextValue = useMemo<RowContextProps>(
    () => ({ setActivatorNodeRef, listeners }),
    [setActivatorNodeRef, listeners],
  )

  return (
    <RowContext.Provider value={contextValue}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes} />
    </RowContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<RecordType> = [
  { key: 'sort', align: 'center', width: 80, render: () => <AntdDragHandle /> },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
]

// ---------------------------------------------------------------------------
// 子组件（自管拖拽排序 state）
// ---------------------------------------------------------------------------

export default function DragSortingHandlerAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  // ★ 拖拽 dataSource 各自独立（两栏对照时互不干扰，按原始 demo 决策「两栏独立」）。
  const [dataSource, setDataSource] = useState<RecordType[]>(initialData)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      setDataSource((prevState) => {
        const activeIndex = prevState.findIndex((record) => record.key === active?.id)
        const overIndex = prevState.findIndex((record) => record.key === over?.id)
        return arrayMove(prevState, activeIndex, overIndex)
      })
    }
  }

  return (
    <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
      <SortableContext items={dataSource.map((i) => i.key)} strategy={verticalListSortingStrategy}>
        <AntdTable<RecordType>
          rowKey="key"
          components={{ body: { row: Row } }}
          columns={antdColumns}
          dataSource={dataSource}
          bordered={bordered}
          /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:300（antd 不认 true，数字像素高度）；
             OFF 时回 undefined，行为与改造前一致。 */
          virtual={virtual}
          scroll={virtual ? { y: 300 } : undefined}
        />
      </SortableContext>
    </DndContext>
  )
}

/**
 * drag-column-sorting demo 的 antd 段（右栏），从 drag-column-sorting.tsx 拆出。
 *
 * === 拖拽 state 自管（子组件内）===
 * 与 drag-column-sorting.dg.tsx 同构：拖拽 columns + dragIndex 全在子组件内自管
 * （useState + onDragEnd arrayMove columns + onDragOver setDragIndex），两栏各自独立
 * （原始 demo 决策「两栏独立」）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - bordered=false（无边框，对齐 antd drag-column-sorting 默认）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 注意：本子组件不接 autoScroll/columnReorder（antd 无对应概念，仅左栏 data-grid 有）。
 *
 * === 忠实复刻 antd 官方 drag-column-sorting.tsx ===
 * `@dnd-kit/*` DndContext + restrictToHorizontalAxis + SortableContext（horizontalListSortingStrategy）
 * + closestCenter + PointerSensor（distance:1）+ `components.header.cell = TableHeaderCell` useSortable
 * + `components.body.cell = TableBodyCell` + DragIndexContext borderInline 虚线指示 +
 * DragOverlay 预览（拖拽表头灰底）+ onDragEnd arrayMove + onDragOver setDragIndex。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'react'` / `'antd'` / `'@dnd-kit/core'` / `'@dnd-kit/modifiers'` / `'@dnd-kit/sortable'` /
 * `'./_compare/drag-column-sorting.shared'`）。
 *
 * ★ type import（`import type { DragEndEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core'`）
 * 被 sucrase 编译时剥离，require 表只需 value（namespace），故 scope.ts 只注入 @dnd-kit/* 的 value 不注 type。
 * ★ ReactNode / React 的 type-only import 同理剥离（本文件用 type ReactNode）。
 */
import type { DragEndEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable'
import { Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import type { CSSProperties, HTMLAttributes } from 'react'
import type { FC, ReactNode } from 'react'
import { createContext, useContext, useState } from 'react'
import { data, type RecordType } from './_compare/drag-column-sorting.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列拖拽组件 —— 忠实复刻 antd 官方 drag-column-sorting.tsx
// ---------------------------------------------------------------------------

interface HeaderCellProps extends HTMLAttributes<HTMLTableCellElement> {
  id: string
}

interface BodyCellProps extends HTMLAttributes<HTMLTableCellElement> {
  id: string
}

interface DragIndexState {
  active: UniqueIdentifier
  over: UniqueIdentifier | undefined
  direction?: 'left' | 'right'
}

const DragIndexContext = createContext<DragIndexState>({ active: -1, over: -1 })

/** 官方 dragActiveStyle：active 列灰底半透明、over 列 borderInline 虚线指示方向。 */
function dragActiveStyle(dragState: DragIndexState, id: string): CSSProperties {
  const { active, over, direction } = dragState
  let style: CSSProperties = {}
  if (active && active === id) {
    style = { backgroundColor: 'gray', opacity: 0.5 }
  } else if (over && id === over && active !== over) {
    style =
      direction === 'right'
        ? { borderInlineEnd: '1px dashed gray' }
        : { borderInlineStart: '1px dashed gray' }
  }
  return style
}

const TableBodyCell: FC<BodyCellProps> = (props) => {
  const dragState = useContext<DragIndexState>(DragIndexContext)
  return <td {...props} style={{ ...props.style, ...dragActiveStyle(dragState, props.id) }} />
}

const TableHeaderCell: FC<HeaderCellProps> = (props) => {
  const dragState = useContext(DragIndexContext)
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: props.id })
  const style: CSSProperties = {
    ...props.style,
    cursor: 'move',
    ...(isDragging ? { position: 'relative', zIndex: 9999, userSelect: 'none' } : {}),
    ...dragActiveStyle(dragState, props.id),
  }
  return <th {...props} ref={setNodeRef} style={style} {...attributes} {...listeners} />
}

// ---------------------------------------------------------------------------
// 右栏（antd）baseColumns —— 忠实复刻 antd demo
// ---------------------------------------------------------------------------

const antdBaseColumns: TableColumnsType<RecordType> = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Gender', dataIndex: 'gender' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Email', dataIndex: 'email' },
  { title: 'Address', dataIndex: 'address' },
]

// ---------------------------------------------------------------------------
// 子组件（自管拖拽排序 state）
// ---------------------------------------------------------------------------

export default function DragColumnSortingAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  // ★ 列拖拽各自独立（两栏对照时互不干扰，按原始 demo 决策「两栏独立」）。
  const [dragIndex, setDragIndex] = useState<DragIndexState>({ active: -1, over: -1 })

  const [columns, setColumns] = useState(() =>
    antdBaseColumns.map((column, i) => ({
      ...column,
      key: `${i}`,
      onHeaderCell: (): { id: string } => ({ id: `${i}` }),
      onCell: (): { id: string } => ({ id: `${i}` }),
    })),
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // https://docs.dndkit.com/api-documentation/sensors/pointer#activation-constraints
        distance: 1,
      },
    }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      setColumns((prevState) => {
        const activeIndex = prevState.findIndex((i) => i.key === active?.id)
        const overIndex = prevState.findIndex((i) => i.key === over?.id)
        return arrayMove(prevState, activeIndex, overIndex)
      })
    }
    setDragIndex({ active: -1, over: -1 })
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const activeIndex = columns.findIndex((i) => i.key === active.id)
    const overIndex = columns.findIndex((i) => i.key === over?.id)
    setDragIndex({
      active: active.id,
      over: over?.id,
      direction: overIndex > activeIndex ? 'right' : 'left',
    })
  }

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToHorizontalAxis]}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      collisionDetection={closestCenter}
    >
      <SortableContext items={columns.map((i) => i.key)} strategy={horizontalListSortingStrategy}>
        <DragIndexContext.Provider value={dragIndex}>
          <AntdTable<RecordType>
            rowKey="key"
            columns={columns}
            dataSource={data}
            bordered={bordered}
            components={{
              header: { cell: TableHeaderCell },
              body: { cell: TableBodyCell },
            }}
            /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:300（antd 不认 true，数字像素高度）；
               OFF 时回 undefined，行为与改造前一致。 */
            virtual={virtual}
            scroll={virtual ? { y: 300 } : undefined}
          />
        </DragIndexContext.Provider>
      </SortableContext>
      <DragOverlay>
        <th style={{ backgroundColor: 'gray', padding: 16 }}>
          {columns[columns.findIndex((i) => i.key === dragIndex.active)]?.title as ReactNode}
        </th>
      </DragOverlay>
    </DndContext>
  )
}

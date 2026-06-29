/**
 * drag-sorting demo 的 antd 段（右栏），从 drag-sorting.tsx 拆出。
 *
 * === 拖拽 state 自管（子组件内）===
 * 与 drag-sorting.dg.tsx 同构：拖拽 dataSource 全在子组件内自管（useState + onDragEnd 的 arrayMove），
 * 两栏各自独立（原始 demo 决策「两栏独立」）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - bordered=false（无边框，对齐 antd drag-sorting 默认）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 注意：本子组件不接 autoScroll（antd 无对应概念，仅左栏 data-grid 有 autoScrollOnDrag）。
 *
 * === 忠实复刻 antd 官方 drag-sorting.tsx ===
 * `@dnd-kit/*` DndContext + PointerSensor（distance:1）+ restrictToVerticalAxis +
 * SortableContext（verticalListSortingStrategy）+ `components.body.row = Row` useSortable +
 * transform 跟随指针 + cursor:move + isDragging zIndex 9999 + `onDragEnd` arrayMove。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'react'` / `'antd'` / `'@dnd-kit/core'` / `'@dnd-kit/modifiers'` / `'@dnd-kit/sortable'` /
 * `'@dnd-kit/utilities'` / `'./_compare/drag-sorting.shared'`）。
 *
 * ★ type import（`import type { DragEndEvent } from '@dnd-kit/core'`）被 sucrase 编译时剥离，
 * require 表只需 value（namespace），故 scope.ts 只注入 @dnd-kit/* 的 value 不注 type。
 */
import type { DragEndEvent } from '@dnd-kit/core'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TableColumnsType } from 'antd'
import { Table as AntdTable } from 'antd'
import type { CSSProperties, HTMLAttributes } from 'react'
import type { FC } from 'react'
import { useState } from 'react'
import { initialData, type RecordType } from './_compare/drag-sorting.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）行拖拽组件 —— 忠实复刻 antd 官方 drag-sorting.tsx
// ---------------------------------------------------------------------------

interface RowProps extends HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string
}

/** antd 官方 Row：useSortable(id=data-row-key) + setNodeRef 挂 <tr> + transform 跟随指针 + listeners。 */
const Row: FC<Readonly<RowProps>> = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props['data-row-key'],
  })

  const style: CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    cursor: 'move',
    ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
  }

  return <tr {...props} ref={setNodeRef} style={style} {...attributes} {...listeners} />
}

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<RecordType> = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
]

// ---------------------------------------------------------------------------
// 子组件（自管拖拽排序 state）
// ---------------------------------------------------------------------------

export default function DragSortingAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  // ★ 拖拽 dataSource 各自独立（两栏对照时互不干扰，按原始 demo 决策「两栏独立」）。
  const [dataSource, setDataSource] = useState<RecordType[]>(initialData)

  // PointerSensor distance:1（对齐官方——稍微移动才触发，避免误触点击）。
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
      setDataSource((prev) => {
        const activeIndex = prev.findIndex((i) => i.key === active.id)
        const overIndex = prev.findIndex((i) => i.key === over?.id)
        return arrayMove(prev, activeIndex, overIndex)
      })
    }
  }

  return (
    <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
      <SortableContext
        // rowKey array
        items={dataSource.map((i) => i.key)}
        strategy={verticalListSortingStrategy}
      >
        <AntdTable<RecordType>
          components={{
            body: { row: Row },
          }}
          rowKey="key"
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

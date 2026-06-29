/**
 * drag-sorting demo 的 antd 段（右栏）。
 * 拖拽 dataSource 全在子组件内自管（useState + onDragEnd 的 arrayMove），两栏各自独立。
 * 忠实复刻 antd 官方 drag-sorting.tsx：@dnd-kit DndContext + PointerSensor(distance:1) +
 * restrictToVerticalAxis + SortableContext + components.body.row=Row(useSortable) + transform。
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
  // 拖拽 dataSource 各自独立（两栏对照时互不干扰）。
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
          // 虚拟化开关：ON→virtual+scroll.y:300（antd 不认 true，数字像素高度）；OFF→回 undefined，非虚拟。
          virtual={virtual}
          scroll={virtual ? { y: 300 } : undefined}
        />
      </SortableContext>
    </DndContext>
  )
}

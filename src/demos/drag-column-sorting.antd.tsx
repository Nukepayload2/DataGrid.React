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

const antdBaseColumns: TableColumnsType<RecordType> = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Gender', dataIndex: 'gender' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Email', dataIndex: 'email' },
  { title: 'Address', dataIndex: 'address' },
]

export default function DragColumnSortingAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
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


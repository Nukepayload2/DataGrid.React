/**
 * 复刻 antd drag-column-sorting demo：
 *   `G:\Projects\ant-design\components\table\demo\drag-column-sorting.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——方案 B 自研 pointer 列方向拖拽
 *   （`useColumnDragSort` 命中叶子表头格 `data-leaf-index` + 垂直指示线 + arrayMoveColumns 重排 columns）。
 *   **不依赖 @dnd-kit/***（grid 渲染无"列 DOM"，transform 平移会破坏 grid 布局）。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 `drag-column-sorting.tsx`——
 *   `@dnd-kit/*` + restrictToHorizontalAxis + SortableContext horizontalListSortingStrategy +
 *   closestCenter + PointerSensor（distance:1）+ `components.header.cell = TableHeaderCell` useSortable +
 *   `components.body.cell = TableBodyCell` + DragIndexContext borderInline 虚线指示 +
 *   DragOverlay 预览（拖拽表头灰底）+ onDragEnd arrayMove + onDragOver setDragIndex。
 * - **共享控制条**：`Bordered` 开关同时驱动两侧（原 antd demo 无控制条，此处加最小开关便于对照）。
 *   拖拽是局部交互，两栏各自独立维护 columns（各自列重排便于对照）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/drag-column-sorting.shared.ts`。
 *
 * === 两侧保留的差异（对照价值）===
 *
 * 1. **拖拽视觉**：左栏拖拽中显示**蓝色垂直指示线**（被拖列原位不动，指示线提示列插入位置），
 *    松手后重排；右栏拖拽中被拖列表头 `<th>` **跟随指针平移**（transform）+ body cell borderInline
 *    虚线指示 + DragOverlay 预览（拖拽表头灰底）。功能等价（列重排），视觉略异。
 * 2. **拖拽手势**：左栏通过外层容器**事件委托**命中任意叶子表头格（`data-leaf-index` 定位）；
 *    右栏 dnd-kit listeners 挂 `<th>`（components.header.cell）。
 * 3. **依赖**：左栏自研 pointer（不装 @dnd-kit）；右栏 @dnd-kit/core+sortable+modifiers+utilities
 *    （决策 9：右栏 antd 忠实复刻官方 dnd-kit 实现，不惜装依赖）。
 */

import { createContext, useContext, useRef, useState } from 'react'
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
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import type { CSSProperties, HTMLAttributes } from 'react'
import type { FC, ReactNode } from 'react'
import { Table } from '../table'
import { useColumnDragSort } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
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
// 左栏（data-grid）baseColumns —— Name/Gender/Age/Email/Address（对齐 antd demo）
// ---------------------------------------------------------------------------

const dgBaseColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Gender', dataIndex: 'gender', key: 'gender' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

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
// 左栏（data-grid）—— 方案 B 自研 pointer 列方向拖拽
// ---------------------------------------------------------------------------

function DataGridPane({ bordered }: { bordered: boolean }) {
  const [columns, setColumns] = useState<ColumnType<RecordType>[]>(() =>
    dgBaseColumns.map((column, i) => ({
      ...column,
      // 稳定 key（列重排时 React diff 用），与 antd demo `${i}` 索引作 key 同款。
      key: `${i}`,
    })),
  )

  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useColumnDragSort<ColumnType<RecordType>>({
    columns,
    onSort: setColumns,
    containerRef,
  })

  return (
    <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
      <Table<RecordType>
        rowKey="key"
        columns={columns}
        dataSource={data}
        bordered={bordered}
        // 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination，data-grid 不传=无分页条）。
        pagination={{}}
      />
      {/* 垂直拖拽指示线：绝对定位蓝色竖线，跨表头+表体高度。
          非 grid item（是 container 子元素），不影响 grid-template-columns 计算。 */}
      {indicator.visible ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: indicator.left,
            top: indicator.top,
            height: indicator.height,
            width: 2,
            background: '#1677ff',
            zIndex: 9999,
            pointerEvents: 'none',
            borderRadius: 1,
          }}
        />
      ) : null}
      <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
        当前拖拽：
        {dragState ? `from #${dragState.fromIndex + 1} → 目标 #${dragState.overIndex + 1}` : '无'}
        ；当前列顺序：{columns.map((c) => c.title).join(' / ')}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 右栏（antd）—— 忠实复刻官方 drag-column-sorting.tsx
// ---------------------------------------------------------------------------

function AntdPane({ bordered }: { bordered: boolean }) {
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

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function DragColumnSortingDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </div>

      {/*
        minPaneWidth=480（5 列无 scroll.x，列窄但总宽不大）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<DataGridPane bordered={bordered} />}
        right={<AntdPane bordered={bordered} />}
      >
        <div>
          <strong>对照说明（决策 9 B18）：</strong>左右并排呈现 data-grid（自研 pointer 列方向拖拽）
          与 antd 官方 drag-column-sorting（dnd-kit 列拖拽），方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>拖拽视觉差异</strong>：左栏拖拽中显示<strong>蓝色垂直指示线</strong>
              （被拖列原位不动，指示线提示列插入位置，松手后重排）；右栏拖拽中被拖列表头
              <strong>跟随指针平移</strong>（transform）+ body cell borderInline 虚线指示 +
              DragOverlay 预览（拖拽表头灰底），松手后重排。功能等价。
            </li>
            <li>
              <strong>拖拽手势</strong>：左栏通过外层容器<strong>事件委托</strong>命中叶子表头格
              （<code>data-leaf-index</code> 定位，restrictToHorizontalAxis 等效——仅水平 hit-test）；
              右栏 dnd-kit listeners 挂 <code>&lt;th&gt;</code>（components.header.cell）。
            </li>
            <li>
              <strong>实现差异</strong>：左栏<strong>不依赖 @dnd-kit/*</strong>（方案 B 自研 pointer 列方向——
              grid 渲染无"列 DOM"，transform 平移会破坏 grid 布局）；右栏忠实复刻官方
              <code>@dnd-kit/{'{core,sortable,modifiers,utilities}'}</code> + DragOverlay。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧表格边框，对照两侧行为是否一致。
            </li>
            <li>
              <strong>两栏独立</strong>：拖拽是局部交互，左右各自维护 columns（各自列重排便于对照）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

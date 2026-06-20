/**
 * 复刻 antd drag-sorting demo：
 *   `G:\Projects\ant-design\components\table\demo\drag-sorting.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——方案 B 自研 pointer 行拖拽
 *   （`useRowDragSort` + 事件委托命中 body 单元格 + 蓝色指示线 + arrayMove dataSource）。
 *   **不依赖 @dnd-kit/***（grid 渲染无"行 DOM"，行容器 div 会破坏 M2/M3/M4/M9 布局——决策 6 允许）。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 `drag-sorting.tsx`——
 *   `@dnd-kit/*` DndContext + PointerSensor（distance:1）+ restrictToVerticalAxis +
 *   SortableContext（verticalListSortingStrategy）+ `components.body.row = Row` useSortable +
 *   transform 跟随指针 + cursor:move + isDragging zIndex 9999 + `onDragEnd` arrayMove。
 * - **共享控制条**：`Bordered` 开关同时驱动两侧（原 antd demo 无控制条，此处加最小开关便于对照
 *   「有/无边框」两侧行为是否一致）。拖拽是局部交互，两栏各自独立维护 dataSource（各自排序便于对照）。
 * - **共享数据**：`RecordType` + `initialData` 见 `_compare/drag-sorting.shared.ts`。
 *
 * === 两侧保留的差异（对照价值）===
 *
 * 1. **拖拽视觉**：左栏拖拽中显示**蓝色指示线**（被拖行原位不动，指示线提示插入位置），松手后重排；
 *    右栏拖拽中被拖行 `<tr>` **跟随指针平移**（transform），松手后重排。功能等价（行重排），视觉略异。
 * 2. **拖拽手势**：左栏通过外层容器**事件委托**命中任意 body 单元格（整行均可拖，无需改引擎）；
 *    右栏 dnd-kit 的 listeners 挂整 `<tr>`（整行可拖）。
 * 3. **依赖**：左栏自研 pointer（不装 @dnd-kit）；右栏 @dnd-kit/core+sortable+modifiers+utilities
 *    （决策 9：右栏 antd 忠实复刻官方 dnd-kit 实现，不惜装依赖）。
 */

import { useRef, useState } from 'react'
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
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import type { CSSProperties, HTMLAttributes } from 'react'
import type { FC } from 'react'
import { Table } from '../table'
import { useRowDragSort } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
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
// 左栏（data-grid）列定义 —— Name / Age / Address（对齐 antd demo）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<RecordType> = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
]

// ---------------------------------------------------------------------------
// 左栏（data-grid）—— 方案 B 自研 pointer 行拖拽
// ---------------------------------------------------------------------------

function DataGridPane({ bordered }: { bordered: boolean }) {
  const [dataSource, setDataSource] = useState<RecordType[]>(initialData)

  // 外层容器 ref（指示线相对此容器绝对定位；hit-test 遍历容器内 [data-row-index] 单元格）。
  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useRowDragSort<RecordType>({
    dataSource,
    rowKey: 'key',
    onSort: setDataSource,
    containerRef,
  })

  return (
    <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
      <Table<RecordType>
        rowKey="key"
        columns={dgColumns}
        dataSource={dataSource}
        bordered={bordered}
      />
      {/* 拖拽指示线：绝对定位蓝色横线，跨整行（left:0/right:0 相对 container）。
          非 grid item（是 container 子元素），不影响 grid-template-rows 计算。 */}
      {indicator.visible ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: indicator.top,
            left: indicator.left,
            right: indicator.right,
            height: 2,
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
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 右栏（antd）—— 忠实复刻官方 drag-sorting.tsx
// ---------------------------------------------------------------------------

function AntdPane({ bordered }: { bordered: boolean }) {
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
        />
      </SortableContext>
    </DndContext>
  )
}

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function DragSortingDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。 */}
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
        minPaneWidth=480（窄表，3 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<DataGridPane bordered={bordered} />}
        right={<AntdPane bordered={bordered} />}
      >
        <div>
          <strong>对照说明（决策 9 B18）：</strong>左右并排呈现 data-grid（自研 pointer 行拖拽）
          与 antd 官方 drag-sorting（dnd-kit 行拖拽），方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>拖拽视觉差异</strong>：左栏 data-grid 拖拽中显示<strong>蓝色指示线</strong>
              （被拖行原位不动，指示线提示插入位置，松手后重排）；右栏 antd 拖拽中被拖行
              <strong>跟随指针平移</strong>（transform），松手后重排。功能等价。
            </li>
            <li>
              <strong>拖拽手势</strong>：左栏通过外层容器<strong>事件委托</strong>命中 body 单元格
              （整行均可拖，<code>data-row-index</code> 定位）；右栏 dnd-kit listeners 挂整 <code>&lt;tr&gt;</code>。
            </li>
            <li>
              <strong>实现差异</strong>：左栏<strong>不依赖 @dnd-kit/*</strong>（方案 B 自研 pointer——
              grid 渲染无"行 DOM"，行容器 div 会破坏 M2/M3/M4/M9 布局）；右栏忠实复刻官方
              <code>@dnd-kit/{'{core,sortable,modifiers,utilities}'}</code>。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧表格边框，对照两侧行为是否一致。
            </li>
            <li>
              <strong>两栏独立</strong>：拖拽是局部交互，左右各自维护 dataSource（各自排序便于对照）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

/**
 * 复刻 antd drag-sorting-handler demo：
 *   `G:\Projects\ant-design\components\table\demo\drag-sorting-handler.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——复用 S17 `useRowDragSort` + 新增
 *   `handleSelector: '.dg-drag-handle'` 限定手柄列触发（Name/Age/Address 不触发）。
 *   DragHandle 用 antd `<Button>` + 自绘 HolderOutlined SVG（**不 import @ant-design/icons**，
 *   与 custom-filter-panel/nested-table 约定一致——避免引入未声明的直接依赖）。
 *   **不依赖 @dnd-kit/***。
 * - **右栏（antd Table）**：忠实复刻 antd 官方 `drag-sorting-handler.tsx`——
 *   `@dnd-kit/*` + RowContext.Provider 透传 setActivatorNodeRef/listeners 到 DragHandle，
 *   仅手柄触发拖拽（Name/Age/Address 不触发）。★ 图标同样用内联 SVG（见下 AntdDragHandle 注释，
 *   项目未直接声明 @ant-design/icons 依赖，右栏也走 InlineHolderOutlined——视觉与官方
 *   HolderOutlined 逐字节一致，仅图标实现方式不同）。
 * - **共享控制条**：`Bordered` 开关同时驱动两侧（原 antd demo 无控制条，此处加最小开关便于对照）。
 *   拖拽是局部交互，两栏各自独立维护 dataSource（各自排序便于对照）。
 * - **共享数据**：`RecordType` + `initialData` 见 `_compare/drag-sorting-handler.shared.ts`。
 *
 * === 两侧保留的差异（对照价值）===
 *
 * 1. **拖拽视觉**：左栏拖拽中显示**蓝色指示线**（被拖行原位不动）；右栏拖拽中被拖行
 *    **跟随指针平移**（transform）。功能等价（行重排），视觉略异。
 * 2. **手柄触发机制**：左栏通过外层容器事件委托 + `handleSelector: '.dg-drag-handle'` 命中
 *    （DragHandle 仅作命中标识，加 .dg-drag-handle class）；右栏 dnd-kit 用
 *    RowContext.Provider 透传 setActivatorNodeRef/listeners 到 DragHandle。
 * 3. **手柄图标**：两栏均用 `InlineHolderOutlined`（内联 SVG，viewBox + path 取自
 *    `@ant-design/icons-svg` HolderOutlined——逐字节一致）。仅图标实现方式不同（内联 SVG vs
 *    官方 @ant-design/icons 组件），**视觉完全相同**——因 pnpm 严格隔离项目未直接声明
 *    @ant-design/icons 依赖（仅 antd 间接依赖不可访问），故右栏也走内联 SVG（与
 *    custom-filter-panel/nested-table 约定一致）。
 */

import { createContext, useContext, useMemo, useRef, useState } from 'react'
import type { DragEndEvent } from '@dnd-kit/core'
import { DndContext } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Space, Switch, Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import type { CSSProperties, HTMLAttributes } from 'react'
import type { FC, ReactNode } from 'react'
import { Table } from '../table'
import { useRowDragSort } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { initialData, type RecordType } from './_compare/drag-sorting-handler.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）内联 HolderOutlined SVG —— 避免 import @ant-design/icons
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

/** 左栏 DragHandle：cursor:move + .dg-drag-handle class（供 handleSelector 命中）。 */
function DgDragHandle() {
  return (
    <Button
      type="text"
      size="small"
      className="dg-drag-handle"
      icon={<InlineHolderOutlined />}
      style={{ cursor: 'move' }}
    />
  )
}

// ---------------------------------------------------------------------------
// 右栏（antd）Row + RowContext + DragHandle —— 忠实复刻 antd 官方 drag-sorting-handler.tsx
// ---------------------------------------------------------------------------

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
// 左栏（data-grid）列定义 —— 首列手柄 + Name/Age/Address（对齐 antd demo）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { key: 'sort', align: 'center', width: 80, render: () => <DgDragHandle /> },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

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
// 左栏（data-grid）—— 复用 S17 useRowDragSort + handleSelector 限定手柄列
// ---------------------------------------------------------------------------

function DataGridPane({ bordered }: { bordered: boolean }) {
  const [dataSource, setDataSource] = useState<RecordType[]>(initialData)

  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useRowDragSort<RecordType>({
    dataSource,
    rowKey: 'key',
    onSort: setDataSource,
    containerRef,
    // 手柄列限定：仅 .dg-drag-handle 命中才启动拖拽（Name/Age/Address 不触发）。
    handleSelector: '.dg-drag-handle',
  })

  return (
    <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
      <Table<RecordType>
        rowKey="key"
        columns={dgColumns}
        dataSource={dataSource}
        bordered={bordered}
      />
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
// 右栏（antd）—— 忠实复刻官方 drag-sorting-handler.tsx
// ---------------------------------------------------------------------------

function AntdPane({ bordered }: { bordered: boolean }) {
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
        />
      </SortableContext>
    </DndContext>
  )
}

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function DragSortingHandlerDemo() {
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
        minPaneWidth=480（窄表，4 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<DataGridPane bordered={bordered} />}
        right={<AntdPane bordered={bordered} />}
      >
        <div>
          <strong>对照说明（决策 9 B18）：</strong>左右并排呈现 data-grid（自研 pointer 手柄列拖拽）
          与 antd 官方 drag-sorting-handler（dnd-kit 手柄列拖拽），方便对照修 bug。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>手柄触发</strong>：首列为手柄列（HolderOutlined 图标 + cursor:move）。
              <strong>仅按住手柄上下拖拽</strong>才启动排序；点 Name/Age/Address 不触发（区别 S17 整行可拖）。
            </li>
            <li>
              <strong>拖拽视觉差异</strong>：左栏拖拽中显示<strong>蓝色指示线</strong>（被拖行原位不动），
              松手后重排；右栏拖拽中被拖行<strong>跟随指针平移</strong>（transform），松手后重排。
            </li>
            <li>
              <strong>手柄触发机制</strong>：左栏通过外层容器事件委托 + <code>handleSelector: '.dg-drag-handle'</code>
              命中（DragHandle 加 .dg-drag-handle class）；右栏 dnd-kit 用 RowContext.Provider 透传
              setActivatorNodeRef/listeners 到 DragHandle。
            </li>
            <li>
              <strong>手柄图标</strong>：两栏均用<strong>内联 HolderOutlined SVG</strong>（viewBox + path
              逐字节取自 <code>@ant-design/icons-svg</code>——7 个圆点），<strong>视觉完全一致</strong>。
              因 pnpm 严格隔离项目未直接声明 @ant-design/icons 依赖（仅 antd 间接依赖不可访问），
              故右栏也走内联 SVG（与 custom-filter-panel/nested-table 约定一致）。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧表格边框，对照两侧行为是否一致。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

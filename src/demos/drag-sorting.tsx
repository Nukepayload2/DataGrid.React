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
 * 4. **★ cursor（任务 #A）**：左栏 data-grid 用 S29 `styles.body.cell.cursor='move'` 让整行 body
 *    单元格显 move 光标（data-grid 无 tr，靠 cell 注入；对齐右栏 antd `<tr>` cursor:move）。两栏
 *    悬停光标现已一致。
 * 5. **★ 列宽/行高（任务 #B）**：左栏 data-grid 用 `tableLayout='fixed'` + Name(120)/Age(80) 绝对
 *    width + Address 无 width（minmax(0,1fr) 填剩余）→ Address 占剩余空间并换行，消除横滚条；
 *    非虚拟默认 rowHeight='auto' → 行随换行内容自动增高（第 1 行超长 address 变高）。右栏 antd
 *    忠实复刻官方（auto 布局，同款数据会横滚）——两侧此处**刻意不同**：左栏展示 data-grid 的
 *    「填剩余 + 换行 + 自动行高」目标态，右栏保留 antd 官方原貌作对照基准。
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
import { Space, Switch, Table as AntdTable, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import type { CSSProperties, HTMLAttributes } from 'react'
import type { FC } from 'react'
import { Table } from '../table'
import { useRowDragSort } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { initialData, type RecordType } from './_compare/drag-sorting.shared'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（拖拽命中区在虚拟窗口内，正常接入）
import { useVirtualization } from './VirtualizationContext'

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

// ★ 列宽策略（任务 #A/B）：Name/Age 给窄 width（绝对 track，fixed 模式下锁定不参与 fr 分配），
//   Address 不设 width（fixed 模式 → minmax(0,1fr) 填剩余空间，超长文本换行而非撑出横滚条）。
//   与 antd 右栏差异：antd 官方同款数据会横滚（auto 布局 + max-content），此处刻意 fixed 布局让
//   Address 占剩余空间并换行——是本 demo 的目标态（消除横滚 + 自动行高），不是回归。
const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 120 },
  { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
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

function DataGridPane({
  bordered,
  autoScroll,
  virtual,
}: {
  bordered: boolean
  autoScroll: boolean
  virtual: boolean
}) {
  const { token } = theme.useToken()
  const [dataSource, setDataSource] = useState<RecordType[]>(initialData)

  // 外层容器 ref（指示线相对此容器绝对定位；hit-test 遍历容器内 [data-row-index] 单元格）。
  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useRowDragSort<RecordType>({
    dataSource,
    rowKey: 'key',
    onSort: setDataSource,
    containerRef,
    // T9：拖到容器边缘自动滚动（此 demo 数据少无 scroll 容器，auto-scroll 为 no-op；开关用于对照）。
    autoScroll,
  })

  return (
    <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
      <Table<RecordType>
        rowKey="key"
        columns={dgColumns}
        dataSource={dataSource}
        bordered={bordered}
        // 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination，data-grid 不传=无分页条）。
        pagination={{}}
        /* ★ 任务 #B：切到 fixed 布局——无 width 列（Address）变 minmax(0,1fr) 填剩余空间，
           超长文本换行而非撑出横滚条；非虚拟默认 rowHeight='auto'，行随换行内容自动增高。
           fixed 布局与虚拟化正交，virtual ON 时仍生效。 */
        tableLayout="fixed"
        /* ★ 任务 #A：整行 cursor:move——对齐 antd 官方 drag-sorting 在 <tr> 设 cursor:move
           （右栏 antd Row 已复刻）。data-grid 无 tr，用 S29 语义 styles.body.cell 把 cursor:move
           注入到每个 body 单元格（整行悬停显 move 光标，与 antd 整行 cursor:move 一致）。 */
        styles={{ body: { cell: { cursor: 'move' } } }}
        /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
           给的限高，虚拟窗口才有滚动区；拖拽命中区在虚拟窗口内，正常接入——autoScrollOnDrag 已有）；
           OFF 时回 undefined，行为与改造前一致。 */
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
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
            background: token.colorPrimary,
            zIndex: 9999,
            pointerEvents: 'none',
            borderRadius: 1,
          }}
        />
      ) : null}
      <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary }}>
        当前拖拽：
        {dragState ? `from #${dragState.fromIndex + 1} → 目标 #${dragState.overIndex + 1}` : '无'}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 右栏（antd）—— 忠实复刻官方 drag-sorting.tsx
// ---------------------------------------------------------------------------

function AntdPane({
  bordered,
  virtual,
}: {
  bordered: boolean
  virtual: boolean
}) {
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

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function DragSortingDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // T9：autoScrollOnDrag 开关（仅驱动左栏 data-grid；右栏 antd 无对应概念）。
  const [autoScroll, setAutoScroll] = useState(true)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。
          用 DemoToolbar 包住——内部 theme.useToken() 拿 colorBgContainer/colorBorderSecondary，
          light/dark 自动跟随，无需 useTheme/isDark 硬编码 #fff/#f0f0f0/#141414/#303030。 */}
      <DemoToolbar>
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          {/* T9：autoScrollOnDrag 开关（仅驱动左栏 data-grid）。 */}
          <Switch
            checked={autoScroll}
            onChange={setAutoScroll}
            checkedChildren="AutoScroll"
            unCheckedChildren="AutoScroll"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<DataGridPane bordered={bordered} autoScroll={autoScroll} virtual={virtual} />}
        right={<AntdPane bordered={bordered} virtual={virtual} />}
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

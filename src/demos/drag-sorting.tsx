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
 *
 * === 拆子文件（task：live 编辑接入，Pane 组件直接变子文件）===
 *
 * 父文件只保留「外壳职责」：bordered/autoScroll state + useVirtualization + DemoToolbar(Switch
 * Bordered + Switch AutoScroll) + SplitDemo 外壳 + children 对照说明。两侧表格 JSX + 拖拽组件 +
 * 列定义拆到子文件：
 *   - `./drag-sorting.dg`：`DragSortingDg({bordered, autoScroll, virtual})`（左栏，自研 pointer）
 *   - `./drag-sorting.antd`：`DragSortingAntd({bordered, virtual})`（右栏，@dnd-kit）
 *
 * ★ state 提升决策（SOP）：bordered/autoScroll 由父控制条直接操作 → 提升父 + prop 传子；
 *   拖拽 dataSource 是局部交互态 → 留各侧子组件内自管（原始决策「两栏独立」）。
 * ★ @dnd-kit/* scope 扩展：drag-sorting.antd 子文件 `import { DndContext, ... } from '@dnd-kit/core'`
 *   等，scope 外依赖，已在 src/live/scope.ts baseScope 注入 4 个 namespace（仅 value，type import
 *   如 DragEndEvent 被 sucrase 剥离不需注入）。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `DragSortingDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 * 子组件 props 全部带默认值（bordered=false / autoScroll=true / virtual=false），编辑态超集 props
 * {bordered,virtual,size,autoScroll} 不全也不崩（拖拽 dataSource state 全在子组件内自管）。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（拖拽命中区在虚拟窗口内，正常接入）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 Pane + 拖拽组件 + 列定义由子组件提供（props 驱动）。RecordType/initialData
//   现在由子文件各自 import drag-sorting.shared；父文件不再需要。
import DragSortingDg from './drag-sorting.dg'
import DragSortingAntd from './drag-sorting.antd'

// ===========================================================================
// Demo 根组件
// ===========================================================================

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
        left={<DragSortingDg bordered={bordered} autoScroll={autoScroll} virtual={virtual} />}
        right={<DragSortingAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 B18）：</strong>左右并排呈现 data-grid（自研 pointer 行拖拽）
          与 antd 官方 drag-sorting（dnd-kit 行拖拽），方便对照修 bug。
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
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

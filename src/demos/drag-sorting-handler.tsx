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
 *   仅手柄触发拖拽（Name/Age/Address 不触发）。★ 图标同样用内联 SVG（项目未直接声明
 *   @ant-design/icons 依赖，右栏也走 InlineHolderOutlined——视觉与官方 HolderOutlined 逐字节一致，
 *   仅图标实现方式不同）。
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
 *
 * === 拆子文件（task：live 编辑接入，Pane 组件直接变子文件）===
 *
 * 父文件只保留「外壳职责」：bordered/autoScroll state + useVirtualization + DemoToolbar(Switch
 * Bordered + Switch AutoScroll) + SplitDemo 外壳 + children 对照说明。两侧表格 JSX + 手柄/Row
 * 拖拽组件 + 列定义 + InlineHolderOutlined 拆到子文件：
 *   - `./drag-sorting-handler.dg`：`DragSortingHandlerDg({bordered, autoScroll, virtual})`（左栏，自研 pointer）
 *   - `./drag-sorting-handler.antd`：`DragSortingHandlerAntd({bordered, virtual})`（右栏，@dnd-kit）
 *
 * ★ state 提升决策（SOP）：bordered/autoScroll 由父控制条直接操作 → 提升父 + prop 传子；
 *   拖拽 dataSource 是局部交互态 → 留各侧子组件内自管（原始决策「两栏独立」）。
 * ★ @dnd-kit/* scope：已在 src/live/scope.ts baseScope 注入 4 个 namespace（react-highlight-words
 *   + @dnd-kit/core、@dnd-kit/sortable、@dnd-kit/modifiers、@dnd-kit/utilities）。
 *   drag-sorting-handler.antd 子文件 `import { DndContext, ... } from '@dnd-kit/core'` 等，scope 内命中。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `DragSortingHandlerDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 * 子组件 props 全部带默认值（bordered=false / autoScroll=true / virtual=false），编辑态超集 props
 * {bordered,virtual,size,autoScroll} 不全也不崩（拖拽 dataSource state 全在子组件内自管）。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（手柄拖拽命中区在虚拟窗口内，正常接入）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 Pane + 手柄/Row 拖拽组件 + 列定义 + InlineHolderOutlined 由子组件提供（props 驱动）。
//   RecordType/initialData 现在由子文件各自 import drag-sorting-handler.shared；父文件不再需要。
import DragSortingHandlerDg from './drag-sorting-handler.dg'
import DragSortingHandlerAntd from './drag-sorting-handler.antd'

// ===========================================================================
// Demo 根组件
// ===========================================================================

export default function DragSortingHandlerDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // T9：autoScrollOnDrag 开关（仅驱动左栏 data-grid；右栏 antd 无对应概念）。
  const [autoScroll, setAutoScroll] = useState(true)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 控制条：Bordered + AutoScroll 开关。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0；
          ★ 仅 chrome 控制条容器化，不动拖拽逻辑/useRowDragSort（离散让位已在 hook 实现）。 */}
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
        minPaneWidth=480（窄表，4 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<DragSortingHandlerDg bordered={bordered} autoScroll={autoScroll} virtual={virtual} />}
        right={<DragSortingHandlerAntd bordered={bordered} virtual={virtual} />}
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

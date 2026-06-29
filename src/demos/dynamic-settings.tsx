/**
 * 复刻 antd dynamic-settings demo：
 *   `G:\Projects\ant-design\components\table\demo\dynamic-settings.tsx`
 *
 * === 决策 9 双栏对照（S33 综合集成验收）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——动态面板全量切换（10 Switch + 5
 *   Radio.Group）实时驱动 Table props。无 ConfigProvider theme token（默认主题），
 *   区别于 component-token demo（S30）。
 * - **右栏（antd Table）**：忠实复刻 antd dynamic-settings demo（antd 原生 `<Table>` +
 *   动态面板）。**唯一改动**：antd demo 原本用 `@ant-design/icons` 的 `DownOutlined`，
 *   本 demo 改为内联 SVG（不直接依赖 @ant-design/icons，与既有 demo 约定一致），两侧共用。
 * - **共享控制条 + 共享 state**：10 Switch + 5 Radio.Group 的同一组 state 同时驱动两侧表格
 *   （bordered/loading/size/title/footer/.../pagination top/bottom）。任一切换，左右同步 diff。
 *
 * === S33 定位（集成验收 demo，非新功能）===
 *
 * S1-S32 + M1-M9 全部功能已实现。本 demo 把所有可动态切换的 Table 属性聚合到一个控制面板，
 * 用于「整体回归」——引擎零改动（功能已就位），S33 仅 demo 验收。
 *
 * === 与 S30 component-token demo 的关系 ===
 *
 * 结构高度相似（同样 10 Switch + 5 Radio.Group + Table 动态 props + columns sorter/filters/
 * Action + 10 行 + expandable + scroll + pagination placement）。唯一区别：
 *   - S30 有 `<ConfigProvider theme={{ components: { Table: { ...27 token } }}>`（蓝色主题）；
 *   - S33 **无 ConfigProvider theme token**（默认主题），纯属性动态切换。
 *
 * === 两侧已知差异（如实保留作为对照价值）===
 *
 * - DownOutlined：两侧子组件各自内联 SVG（不依赖 @ant-design/icons；antd demo 原本 import 它，
 *   本 demo 改内联）。视觉一致。
 * - pagination placement：data-grid 用 v6 数组语义（S11 实测）；antd 原生同。
 * - data-grid pagination 默认不分页；本 demo 显式传 { placement:[top,bottom] } 启用分页
 *   （与 antd 默认开启分页不同，但 demo 行为等价）。
 * - scroll.y：决策 7——data-grid 用 `true`（CSS 自适应，父容器 240px）；antd 用 240（数字）。
 * - scroll.x：两侧统一 '120vw'（对齐 antd dynamic-settings.tsx 官方原值；此前 data-grid
 *   用 '100vw'，现已统一）。
 *
 * === 拆子文件（task S33：live 编辑接入，同 basic/component-token 模式）===
 *
 * 父文件只保留「外壳职责」：全量动态面板 state（bordered/loading/size/expandableEnabled/
 * showTitle/showHeader/showFooter/rowSelectionEnabled/hasData/tableLayout/top/bottom/ellipsis/
 * yScroll/xScroll）+ useVirtualization + Form 控制条 + SplitDemo 外壳 + children 对照说明。
 * 两侧表格 JSX + 各自 columns + 各自 defaultExpandable + 内联 DownOutlined 拆到子文件：
 *   - `./dynamic-settings.dg`：`DynamicSettingsDg({...15 state + virtual})`（左栏）
 *   - `./dynamic-settings.antd`：`DynamicSettingsAntd({...15 state + virtual})`（右栏）
 *
 * ★ state 提升决策（SOP）：全量动态面板 state 必须留父——父渲染 Form 控制条需直接读写它们；
 *   且同一组 state 驱动两侧同步 diff。columns/expandable/DownOutlined 无外部控制条直接操作，
 *   按 SOP 搬入子组件（两侧各自声明类型 + 内联 DownOutlined，不跨子文件 import）。
 *
 * === 验证点（S33 集成验收 + 决策 9）===
 *
 * 1. 默认主题（白底表头 + 标准字号/padding），无 ConfigProvider token 覆盖。
 * 2. 全量切换无报错：Bordered/loading/Title/Column Header/Footer/Expandable/Checkbox/
 *    Fixed Header/Has Data/Ellipsis/Size/Table Scroll/Table Layout/Pagination Top/
 *    Pagination Bottom——每个开关切换后两侧表格 props 实时变化、console 无 error。
 * 3. 左右同步 diff：任一开关切换 → 两侧表格同时变化（共享 state 驱动）。
 * 4. 回归：其他 demo（component-token/head/basic/bordered/size/expand/rowSelection/
 *    scroll/ellipsis/pagination/loading/title/footer/tableLayout）全部不变（仅本 demo 改造）。
 */

import { useState } from 'react'
import type { RadioChangeEvent } from 'antd'
import { Form, Radio, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + 各自 columns + 各自 defaultExpandable + 内联 DownOutlined 由子组件
//   提供（props 驱动）。RecordType/dataSource/defaultTitle/defaultFooter 现在由子文件各自 import
//   dynamic-settings.shared；父文件不再需要。
import DynamicSettingsDg from './dynamic-settings.dg'
import DynamicSettingsAntd from './dynamic-settings.antd'

// ---------------------------------------------------------------------------
// 共享类型
// ---------------------------------------------------------------------------

// 共享 size 类型：'large'/'medium'/'small' 在两侧都被接受
// （data-grid 用 'medium'（= 'middle'）；antd v6 也接受 'medium' 别名（= 'middle'），
// 不含 data-grid 独有的 'compact'，避免与 antd SizeType 不兼容）。
type SharedSize = 'large' | 'medium' | 'small'

// 共享 pagination placement 字面量类型（与子组件独立声明的 TablePaginationPlacement 字面重叠，
// 运行时兼容；父级 Form Radio.Group 用此类型受控）。子组件各自声明同款类型不跨子文件 import。
type TablePaginationPlacement =
  | 'topStart'
  | 'topCenter'
  | 'topEnd'
  | 'bottomStart'
  | 'bottomCenter'
  | 'bottomEnd'
  | 'none'

// ===========================================================================
// Demo 根组件
// ===========================================================================

export default function DynamicSettingsDemo() {
  // ★ 共享 state：同一组 state 同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [size, setSize] = useState<SharedSize>('large')
  const [expandableEnabled, setExpandableEnabled] = useState(true)
  const [showTitle, setShowTitle] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const [showFooter, setShowFooter] = useState(true)
  const [rowSelectionEnabled, setRowSelectionEnabled] = useState(true)
  const [hasData, setHasData] = useState(true)
  const [tableLayout, setTableLayout] = useState<'unset' | 'fixed'>('unset')
  const [top, setTop] = useState<TablePaginationPlacement>('none')
  const [bottom, setBottom] = useState<TablePaginationPlacement>('bottomEnd')
  const [ellipsis, setEllipsis] = useState(false)
  const [yScroll, setYScroll] = useState(false)
  const [xScroll, setXScroll] = useState<'unset' | 'scroll' | 'fixed'>('unset')
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + 在原动态 scroll 基础上合并 y
  // （yScroll 控制条仍可独立开关；virtual ON 时 data-grid y 强制 true、antd y 强制 300）。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。antd <Form layout="inline"> 风格。 */}
      <Form layout="inline" className="table-demo-control-bar" style={{ marginBottom: 16 }}>
        <Form.Item label="Bordered">
          <Switch checked={bordered} onChange={setBordered} />
        </Form.Item>
        <Form.Item label="loading">
          <Switch checked={loading} onChange={setLoading} />
        </Form.Item>
        <Form.Item label="Title">
          <Switch checked={showTitle} onChange={setShowTitle} />
        </Form.Item>
        <Form.Item label="Column Header">
          <Switch checked={showHeader} onChange={setShowHeader} />
        </Form.Item>
        <Form.Item label="Footer">
          <Switch checked={showFooter} onChange={setShowFooter} />
        </Form.Item>
        <Form.Item label="Expandable">
          <Switch checked={expandableEnabled} onChange={setExpandableEnabled} />
        </Form.Item>
        <Form.Item label="Checkbox">
          <Switch
            checked={rowSelectionEnabled}
            onChange={setRowSelectionEnabled}
          />
        </Form.Item>
        <Form.Item label="Fixed Header">
          <Switch checked={yScroll} onChange={setYScroll} />
        </Form.Item>
        <Form.Item label="Has Data">
          <Switch checked={hasData} onChange={setHasData} />
        </Form.Item>
        <Form.Item label="Ellipsis">
          <Switch checked={ellipsis} onChange={setEllipsis} />
        </Form.Item>
        <Form.Item label="Size">
          <Radio.Group value={size} onChange={(e: RadioChangeEvent) => setSize(e.target.value)}>
            <Radio.Button value="large">Large</Radio.Button>
            <Radio.Button value="medium">Medium</Radio.Button>
            <Radio.Button value="small">Small</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Table Scroll">
          <Radio.Group
            value={xScroll}
            onChange={(e: RadioChangeEvent) => setXScroll(e.target.value)}
          >
            <Radio.Button value="unset">Unset</Radio.Button>
            <Radio.Button value="scroll">Scroll</Radio.Button>
            <Radio.Button value="fixed">Fixed Columns</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Table Layout">
          <Radio.Group
            value={tableLayout}
            onChange={(e: RadioChangeEvent) => setTableLayout(e.target.value)}
          >
            <Radio.Button value="unset">Unset</Radio.Button>
            <Radio.Button value="fixed">Fixed</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Pagination Top">
          <Radio.Group value={top} onChange={(e) => setTop(e.target.value)}>
            <Radio.Button value="topStart">TopStart</Radio.Button>
            <Radio.Button value="topCenter">TopCenter</Radio.Button>
            <Radio.Button value="topEnd">TopEnd</Radio.Button>
            <Radio.Button value="none">None</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Pagination Bottom">
          <Radio.Group value={bottom} onChange={(e) => setBottom(e.target.value)}>
            <Radio.Button value="bottomStart">BottomStart</Radio.Button>
            <Radio.Button value="bottomCenter">BottomCenter</Radio.Button>
            <Radio.Button value="bottomEnd">BottomEnd</Radio.Button>
            <Radio.Button value="none">None</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </Form>

      {/*
        minPaneWidth=600 → 横排阈值 ≈ 1216。常规笔记本视口（≥1280）即可横排；
        窄视口自动换行竖排。4 列 + 动态面板 props 组合，半宽 ~640 友好。
        无 ConfigProvider theme（默认主题，区别于 component-token demo）。
      */}
      <SplitDemo
        minPaneWidth={600}
        left={
          <DynamicSettingsDg
            bordered={bordered}
            loading={loading}
            size={size}
            expandableEnabled={expandableEnabled}
            showTitle={showTitle}
            showHeader={showHeader}
            showFooter={showFooter}
            rowSelectionEnabled={rowSelectionEnabled}
            hasData={hasData}
            tableLayout={tableLayout}
            top={top}
            bottom={bottom}
            ellipsis={ellipsis}
            yScroll={yScroll}
            xScroll={xScroll}
            virtual={virtual}
          />
        }
        right={
          <DynamicSettingsAntd
            bordered={bordered}
            loading={loading}
            size={size}
            expandableEnabled={expandableEnabled}
            showTitle={showTitle}
            showHeader={showHeader}
            showFooter={showFooter}
            rowSelectionEnabled={rowSelectionEnabled}
            hasData={hasData}
            tableLayout={tableLayout}
            top={top}
            bottom={bottom}
            ellipsis={ellipsis}
            yScroll={yScroll}
            xScroll={xScroll}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B19 / S33 综合集成验收）：</strong>
          左右并排呈现 data-grid 与 antd dynamic-settings demo（10 Switch + 5 Radio.Group
          全量动态切换），用于集成回归 + 对照差异。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>共享动态面板</strong>：10 Switch + 5 Radio.Group 的同一组 state
              同时驱动两侧——bordered/loading/title/footer/header/expandable/checkbox/
              fixedHeader/hasData/ellipsis + size/tableScroll/tableLayout/paginationTop/
              paginationBottom。任一切换，左右同步 diff。
            </li>
            <li>
              <strong>无 ConfigProvider theme</strong>（区别于 component-token demo）：
              默认主题（白底表头 + 标准字号/padding），纯属性动态切换。
            </li>
            <li>
              <strong>DownOutlined</strong>：两侧子组件各自内联 SVG（不依赖
              <code> @ant-design/icons</code>；antd demo 原本 import 它，本 demo 改内联）。
              视觉一致。
            </li>
            <li>
              <strong>scroll.y</strong>（决策 7）：左栏 data-grid
              <code> scroll:&#123;y:true&#125;</code>（CSS 自适应，父容器 240px）；右栏 antd
              <code> scroll:&#123;y:240&#125;</code>（数字）。
            </li>
            <li>
              <strong>scroll.x</strong>：两侧统一 '120vw'（对齐 antd dynamic-settings.tsx
              官方原值；此前 data-grid 用 '100vw'，现已统一）。
            </li>
            <li>
              <strong>pagination</strong>（已知差异）：data-grid 默认不分页；本 demo 显式传
              <code> &#123; placement:[top,bottom] &#125;</code> 启用分页（与 antd 默认开启
              分页不同，但 demo 行为等价）。
            </li>
            <li>
              <strong>S33 集成验收定位</strong>：S1-S32 + M1-M9 全部功能已实现，本 demo
              把所有可动态切换的 Table 属性聚合到一个面板用于整体回归（引擎零改动）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

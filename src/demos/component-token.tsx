/**
 * 复刻 antd component-token demo：
 *   `G:\Projects\ant-design\components\table\demo\component-token.tsx`
 *
 * === 决策 9 双栏对照（S30 component-token 主题定制）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——`<ConfigProvider theme.components.Table>`
 *   token 覆盖由 data-grid 适配层 `theme.useToken()` 读取 → `buildTableTokenCssVars` 映射为
 *   `.dg-wrapper` inline `--ant-*` CSS variables 注入（覆盖 tokens.css fallback）→ 视觉随 token 变化。
 * - **右栏（antd Table）**：忠实复刻 antd component-token demo（antd v6 cssinjs 原生消费
 *   `:where(.ant-table)` component token）。**唯一改动**：antd demo 原本用
 *   `@ant-design/icons` 的 `DownOutlined`，本 demo 改为内联 SVG（不直接依赖
 *   @ant-design/icons，与既有 demo 约定一致），两侧共用。
 * - **共享控制条 + 共享 state**：10 Switch + 5 Radio.Group 的同一组 state 同时驱动两侧表格
 *   （bordered/loading/size/title/footer/.../pagination top/bottom）。任一切换，左右同步 diff。
 * - **共享 ConfigProvider**：两侧 Table 都包在同一个 ConfigProvider（theme.components.Table 27 token）
 *   内，token 对 data-grid（CSS variables 注入）与 antd（cssinjs）都生效。
 *
 * === 拆子文件（task S30：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：全量动态面板 state（bordered/loading/size/expandableEnabled/
 * showTitle/showHeader/showFooter/rowSelectionEnabled/hasData/tableLayout/top/bottom/ellipsis/
 * yScroll/xScroll）+ useVirtualization + Form 控制条 + 共享 ConfigProvider（27 token）+ SplitDemo
 * 外壳 + children 对照说明。两侧表格 JSX + 各自 columns + 各自 defaultExpandable + 内联 DownOutlined
 * 拆到子文件：
 *   - `./component-token.dg`：`ComponentTokenDg({...15 state + virtual})`（左栏）
 *   - `./component-token.antd`：`ComponentTokenAntd({...15 state + virtual})`（右栏）
 *
 * ★ state 提升决策（SOP）：全量动态面板 state 必须留父——父渲染 Form 控制条需直接读写它们；
 *   且同一组 state 驱动两侧同步 diff。ConfigProvider theme.components.Table（27 token）也留父
 *   （两侧共用同一 ConfigProvider 包裹，token 对两侧都生效）。columns/expandable/DownOutlined
 *   无外部控制条直接操作，按 SOP 搬入子组件（两侧各自声明类型 + 内联 DownOutlined，不跨子文件 import）。
 *
 * ★ token 值（27 个）均由父级 ConfigProvider 静态字面量提供（非动态面板控制），不存在「提升父」
 *   的问题——保留在父级 ConfigProvider 即可。若后续要做 token 动态面板，再考虑提升。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `ComponentTokenDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 * 子组件 props 全部带默认值（对齐改造前父级初值），编辑态超集 props {bordered,virtual,size,
 * autoScroll} 不全也不崩（默认值兜底，单侧渲染完整演示 10 行带 expandable + rowSelection +
 * filters/sorter + pagination[top,bottom] 的表格）。
 *
 * === ★ §9 S30 cellFontSize 消费（已对齐 antd）===
 *
 * 历史背景：主题注入重构（task #26/#27）前，cellFontSize token 虽注入但表头/表体字号
 * 未消费该变量（旧 demo 注释曾记「computed fontSize 14 非 token 16」gap）。重构后已对齐：
 *
 * 注入链（Table.tsx `tableTokenToCssVars`，逐 antd 源码复刻）：
 *   `cellFontSize` 在 antd `prepareComponentToken` 默认输出
 *   （`ant-design/components/table/style/index.ts:467`）→ `prefixToken` 重命名为
 *   `TableCellFontSize` → `transformToken` + `token2CSSVar` 产出
 *   `--ant-table-cell-font-size`。MD/SM 同理产出 `-md` / `-sm`。
 *
 * 消费链（tokens.css + table.css）：
 *   `.dg-wrapper { font-size: var(--dg-font-size) }` → `--dg-font-size` 按 size 桥接
 *   `--ant-table-cell-font-size[-md|-sm]` → 表头/表体格继承。
 *
 * 结论：本 demo `cellFontSize:16` / `cellFontSizeMD:16` / `cellFontSizeSM:14` →
 *   左栏 data-grid 表头/表体 computed fontSize=16（large/medium），small=14（与右栏 antd 一致）。
 */

import { useState } from 'react'
import type { RadioChangeEvent } from 'antd'
import { ConfigProvider, Form, Radio, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + 各自 columns + 各自 defaultExpandable + 内联 DownOutlined 由子组件
//   提供（props 驱动）。RecordType/dataSource/defaultTitle/defaultFooter 现在由子文件各自 import
//   component-token.shared；父文件不再需要。
import ComponentTokenDg from './component-token.dg'
import ComponentTokenAntd from './component-token.antd'

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

export default function ComponentTokenDemo() {
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
          <Switch
            checked={expandableEnabled}
            onChange={setExpandableEnabled}
          />
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
        ★ 共享 ConfigProvider：两侧 Table 都包在同一个 ConfigProvider（theme.components.Table
        27 token）内。对 data-grid（useToken 读 → CSS variables 注入 .dg-wrapper）与 antd
        （cssinjs :where(.ant-table)）都生效，对照可见主题变化。
        minPaneWidth=600 → 横排阈值 ≈ 1216。常规笔记本视口（≥1280）即可横排；窄视口竖排。
      */}
      <ConfigProvider
        theme={{
          components: {
            Table: {
              colorBgContainer: '#e6f4ff',
              headerBg: '#1677ff',
              headerColor: '#fff',
              headerSortActiveBg: '#0958d9',
              headerSortHoverBg: '#69b1ff',
              bodySortBg: '#1677ff10',
              rowHoverBg: '#1677ff10',
              rowSelectedBg: '#bae0ff',
              rowSelectedHoverBg: '#91caff',
              rowExpandedBg: '#1677ff10',
              cellPaddingBlock: 20,
              cellPaddingInline: 20,
              cellPaddingBlockMD: 16,
              cellPaddingInlineMD: 16,
              cellPaddingBlockSM: 12,
              cellPaddingInlineSM: 12,
              borderColor: '#e6f4ff',
              headerBorderRadius: 0,
              footerBg: '#1677ff',
              footerColor: '#fff',
              cellFontSize: 16,
              cellFontSizeMD: 16,
              cellFontSizeSM: 14,
              headerSplitColor: '#fff',
              headerFilterHoverBg: 'rgba(0, 0, 0, 0.12)',
              filterDropdownMenuBg: '#fff',
              filterDropdownBg: '#fff',
              expandIconBg: '#e6f4ff',
            },
          },
        }}
      >
        <SplitDemo
          minPaneWidth={600}
          left={
            <ComponentTokenDg
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
            <ComponentTokenAntd
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
            <strong>对照说明（决策 9 B19 / S30 component-token 主题定制）：</strong>
            左右并排呈现 data-grid 与 antd component-token demo（ConfigProvider theme
            27 token + 动态面板），方便对照 token 注入效果。
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <strong>共享 ConfigProvider</strong>：两侧 Table 都包在同一个
                <code> ConfigProvider theme.components.Table</code>（27 token，蓝底表头白字 +
                padding 20 + 字号 16 + borderColor #e6f4ff + 圆角 0）。对 data-grid
                （useToken 读 → CSS variables 注入 .dg-wrapper）与 antd（cssinjs）都生效。
              </li>
              <li>
                <strong>共享动态面板</strong>：10 Switch + 5 Radio.Group 的同一组 state
                同时驱动两侧——bordered/loading/title/footer/header/expandable/checkbox/
                fixedHeader/hasData/ellipsis + size/tableScroll/tableLayout/paginationTop/
                paginationBottom。任一切换，左右同步 diff。
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
                <strong>★ §9 S30 cellFontSize 消费（已对齐）</strong>：ConfigProvider theme
                <code> cellFontSize:16</code>（large）/ <code>cellFontSizeMD:16</code>（medium）/
                <code>cellFontSizeSM:14</code>（small）→ 经 <code>tableTokenToCssVars</code> 注入
                <code>.dg-wrapper</code> inline <code>--ant-table-cell-font-size[-md|-sm]</code>
                变量 → <code>.dg-wrapper&#123;font-size:var(--dg-font-size)&#125;</code>（<code>--dg-font-size</code>
                按 size 桥接 <code>--ant-table-cell-font-size[-md|-sm]</code>）→ 表头/表体格继承 →
                <strong> 左右两栏 computed fontSize 均为 16（large/medium）/ 14（small），逐值一致</strong>。
                antd <code>genSizeStyle</code>（style/size.ts）同款机制。旧 §9「未消费」gap
                在主题注入重构（task #26/#27）后已闭合，本 demo 字号现已对齐。
              </li>
              <li>
                <strong>pagination</strong>（已知差异）：data-grid 默认不分页；本 demo 显式传
                <code> &#123; placement:[top,bottom] &#125;</code> 启用分页（与 antd 默认开启
                分页不同，但 demo 行为等价）。
              </li>
            </ul>
          </div>
        </SplitDemo>
      </ConfigProvider>
    </div>
  )
}

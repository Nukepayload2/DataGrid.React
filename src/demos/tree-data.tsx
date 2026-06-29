/**
 * 复刻 antd tree-data demo：`G:\Projects\ant-design\components\table\demo\tree-data.tsx`。
 *
 * === 决策 9 双栏对照（S13 树形数据）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——树形数据（childrenColumnName='children'）
 *   DFS 扁平化 + 首列缩进（level × indentSize 15px）+ 展开图标（▶/▼ toggle）+
 *   checkStrictly 父子联动（Switch 切换）。
 * - **右栏（antd Table）**：忠实复刻 antd tree-data demo（antd 原生 `<Table>` + childrenColumnName +
 *   原生树形展开 + 原生 checkStrictly）。
 * - **共享控制条**：`CheckStrictly` 开关同时驱动两侧（默认 false = 父子联动，对齐 antd demo），
 *   全宽置 SplitDemo 上方。
 * - **共享状态**：`checkStrictly` state，两侧共用同一个。rowSelection 的 onChange/... console.log
 *   各自独立（非共享选中态——本 demo 仅演示 checkStrictly 联动行为对照，不演示跨栏选中同步）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/tree-data.shared.ts`，两侧复用。
 *
 * === antd demo 要素 ===
 *
 * - dataSource record 含 `children` 嵌套子字段（默认 childrenColumnName='children'）→ 自动进入树形模式。
 * - 嵌套数据：John Brown sr. → 子树多层（John Brown / John Brown jr. → Jimmy Brown；
 *   Jim Green sr. → Jim Green → Jim Green jr. + Jimmy Green sr.）；Joe Black 无 children。
 * - 3 列 Name/Age/Address（首列 Name 含展开图标 + 缩进）。
 * - 顶部 `CheckStrictly` Switch（默认 **false** = 父子联动）。
 * - rowSelection 的 onChange / onSelect console.log。
 *
 * === S13 关键行为 ===
 *
 * - **扁平化**：嵌套 children DFS 扁平化；按展开状态过滤（仅展开父行的子孙可见）。
 *   默认未传 expandable → 仅顶层 2 行可见（John Brown sr. + Joe Black）。
 * - **首列缩进 + 展开图标**：Name 列单元格内，`level × indentSize`（indentSize 默认 15px，对齐
 *   antd 6.4.4 实测）左缩进；hasChildren 行渲染展开/收起图标（▶/▼），点击 toggle。
 * - **checkStrictly=false**（默认）：父子勾选联动——勾父→勾全部子；勾全部子→勾父（半选 indeterminate）。
 * - **checkStrictly=true**：独立勾选，父子不联动。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **checkStrictly 默认值（§9 S13/S25）**：data-grid 引擎层 `rowSelection.checkStrictly`
 *    默认 **true**（父子独立），antd 默认 **false**（父子联动）。本 demo 两侧均显式传
 *    `checkStrictly`（共享 state，初值 false 对齐 antd demo 演示意图），故两侧行为一致。
 * 2. **rowSelection.onSelect（决策 3 第二步未补齐）**：antd demo 含 `onSelect`（单行勾选回调）
 *    console.log；data-grid `TableRowSelection` 尚未声明 onSelect（仅 onChange），右栏 antd 保留
 *    onSelect、左栏 data-grid 用 onChange 观察勾选变化（功能等价）。
 * 3. **pagination 默认值（§9 S11，任务 G 已对齐）**：data-grid 引擎层 `pagination` 默认
 *    **undefined=不分页**（全显），antd Table 默认 **pagination 开启**（defaultPageSize=10 /
 *    placement=bottomEnd）。本 demo 左栏 data-grid **显式传 `pagination={{}}`** 复刻 antd 默认分页
 *    行为，故两侧翻页器渲染与配置一致（antd demo 未传 pagination → 默认开启，等价于左栏显式 `{}`）。
 *    本 demo 顶层仅 2 行 → pageSize=10 → 单页，但翻页器会渲染（total=2，single page，两侧一致）。
 *
 * === 决策 2 ===
 *
 * 树形展开行视为**普通表格行**：非虚拟走约定 `rowHeight`（track），
 * 虚拟路径同样被 RO 实测（measured-first + 约定兜底）
 * （见 task-plan §1.2 决策 2 + GridTable.tsx 文件头注释）。
 *
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：checkStrictly state（受控真理源，驱动两侧 + 顶部 CheckStrictly
 * Switch 控制条）+ useVirtualization + DemoToolbar(Switch CheckStrictly) + SplitDemo 外壳 +
 * children 对照说明。两侧表格 JSX 与各自列定义/rowSelection 拆到子文件：
 *   - `./tree-data.dg`：`TreeDataDg({checkStrictly, virtual})`（左栏）
 *   - `./tree-data.antd`：`TreeDataAntd({checkStrictly, virtual})`（右栏）
 *
 * ★ 状态提升说明：checkStrictly 必须留父——父渲染顶部 CheckStrictly Switch 控制条需直接读写它；
 *   且同一 state 驱动两侧同步。子组件接 checkStrictly 后各自拼到 rowSelection
 *   （列类型两侧不同：data-grid ColumnType vs antd TableProps['columns']）。checkStrictly 是受控
 *   配置型 state（非瞬时态），必须提升父；子组件用合理默认值 false 兜底编辑模式（对齐 antd demo）。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `TreeDataDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 虚拟化开关接入（决策 7）：顶栏 Switch ON 时两侧 Table 叠加 virtual + scroll.y。
// 树形展开行视为普通行（决策 2），虚拟路径同样被 RO 实测（measured-first + 约定兜底）。
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + 各自列定义 + rowSelection 由子组件提供（props 驱动）。
//   RecordType/data 现在由子文件各自 import tree-data.shared；父文件不再需要。
import TreeDataDg from './tree-data.dg'
import TreeDataAntd from './tree-data.antd'

export default function TreeDataDemo() {
  // ★ 共享状态（提升到父）：同一个 checkStrictly state 同时驱动两侧表格。
  // 默认 false（父子联动），对齐 antd tree-data demo（§9 S13：data-grid 引擎默认 true，此处
  // 显式传 false 覆盖，对齐 antd demo 演示意图）。
  const [checkStrictly, setCheckStrictly] = useState(false)
  // 虚拟化开关接入（决策 7）：顶栏 Switch ON 时两侧 Table 叠加 virtual + scroll.y。
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个 checkStrictly state 同时驱动两侧。 */}
      <DemoToolbar>
        <Space>
          <Switch
            checked={checkStrictly}
            onChange={setCheckStrictly}
            checkedChildren="CheckStrictly"
            unCheckedChildren="CheckStrictly"
          />
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            {checkStrictly
              ? 'checkStrictly=true（父子独立，互不影响）'
              : 'checkStrictly=false（默认，父子勾选联动）'}
          </span>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列 + 选择列 = 4 列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<TreeDataDg checkStrictly={checkStrictly} virtual={virtual} />}
        right={<TreeDataAntd checkStrictly={checkStrictly} virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 B15 / S13 树形数据）：</strong>
          左右并排呈现 data-grid 与 antd tree-data demo（childrenColumnName='children' +
          首列缩进 + 展开图标 + checkStrictly 父子联动）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>树形数据</strong>：record 含 <code>children</code> 嵌套 → 自动进入树形模式；
              默认未传 expandable → 仅顶层 2 行可见（John Brown sr. + Joe Black）。
            </li>
            <li>
              <strong>展开/缩进</strong>：点 Name 列展开图标（▶/▼）→ DFS 扁平化按展开状态过滤；
              缩进 = <code>level × indentSize(15px)</code>（对齐 antd 6.4.4 实测）。
            </li>
            <li>
              <strong>CheckStrictly 开关（核心）</strong>：共享 state 同时驱动两侧——
              <code> false</code>（默认）= 父子勾选联动（勾父→全部子；勾全部子→父半选/全选）；
              <code> true</code> = 父子独立勾选。切换一次、两侧同步 diff。
            </li>
            <li>
              <strong>引擎默认差异（§9 S13/S25）</strong>：data-grid <code>rowSelection.checkStrictly</code>
              默认 <strong>true</strong>（父子独立），antd 默认 <strong>false</strong>（父子联动）；
              本 demo 两侧均显式传共享 state，规避引擎默认差异。
            </li>
            <li>
              <strong>onSelect 差异</strong>：antd demo 含 <code>onSelect</code>（单行勾选回调）
              console.log；data-grid <code>TableRowSelection</code> 尚未声明 onSelect
              （决策 3 第二步补齐），左栏用 <code>onChange</code> 观察变化，功能等价。
            </li>
            <li>
              <strong>决策 2</strong>：树形展开行视为普通表格行（虚拟路径同样被 RO 实测，measured-first + 约定兜底）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

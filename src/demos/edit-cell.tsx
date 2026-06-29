/**
 * 复刻 antd `edit-cell` demo（S15 验收）：
 *   `G:\Projects\ant-design\components\table\demo\edit-cell.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致 —— `components.body.cell/row` + `onCell` 编辑。
 *   ★ data-grid div 渲染适配：EditableCell 返回**内容 ReactNode（不包 td）**；EditableRow 用
 *   `Form component={false}` + Context.Provider（不产生 DOM），行内单元格穿透为 grid 直接子元素，
 *   引擎在 components.body.row 提供时强制走 multi 显式定位路径。
 * - **右栏（antd Table）**：忠实复刻 antd edit-cell demo —— antd `components.body.cell/row` +
 *   onCell（EditableRow 返回 `<tr>`、EditableCell 返回 `<td>`）+ `rowClassName='editable-row'` +
 *   CSS（.editable-cell-value-wrap hover 边框）。
 * - **共享控制条**：无（按 antd demo 原结构——Add a row 按钮在 Table 上方，各 pane 内各自维护）。
 *   编辑是局部交互（点击单元格→Form.Input→save），两栏各自编辑便于对照（共用 dataSource 会
 *   互相干扰——一个单元格进入编辑态另一侧跟着进编辑态无意义）。故两侧各自维护
 *   `dataSource`/`count` state，初始数据相同（_compare/edit-cell.shared.ts）。
 * - **共享数据**：`RecordType` + `defaultData`/`defaultCount`/`makeNewRow` 见 `_compare/edit-cell.shared.ts`。
 *
 * === 两侧保留的差异（如实呈现）===
 *
 * 1. **EditableCell 返回值**：左栏 data-grid 返回内容 ReactNode（不包 td，引擎渲染在
 *    `.dg-cell-inner`）；右栏 antd 返回 `<td {...restProps}>`（原生 td）。
 * 2. **EditableRow 返回值**：左栏 `Form component={false}`+Provider（不产生 DOM，单元格穿透为
 *    grid 直接子元素）；右栏 `Form component={false}`+Provider+`<tr {...props} />`（原生 tr）。
 * 3. **rowClassName**：左栏 data-grid 支持 rowClassName（透传到该行所有数据单元格 className），
 *    传 `() => 'editable-row'`；右栏 antd 原生 rowClassName，同款。
 * 4. **CSS**：注入 antd demo 配套 CSS（`.editable-cell-value-wrap` hover 边框）到 document.head
 *    （仅注入一次），两侧共享（data-grid 单元格 hover 同样触发边框）。
 *
 * === ★ Form context 透传（关键）===
 *
 * antd Form context 是 React context，**不依赖 DOM 层级**（跨组件树传递）。data-grid 的 div
 * 渲染层级（dg-row/dg-cell）不改变 React 组件树层级，故 Form context 正常透传到 EditableCell
 * 内的 Form.Item。S15 已验证 save(validateFields) 成功。
 *
 * === 验证点（S15 + 决策 9）===
 *
 * 1. 两侧 name 列单元格点击 → 进入编辑态（Input 自动聚焦、预填当前值）。
 * 2. 回车/失焦 → 校验通过则保存（表格更新）+ 退出编辑；空值校验失败 console.log + 保持编辑。
 * 3. 各 pane 内 `Add a row` 按钮 → 追加新行（各自 count 递增）。
 * 4. Delete 链接 → Popconfirm 确认后删除该行（两侧各自，>=1 行显示 Delete）。
 * 5. hover name 单元格 → `.editable-cell-value-wrap` 显示边框（两侧同款 CSS）。
 *
 * === 拆子文件（task：live 编辑接入，Pane 组件直接变子文件）===
 *
 * 父文件只保留「外壳职责」：useVirtualization + SplitDemo 外壳 + children 对照说明。
 * 原始 demo 已有左右独立 Pane（DgEditCellPane/AntdEditCellPane）+ injectEditCellCss CSS 注入 +
 * 增删行 state——Pane 组件直接变子文件（重命名为 EditCellDg/EditCellAntd），CSS 注入逻辑保留
 * （幂等，两子组件共用同一 CSS，各自 useEffect 调 injectEditCellCss），增删行 state 各侧独立自管：
 *   - `./edit-cell.dg`：`EditCellDg({virtual})`（左栏）
 *   - `./edit-cell.antd`：`EditCellAntd({virtual})`（右栏）
 *
 * ★ state 提升决策（SOP）：本 demo 无外部控制条，编辑/增删行 state 全留各侧子组件内自管（原始
 * 决策「编辑各自独立」——共用 dataSource 会互相干扰）。CSS 注入从父 useEffect 移到各子组件
 * useEffect（子文件自包含），幂等检查保证两子组件共用同一 `<style>` 不重复注入。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `EditCellDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 * 子组件 props 全部带默认值（virtual=false），编辑态超集 props {bordered,virtual,size,autoScroll}
 * 不全也不崩（编辑/增删行 state 全在子组件内自管）。
 */

import { SplitDemo } from './_compare/SplitDemo'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（编辑态单元格在虚拟窗口内正常工作，
// Form context 透传不依赖 DOM 层级）。
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 Pane + EditableRow/EditableCell + CSS 注入 + 增删行 state 由子组件提供。
//   RecordType/defaultData/makeNewRow 现在由子文件各自 import edit-cell.shared；父文件不再需要。
import EditCellDg from './edit-cell.dg'
import EditCellAntd from './edit-cell.antd'

// ===========================================================================
// Demo 根组件
// ===========================================================================

export default function EditCellDemo() {
  // 虚拟化开关接入（决策 7）：顶栏 Switch ON 时两侧 Table 叠加 virtual + scroll.y。
  // 编辑态单元格在虚拟窗口内正常工作（Form context 透传不依赖 DOM 层级）。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/*
        minPaneWidth=480（窄表，4 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<EditCellDg virtual={virtual} />}
        right={<EditCellAntd virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 B17 / S15）：</strong>
          左右并排呈现 data-grid 与 antd edit-cell（components.body.cell/row + onCell 编辑 + 增删行）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Add a row</strong>：各 pane 内按钮独立追加新行（按 antd demo 原结构——Add 在
              Table 上方，各 pane 各自维护 <code>dataSource</code>/<code>count</code> state）。
              两栏初始数据相同（<code>_compare/edit-cell.shared.ts</code>）。
            </li>
            <li>
              <strong>编辑各自独立</strong>：点击 name 单元格进入编辑（回车/失焦保存）。编辑是局部
              交互，两栏各自编辑便于对照（共用 dataSource 会互相干扰——一个单元格进入编辑态另一侧
              跟着进编辑态无意义）。
            </li>
            <li>
              <strong>Delete</strong>：Popconfirm 确认后删除该行（两侧各自，{' '}
              <code>dataSource.length &gt;= 1</code> 显示）。
            </li>
            <li>
              <strong>★ data-grid 适配</strong>：左栏 EditableCell 返回
              <strong> 内容 ReactNode（不包 td）</strong>；EditableRow 用
              <code> Form component=&#123;false&#125;</code> + Provider（不产生 DOM），单元格穿透为
              grid 直接子元素。右栏 antd 原生 <code>&lt;td&gt;</code>/<code>&lt;tr&gt;</code>。
            </li>
            <li>
              <strong>Form context 透传</strong>：React context 不依赖 DOM 层级，data-grid div 渲染
              不影响 Form context 透传到 EditableCell 内的 Form.Item（S15 已验证 save(validateFields) 成功）。
            </li>
            <li>
              <strong>rowClassName + CSS</strong>：两侧均传 <code>rowClassName</code> 返回
              <code>{'editable-row'}</code> + 同款 <code>.editable-cell-value-wrap</code> hover 边框 CSS
              （注入 document.head，两子组件共用同一 CSS，幂等检查防重复注入）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

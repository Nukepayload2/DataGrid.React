/**
 * 复刻 antd `edit-row` demo（S16 验收）：
 *   `G:\Projects\ant-design\components\table\demo\edit-row.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致 —— 行级 editingKey + Edit/Save/Cancel +
 *   InputNumber(age)/Input + 100 行分页 + Form 外层。★ data-grid div 渲染适配：EditableCell 返回
 *   **内容 ReactNode（不包 td）**，引擎渲染在 `.dg-cell-inner`。
 * - **右栏（antd Table）**：忠实复刻 antd edit-row demo —— antd `components.body.cell` 返回 `<td>` +
 *   onCell + Form 外层 + `rowClassName='editable-row'` + CSS（.editable-row .ant-form-item-explain 定位）。
 * - **共享控制条**：无（按 antd demo 原结构——无控制条，operation 列内 Edit/Save/Cancel）。
 *   编辑是局部交互（行级 editingKey + Form），两栏各自编辑便于对照（共用 form/data/editingKey 会
 *   互相干扰——两栏同时只能编辑一行、Form 共享会冲突）。故两侧各自维护 `form`/`data`/`editingKey`
 *   state，初始数据相同（_compare/edit-row.shared.ts）。
 * - **共享数据**：`RecordType` + `originData`（100 行）见 `_compare/edit-row.shared.ts`。
 *
 * === 两侧保留的差异（如实呈现）===
 *
 * 1. **EditableCell 返回值**：左栏 data-grid 返回内容 ReactNode（不包 td）；右栏 antd 返回
 *    `<td {...restProps}>`（原生 td）。
 * 2. **Form 位置**：两侧均 Form 在 Table 外层（`Form component={false}` 不产生 DOM），Form.Item 在
 *    EditableCell 内，通过 React FormContext（不依赖 DOM 层级）访问 Form 实例。
 * 3. **无 components.body.row**：两侧均无（区别 S15 的 EditableRow——S16 整表共享一个 Form，靠
 *    editingKey 区分当前编辑行）。
 * 4. **rowClassName**：左栏 data-grid 支持 rowClassName（透传到该行所有数据单元格 className），
 *    传 `'editable-row'`；右栏 antd 原生 rowClassName，同款。
 * 5. **CSS**：注入 antd demo 配套 CSS（`.editable-row .ant-form-item-explain` 定位）到 document.head
 *    （仅注入一次），两侧共享。
 *
 * === ★ Form context 透传（关键，与 S15 同）===
 *
 * antd Form context 是 React context，**不依赖 DOM 层级**（跨组件树传递）。data-grid 的 div 渲染
 * 层级（dg-row/dg-cell）不改变 React 组件树层级，故 Form（在 Table 外层）的 context 正常透传到
 * EditableCell 内的 Form.Item。S16 已验证 save(validateFields) 成功。
 *
 * === 验证点（S16 + 决策 9）===
 *
 * 1. 两侧 100 行数据分页（默认 10 行/页），bordered 表格。
 * 2. 点击某行 operation 列 `Edit` → 该行 name/age/address 三列进入编辑态（Input/InputNumber），
 *    operation 列变 Save+Cancel；其他行 Edit 禁用。
 * 3. `Save`：校验通过则保存（表格更新）+ 退出编辑；空值校验失败 console.log Validate Failed。
 * 4. `Cancel`（Popconfirm 确认）：退出编辑不保存。
 * 5. 翻页（pagination.onChange）→ 自动 cancel 退出编辑。
 * 6. age 列编辑用 InputNumber（number 类型），name/address 用 Input（text 类型）。
 *
 * === 拆子文件（task：live 编辑接入，Pane 组件直接变子文件）===
 *
 * 父文件只保留「外壳职责」：useVirtualization + SplitDemo 外壳 + children 对照说明。
 * 原始 demo 已有左右独立 Pane（DgEditRowPane/AntdEditRowPane）+ injectEditRowCss CSS 注入 +
 * 行级编辑 state——Pane 组件直接变子文件（重命名为 EditRowDg/EditRowAntd），CSS 注入逻辑保留
 * （幂等，两子组件共用同一 CSS，各自 useEffect 调 injectEditRowCss），行级编辑 state 各侧独立自管：
 *   - `./edit-row.dg`：`EditRowDg({virtual})`（左栏）
 *   - `./edit-row.antd`：`EditRowAntd({virtual})`（右栏）
 *
 * ★ state 提升决策（SOP）：本 demo 无外部控制条，行级编辑 state（form/data/editingKey）全留各侧
 * 子组件内自管（原始决策「编辑各自独立」——共用 form/data/editingKey 会冲突）。CSS 注入从父
 * useEffect 移到各子组件 useEffect（子文件自包含），幂等检查保证两子组件共用同一 `<style>` 不重复注入。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `EditRowDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 * 子组件 props 全部带默认值（virtual=false），编辑态超集 props {bordered,virtual,size,autoScroll}
 * 不全也不崩（行级编辑 state 全在子组件内自管）。
 */

import { SplitDemo } from './_compare/SplitDemo'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（编辑态单元格在虚拟窗口内正常工作，
// Form context 透传不依赖 DOM 层级）。
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 Pane + EditableCell + CSS 注入 + 行级编辑 state 由子组件提供。
//   RecordType/originData 现在由子文件各自 import edit-row.shared；父文件不再需要。
import EditRowDg from './edit-row.dg'
import EditRowAntd from './edit-row.antd'

// ===========================================================================
// Demo 根组件
// ===========================================================================

export default function EditRowDemo() {
  // 虚拟化开关接入（决策 7）：顶栏 Switch ON 时两侧 Table 叠加 virtual + scroll.y。
  // 100 行分页虚拟化有意义；编辑态单元格在虚拟窗口内正常工作（Form context 透传不依赖 DOM 层级）。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/*
        minPaneWidth=480（窄表，4 列无 scroll.x + 分页）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<EditRowDg virtual={virtual} />}
        right={<EditRowAntd virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 B17 / S16）：</strong>
          左右并排呈现 data-grid 与 antd edit-row（行级 editingKey + Edit/Save/Cancel +
          InputNumber(age)/Input + 100 行分页 + Form 外层）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Edit/Save/Cancel</strong>：operation 列内（按 antd demo 原结构）。点击 Edit →
              整行进入编辑（age 用 <strong>InputNumber</strong>，name/address 用 <strong>Input</strong>），
              同时其他行 Edit 禁用。<strong>Save</strong> 保存，<strong>Cancel</strong>（Popconfirm）放弃；
              翻页自动取消编辑。
            </li>
            <li>
              <strong>编辑各自独立</strong>：两侧各自维护 <code>form</code>/<code>data</code>/
              <code>editingKey</code> state（共用会冲突——两栏同时只能编辑一行、Form 共享串台）。
              初始数据相同（<code>_compare/edit-row.shared.ts</code>，100 行）。
            </li>
            <li>
              <strong>★ data-grid 适配</strong>：左栏 EditableCell 返回
              <strong> 内容 ReactNode（不包 td）</strong>；右栏 antd 原生 <code>&lt;td&gt;</code>。
              两侧均 <strong>Form 在 Table 外层</strong>（<code>component=&#123;false&#125;</code> 不产生 DOM），
              <strong>无 components.body.row</strong>（区别 S15）。
            </li>
            <li>
              <strong>Form context 透传</strong>：React FormContext 不依赖 DOM 层级，data-grid div 渲染
              不影响 Form context（在 Table 外层）透传到 EditableCell 内的 Form.Item（S16 已验证
              save(validateFields) 成功）。
            </li>
            <li>
              <strong>rowClassName + CSS</strong>：两侧 <code>rowClassName="editable-row"</code> + 同款
              <code> .editable-row .ant-form-item-explain</code> 校验错误定位 CSS（注入 document.head）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

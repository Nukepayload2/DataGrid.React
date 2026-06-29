/**
 * 复刻 antd 测试 `Table.rowSelection.test.tsx:807-829`（selection 列邻列 fixed 继承）
 * + useSelection.tsx:694-717 的继承逻辑，用双栏 demo 可视化对照。
 *
 * === 验证目标（写在此处便于无 console 环境核对）===
 *
 * 1. **首列 fixed=on + rowSelection.fixed=auto**：两侧 selection 列都跟随 fixed:'start'，
 *    固定到最左（与 Name 列同侧）—— 邻列继承生效（对齐 antd useSelection.tsx:703-707
 *    nextCol 优先）。
 * 2. **首列 fixed=off + rowSelection.fixed=auto**：两侧 selection 列都不固定（随横向滚动）。
 * 3. **rowSelection.fixed='end'**：显式覆盖邻列继承，两侧 selection 列固定到最右
 *    （优先级：显式 > 继承）。
 * 4. **rowSelection.fixed='start'**：显式固定到最左（与首列 fixed 无关）。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行选择列 fixed 继承邻列（A1 修复后行为）。
 * - **右栏（antd Table）**：antd useSelection 原生继承逻辑（对照基准）。
 * - **共享控制条**：Selection type（checkbox/radio）、First column fixed 开关、
 *   rowSelection.fixed 选择（auto / 'start' / 'end'）—— 同一组 state 同时驱动两侧。
 * - **同构列**：首列 Name（width 200，fixed 由开关控）→ 中间 6 个占位列（width 100）→
 *   末列 Action（width 100，fixed 'end'，render `<a>action</a>`）。两侧列定义结构等价。
 * - **scroll={{ x: 1200 }}**：强制横向滚动，让 fixed 效果可见。
 *
 * === antd 测试要素（Table.rowSelection.test.tsx:807-829）===
 *
 * - 首列 fixed:'left'，rowSelection 不设 fixed → selection 列应继承 fixed:'left'（antd 行为）。
 * - data-grid 对齐为 fixed:'start'（normalizeFixed 把 'left' 映射 'start'）。
 *
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：selectionType/firstColFixed/selFixed/selectedKeys state
 * （受控真理源，驱动两侧 + 顶部控制条）+ useVirtualization + DemoToolbar(Selection type
 * + First column fixed + rowSelection.fixed) + SplitDemo 外壳 + children 对照说明。
 * 两侧表格 JSX 与各自列定义/fixed 派生拆到子文件（props 驱动）：
 *   - `./row-selection-fixed.dg`：`RowSelectionFixedDg({selectionType, firstColFixed, selFixed, selectedKeys, onSelectedKeysChange, virtual})`（左栏）
 *   - `./row-selection-fixed.antd`：`RowSelectionFixedAntd(...)`（右栏，同款 props 签名）
 *
 * ★ 状态提升说明：四个 state 均留父——父渲染顶部控制条需直接读写它们；且同一组 state
 *   驱动两侧同步。子组件接 props + onSelectedKeysChange 回调（受控选择 + 配置型 state 提升）。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `RowSelectionFixedDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Radio, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + rowSelection 派生由子组件提供（props 驱动）。
//   类型 SelectionType/SelFixed 由 dg 子文件导出，antd 子文件本地声明同款（scope 安全）。
import RowSelectionFixedDg, {
  type SelectionType,
  type SelFixed,
} from './row-selection-fixed.dg'
import RowSelectionFixedAntd from './row-selection-fixed.antd'

// ---------------------------------------------------------------------------
// 控制条选项
// ---------------------------------------------------------------------------

const rowSelectionFixedOptions: Array<{ value: SelFixed; label: string }> = [
  { value: 'auto', label: 'auto (邻列继承)' },
  { value: 'start', label: "start ('left')" },
  { value: 'end', label: "end ('right')" },
]

const selectionTypeOptions: Array<{ value: SelectionType; label: string }> = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function RowSelectionFixedDemo() {
  // ★ 共享状态（提升到父）：同一组 state 同时驱动两侧表格 + 顶部控制条。
  // 提升原因：控制条需直接读写这四个 state；切换 selectionType 时清空 selectedKeys
  // （checkbox/radio 选择语义不同，残留旧选择会越界）。
  const [selectionType, setSelectionType] = useState<SelectionType>('checkbox')
  const [firstColFixed, setFirstColFixed] = useState(true)
  const [selFixed, setSelFixed] = useState<SelFixed>('auto')
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y。
  const { virtual } = useVirtualization()
  // 主题 token：验证点说明区文字色 token 化（colorTextSecondary≈rgba(0,0,0,0.65)），暗主题自适应。
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一组 state 同时驱动两侧表格。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0。 */}
      <DemoToolbar>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            alignItems: 'center',
          }}
        >
          {/* Selection type */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 500 }}>Selection type:</span>
            <Radio.Group
              value={selectionType}
              onChange={(e) => {
                setSelectionType(e.target.value)
                setSelectedKeys([])
              }}
              options={selectionTypeOptions}
              optionType="button"
              buttonStyle="solid"
            />
          </label>

          {/* First column fixed 开关 */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 500 }}>First column fixed:</span>
            <Switch
              checked={firstColFixed}
              onChange={(v) => setFirstColFixed(v)}
            />
          </label>

          {/* rowSelection.fixed 选择 */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 500 }}>rowSelection.fixed:</span>
            <Radio.Group
              value={selFixed}
              onChange={(e) => setSelFixed(e.target.value)}
              options={rowSelectionFixedOptions}
              optionType="button"
              buttonStyle="solid"
            />
          </label>
        </div>
      </DemoToolbar>

      {/*
        minPaneWidth=520（含 selection 列 + 8 列 + scroll.x=1200）→ 横排阈值 ≈ 1056。
        常规笔记本视口（≥1280）横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={520}
        left={
          <RowSelectionFixedDg
            selectionType={selectionType}
            firstColFixed={firstColFixed}
            selFixed={selFixed}
            selectedKeys={selectedKeys}
            onSelectedKeysChange={setSelectedKeys}
            virtual={virtual}
          />
        }
        right={
          <RowSelectionFixedAntd
            selectionType={selectionType}
            firstColFixed={firstColFixed}
            selFixed={selFixed}
            selectedKeys={selectedKeys}
            onSelectedKeysChange={setSelectedKeys}
            virtual={virtual}
          />
        }
      >
        <div style={{ marginTop: 12, color: token.colorTextSecondary, fontSize: 13 }}>
          <strong>验证点：</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            <li>
              <code>First column fixed=on + rowSelection.fixed=auto</code> →
              两侧 selection 列跟随 fixed 到最左（<strong>邻列继承</strong>，
              对齐 antd useSelection.tsx:703-707 nextCol 优先）。
            </li>
            <li>
              <code>First column fixed=off + rowSelection.fixed=auto</code> →
              两侧 selection 列不固定（随横向滚动）。
            </li>
            <li>
              <code>rowSelection.fixed='end'</code> → 显式覆盖继承，两侧
              selection 列固定到最右（优先级：显式 &gt; 继承）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

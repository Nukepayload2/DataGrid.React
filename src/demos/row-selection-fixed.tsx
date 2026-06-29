/**
 * row-selection-fixed 双栏对照 demo：复刻 antd 测试 `Table.rowSelection.test.tsx:807-829`
 * （selection 列邻列 fixed 继承）+ useSelection.tsx:694-717 的继承逻辑。
 *
 * - **左栏（data-grid Table）**：行选择列 fixed 继承邻列。
 * - **右栏（antd Table）**：antd useSelection 原生继承逻辑（对照基准）。
 * - **共享控制条**：Selection type（checkbox/radio）、First column fixed 开关、
 *   rowSelection.fixed 选择（auto / 'start' / 'end'）—— 同一组 state 同时驱动两侧。
 * - **同构列**：首列 Name（width 200，fixed 由开关控）→ 中间 6 个占位列（width 100）→
 *   末列 Action（width 100，fixed 'end'，render `<a>action</a>`）。两侧列定义结构等价。
 * - **scroll={{ x: 1200 }}**：强制横向滚动，让 fixed 效果可见。
 *
 * fixed 继承语义：首列 fixed:'left'，rowSelection 不设 fixed → selection 列继承 fixed:'left'（antd 行为）。
 * data-grid 对齐为 fixed:'start'（normalizeFixed 把 'left' 映射 'start'）。
 */

import { useState } from 'react'
import { Radio, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'
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
  // 共享状态（提升到父）：同一组 state 同时驱动两侧表格 + 顶部控制条。
  // 切换 selectionType 时清空 selectedKeys（checkbox/radio 选择语义不同，残留旧选择会越界）。
  const [selectionType, setSelectionType] = useState<SelectionType>('checkbox')
  const [firstColFixed, setFirstColFixed] = useState(true)
  const [selFixed, setSelFixed] = useState<SelFixed>('auto')
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y。
  const { virtual } = useVirtualization()
  // 主题 token：说明区文字色 token 化，暗主题自适应。
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      {/* 共享控制条：全宽，在 SplitDemo 上方。同一组 state 同时驱动两侧表格。
          DemoToolbar 用 useToken 适配主题（light/dark/自定义 token 自适应）。 */}
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
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd 行选择列 fixed 继承行为。
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>fixed 取值命名</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 用 <code>fixed:'start'/'end'</code>；
                  右栏 antd 用 <code>fixed:'left'/'right'</code>。控制条 selFixed 取值
                  （'start'/'end'）在右栏 antd 映射为 'left'/'right'。</li>
                <li><strong>触发条件</strong>：首列 fixed 开关 / rowSelection.fixed 选择。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid 起止方向语义（start/end），
                  引擎 normalizeFixed 把 antd 的 'left'/'right' 映射为 'start'/'end'，
                  两侧最终视觉效果等价。详见 <code>docs/design-notes/fixed-column.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>邻列继承场景</strong>（两侧行为一致，固定效果可见）：
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><code>First column fixed=on + rowSelection.fixed=auto</code> →
                  两侧 selection 列跟随 fixed 到最左（<strong>邻列继承</strong>）。</li>
                <li><code>First column fixed=off + rowSelection.fixed=auto</code> →
                  两侧 selection 列不固定（随横向滚动）。</li>
                <li><code>rowSelection.fixed='end'</code> → 显式覆盖继承，两侧 selection 列
                  固定到最右（优先级：显式 &gt; 继承）。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

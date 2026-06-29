/**
 * 复刻 antd row-selection demo：`G:\Projects\ant-design\components\table\demo\row-selection.tsx`。
 *
 * 双栏对照：左栏 data-grid Table（rowSelection type 切换 + getCheckboxProps 禁用行 + onChange），
 * 右栏忠实复刻 antd row-selection demo。
 * 共享 `Selection Type` Radio.Group 切换 type（同一个 state 驱动两侧），切换时同步清空 selectedKeys
 * （避免 checkbox→radio 残留多选）。共享数据见 `_compare/row-selection.shared.ts`。
 */

import { useState } from 'react'
import { Radio, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import RowSelectionDg from './row-selection.dg'
import RowSelectionAntd from './row-selection.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

type SelectionType = 'checkbox' | 'radio'

export default function RowSelectionDemo() {
  // 共享状态（提升到父）：顶部控制条需直接操作「切 type 时清空选择」。
  const [selectionType, setSelectionType] = useState<SelectionType>('checkbox')
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  // 切换 type 时清空已选（避免 checkbox→radio 时残留多选），同步两侧。
  const handleTypeChange = (v: SelectionType) => {
    setSelectionType(v)
    setSelectedKeys([])
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 共享控制条：全宽，在 SplitDemo 上方。同一组 state 同时驱动两侧表格。 */}
      <DemoToolbar>
        <Space>
          <span style={{ color: token.colorTextSecondary }}>Selection Type:</span>
          <Radio.Group
            onChange={(e) => handleTypeChange(e.target.value as SelectionType)}
            value={selectionType}
          >
            <Radio value="checkbox">Checkbox</Radio>
            <Radio value="radio">Radio</Radio>
          </Radio.Group>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列无 scroll.x + 选择列=4 列）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <RowSelectionDg
            selectionType={selectionType}
            selectedKeys={selectedKeys}
            onTypeChange={handleTypeChange}
            onSelectedKeysChange={setSelectedKeys}
            virtual={virtual}
          />
        }
        right={
          <RowSelectionAntd
            selectionType={selectionType}
            selectedKeys={selectedKeys}
            onTypeChange={handleTypeChange}
            onSelectedKeysChange={setSelectedKeys}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd row-selection demo，
          顶部 Radio.Group 共享 type 切换 + getCheckboxProps 禁用行 + 受控 selectedKeys。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>type 控件</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏顶部与 demo 内 Selection Type 用原生
                  <code> &lt;input type="radio"&gt;</code> RadioGroup；右栏用 antd
                  <code> &lt;Radio.Group&gt;</code>。</li>
                <li><strong>触发条件</strong>：始终（demo 写死）。</li>
                <li><strong>差异原因</strong>：data-grid 引擎不依赖 antd 本体控件，选用最小原生实现；
                  两者 <code>value</code>/<code>onChange</code> 语义等价。</li>
              </ul>
            </li>
            <li>
              <strong>分隔线</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏用 <code>border-top</code>（取 antd token CSS var
                  <code>var(--ant-color-border-secondary)</code>）；右栏 antd <code>&lt;Divider&gt;</code>。</li>
                <li><strong>触发条件</strong>：始终（demo 写死）。</li>
                <li><strong>差异原因</strong>：左栏避免依赖 antd 组件，用 token 自适应主题保持视觉对齐。</li>
              </ul>
            </li>
            <li>
              <strong>onChange 回调签名</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid <code>onChange(keys, rows, info)</code> 三参；
                  antd <code>onChange(keys, rows)</code> 两参。</li>
                <li><strong>触发条件</strong>：勾选/取消勾选任一行。</li>
                <li><strong>差异原因</strong>：data-grid 额外提供 <code>info</code>（区分用户操作来源），
                  demo 仅用前两参与 antd 对照。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

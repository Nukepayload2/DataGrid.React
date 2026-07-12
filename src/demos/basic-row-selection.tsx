import { useState } from 'react'
import { Radio, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import RowSelectionDg from './basic-row-selection.dg'
import RowSelectionAntd from './basic-row-selection.antd'

type SelectionType = 'checkbox' | 'radio'

export default function RowSelectionDemo() {
  const [selectionType, setSelectionType] = useState<SelectionType>('checkbox')
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  const handleTypeChange = (v: SelectionType) => {
    setSelectionType(v)
    setSelectedKeys([])
  }

  return (
    <div style={{ padding: 24 }}>
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

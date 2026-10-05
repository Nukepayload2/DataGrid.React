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
    <div className="demo-view">
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
          <strong>对照说明：</strong>前后两栏呈现 data-grid 与 antd row-selection demo，
          顶部 Radio.Group 共享 type 切换 + getCheckboxProps 禁用行 + 受控 selectedKeys。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>type 控件（demo 实现细节）</strong>：顶部工具栏的 Selection Type 是 antd
              <code>&lt;Radio.Group&gt;</code>，经共享 state 同时驱动两栏；前栏变体在栏内另渲染一份原生
              <code>&lt;input type="radio"&gt;</code> 最小 RadioGroup，后栏变体用 antd
              <code>&lt;Radio.Group&gt;</code>。栏内控件为 demo 文件层选择——data-grid 引擎的选择控件
              内部实际用 antd Checkbox/Radio 渲染（antd 为 peerDependency）。
            </li>
            <li>
              <strong>分隔线（demo 实现细节）</strong>：前栏变体用 <code>border-top</code>（取 antd token CSS var
              <code>var(--ant-color-border-secondary)</code>）；后栏变体用 antd <code>&lt;Divider&gt;</code>。
            </li>
            <li>
              <strong>onChange 回调签名</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧 <code>onChange(keys, rows, info)</code> 均为三参
                  （antd 类型含第三参 <code>info: {'{ type }'}</code>）；两栏 demo 处理器均只取前两参。</li>
                <li><strong>触发条件</strong>：勾选/取消勾选任一行。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

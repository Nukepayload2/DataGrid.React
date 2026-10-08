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
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd row-selection demo，
          顶部 Radio.Group 共享 type 切换 + getCheckboxProps 禁用行 + 受控 selectedKeys。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>type 控件</strong>：顶部工具栏的 Selection Type 是共享的
              <code>&lt;Radio.Group&gt;</code>，同时驱动两栏的选择模式（Checkbox / Radio）。
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

import { useState } from 'react'
import { Radio, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import RowSelectionFixedDg, {
  type SelectionType,
  type SelFixed,
} from './fixed-selection-column.dg'
import RowSelectionFixedAntd from './fixed-selection-column.antd'

const rowSelectionFixedOptions: Array<{ value: SelFixed; label: string }> = [
  { value: 'auto', label: 'auto (邻列继承)' },
  { value: 'start', label: "start ('left')" },
  { value: 'end', label: "end ('right')" },
]

const selectionTypeOptions: Array<{ value: SelectionType; label: string }> = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
]

export default function RowSelectionFixedDemo() {
  const [selectionType, setSelectionType] = useState<SelectionType>('checkbox')
  const [firstColFixed, setFirstColFixed] = useState(true)
  const [selFixed, setSelFixed] = useState<SelFixed>('auto')
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div className="demo-view">
      <DemoToolbar>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            alignItems: 'center',
          }}
        >
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
          <strong>对照说明：</strong>前后两栏呈现 data-grid 与 antd 行选择列 fixed 继承行为。
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>fixed 取值命名</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：前栏 data-grid 用 <code>fixed:'start'/'end'</code>；
                  后栏 antd 用 <code>fixed:'left'/'right'</code>。控制条 selFixed 取值
                  （'start'/'end'）在后栏 antd 映射为 'left'/'right'。</li>
                <li><strong>触发条件</strong>：首列 fixed 开关 / rowSelection.fixed 选择。</li>
                <li><strong>说明</strong>：两侧最终视觉效果等价；本页用 start/end 和 left/right 分别展示同一固定方向。</li>
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

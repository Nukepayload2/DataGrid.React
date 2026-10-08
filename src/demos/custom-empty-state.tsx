import { useState } from 'react'
import { Button, Empty, Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { genFakeData, type RecordType } from './_compare/custom-empty-state.shared'
import { useVirtualization } from './VirtualizationContext'
import CustomEmptyDg from './custom-empty-state.dg'
import CustomEmptyAntd from './custom-empty-state.antd'

export default function App() {
  const [dataSource, setDataSource] = useState<RecordType[]>([])
  const [bordered, setBordered] = useState(true)
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  const handleToggle = () => {
    setDataSource(dataSource.length ? [] : genFakeData(Math.floor(Math.random() * 10)))
  }

  const toggleButton = (
    <Button type="primary" onClick={handleToggle}>
      Toggle Data
    </Button>
  )
  const emptyText = <Empty description="No Data">{toggleButton}</Empty>

  return (
    <div className="demo-view">
      
      <DemoToolbar>
        <Space wrap>
          {dataSource.length ? toggleButton : null}
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            当前：{dataSource.length ? `${dataSource.length} 行数据` : '空数据'}
            （空数据态点 Age 列的筛选图标看 'Table.filter' 占位）
          </span>
        </Space>
      </DemoToolbar>

      
      <SplitDemo
        minPaneWidth={480}
        left={
          <CustomEmptyDg
            bordered={bordered}
            dataSource={dataSource}
            emptyText={emptyText}
            virtual={virtual}
          />
        }
        right={
          <CustomEmptyAntd
            bordered={bordered}
            dataSource={dataSource}
            emptyText={emptyText}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd 自定义空状态。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>'Table' 表体空状态</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧一致——locale.emptyText = <code>&lt;Empty description="No Data"&gt;</code>（含 Toggle Data 按钮），空数据态两栏均显示「No Data」。</li>
                <li><strong>触发条件</strong>：dataSource 为空或筛选无结果。</li>
                <li><strong>差异原因</strong>：无差异，两侧都按 Table 级 <code>locale.emptyText</code> 渲染空状态。</li>
              </ul>
            </li>
            <li>
              <strong>'Table.filter' 下拉内占位</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧一致——空数据态点 Age 列的筛选图标，下拉均显示「No Filter(Custom)」（来自 ConfigProvider.renderEmpty('Table.filter')，显示简洁线条图标）。</li>
                <li><strong>触发条件</strong>：Age 列 filters 为 []（空数据态），点开 filter 下拉。</li>
                <li><strong>差异原因</strong>：无差异，两侧都由 ConfigProvider 的 <code>renderEmpty('Table.filter')</code> 显示下拉内筛选选项为空时的占位；与 'Table' 空状态（表体为空）区分开。</li>
              </ul>
            </li>
            <li>
              <strong>初值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：本 demo 初值取空。</li>
                <li><strong>触发条件</strong>：首次渲染。</li>
                <li><strong>差异原因</strong>：空态是本 demo 核心演示场景（直接展示 'Table' + 'Table.filter' 两种空状态），取空作为对照基线；点 Toggle 切到有数据态对照。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}


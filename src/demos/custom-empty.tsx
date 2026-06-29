/**
 * custom-empty demo：左右并排呈现 data-grid 与 antd 自定义空状态。
 *
 * Toggle Data 切换 dataSource（空 ↔ 有数据），同一状态同时驱动两侧；Age filters 随 dataSource 变化
 * （空时为 [] → 点 Age 漏斗看 'Table.filter' 占位）。
 */

import { useState } from 'react'
import { Button, Empty, Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { genFakeData, type RecordType } from './_compare/custom-empty.shared'
// ON 时叠加 virtual + scroll.y（split pane 自动限高）
import { useVirtualization } from './VirtualizationContext'
import CustomEmptyDg from './custom-empty.dg'
import CustomEmptyAntd from './custom-empty.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function App() {
  // 共享状态：同一个状态同时驱动两侧表格。初值空作为对照基线。
  const [dataSource, setDataSource] = useState<RecordType[]>([])
  const [bordered, setBordered] = useState(true)
  // ON 时两栏叠加 virtual=true + scroll.y（空数据态无可见效果但不报错；有数据后正常虚拟）。
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

  // 两侧共用的 locale.emptyText（含 toggleButton 子节点——antd 同款）。
  const emptyText = <Empty description="No Data">{toggleButton}</Empty>

  return (
    <div style={{ padding: 24 }}>
      {/* 共享控制条：全宽，在 SplitDemo 上方。DemoToolbar 用 useToken 适配主题。 */}
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
            （空数据态点 Age 漏斗看 'Table.filter' 占位）
          </span>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排。
      */}
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
          /* antd Table + ConfigProvider.renderEmpty（子组件自包）+ locale.emptyText（含 toggleButton 子节点）。 */
          <CustomEmptyAntd
            bordered={bordered}
            dataSource={dataSource}
            emptyText={emptyText}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd 自定义空状态。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>'Table' 表体空状态</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧一致——locale.emptyText = <code>&lt;Empty description="No Data"&gt;</code>（含 Toggle Data 按钮），空数据态两栏均显示「No Data」。</li>
                <li><strong>触发条件</strong>：dataSource 为空或筛选无结果。</li>
                <li><strong>差异原因</strong>：两侧均消费 Table 级 <code>locale.emptyText</code>，'Table' 语义对齐（data-grid 已对齐 antd 源码）。详见 <code>docs/design-notes/filter-sorter.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>'Table.filter' 下拉内占位</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧一致——空数据态点 Age 漏斗，下拉均显示「No Filter(Custom)」（ConfigProvider.renderEmpty('Table.filter')，SIMPLE 图标）。</li>
                <li><strong>触发条件</strong>：Age 列 filters 为 []（空数据态），点开 filter 下拉。</li>
                <li><strong>差异原因</strong>：两侧均消费 ConfigProvider.renderEmpty，'Table.filter' 语义对齐（与 'Table' 区分：前者是 filter 下拉内 filters 空时的占位，后者是表体空）。详见 <code>docs/design-notes/filter-sorter.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>初值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：本 demo 初值取空（antd 官方 demo 原本初值有数据）。</li>
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

import { useState } from 'react'
import { theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { useVirtualization } from './VirtualizationContext'
import OrderColumnDg from './special-column-order.dg'
import OrderColumnAntd from './special-column-order.antd'

export default function OrderColumnDemo() {
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  const onSelectedKeysChange = (keys: Array<React.Key>) => {
    setSelectedKeys(keys)
  }

  return (
    <div className="demo-view">
      <SplitDemo
        minPaneWidth={480}
        left={
          <OrderColumnDg
            selectedKeys={selectedKeys}
            onSelectedKeysChange={onSelectedKeysChange}
            virtual={virtual}
          />
        }
        right={<OrderColumnAntd virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>前后两栏呈现 data-grid 与 antd order-column demo，
          共享数据驱动两侧 EXPAND_COLUMN + SELECTION_COLUMN 哨兵控制展开/选择列位置
          （Name → 展开 → Age → 选择 → Address，两侧一致）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>哨兵常量来源</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：前栏 <code>Table.EXPAND_COLUMN/SELECTION_COLUMN</code>
                  来自 data-grid 引擎；后栏 antd 同名哨兵来自 antd 本体。</li>
                <li><strong>触发条件</strong>：columns 数组中放置哨兵项以决定展开/选择列插入位置。</li>
                <li><strong>差异原因</strong>：data-grid 在引擎内重新声明了与 antd 等价的哨兵常量对象
                  （供 data-grid 列体系消费），语义/结构对齐 antd，两侧 columns 数组结构等价。</li>
              </ul>
            </li>
            <li>
              <strong>rowSelection 受控语义（demo 接线）</strong>：前栏 data-grid 用受控
              <code>selectedRowKeys</code>（驱动页面下方选中态可视化区）；后栏 antd 用
              <code>rowSelection={"{}"}</code> 非受控（复刻 antd demo 原样，选择 state 由 antd 内部管理）。
              差异仅在选择 state 管理，不影响哨兵位置。
            </li>
            <li>
              <strong>前栏选中态可视化区（demo 接线）</strong>：页面下方额外显示前栏 data-grid 的
              <code>selectedKeys</code>（官方 antd demo 无此区），便于在无 console 环境验证选择功能；
              后栏 antd 非受控，不参与此对照。
            </li>
          </ul>
        </div>
      </SplitDemo>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: token.colorFillQuaternary,
          borderRadius: 8,
          color: token.colorTextSecondary,
          fontSize: 12,
        }}
      >
        <strong>前栏 data-grid selectedKeys:</strong>{' '}
        {selectedKeys.length === 0 ? (
          <span style={{ color: token.colorTextTertiary }}>(none)</span>
        ) : (
          <code>[{selectedKeys.map((k) => `"${k}"`).join(', ')}]</code>
        )}
        <div style={{ marginTop: 4 }}>
          列顺序：Name → <strong>展开列（EXPAND_COLUMN）</strong> → Age →
          <strong> 选择列（SELECTION_COLUMN）</strong> → Address。
        </div>
      </div>
    </div>
  )
}

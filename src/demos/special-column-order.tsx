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
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd 展开/选择列位置 demo，
          在 columns 数组中放置 EXPAND_COLUMN / SELECTION_COLUMN 两个特殊值，
          即可控制展开列与选择列的显示位置（Name → 展开列 → Age → 选择列 → Address，两侧一致）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>EXPAND_COLUMN / SELECTION_COLUMN 常量</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 与 antd 各自提供同名常量
                  <code>Table.EXPAND_COLUMN</code> / <code>Table.SELECTION_COLUMN</code>，用法相同。</li>
                <li><strong>触发条件</strong>：在 columns 数组中放置这两个常量，以决定展开/选择列的插入位置。</li>
                <li><strong>说明</strong>：两个常量在两侧用法一致，两侧的 columns 数组结构也等价。</li>
              </ul>
            </li>
            <li>
              <strong>选择状态管理方式差异</strong>：data-grid 侧用受控
              <code>selectedRowKeys</code>（页面下方的选中态可视化区由它驱动）；antd 侧用
              <code>rowSelection={"{}"}</code> 非受控（antd 官方 demo 原样写法，选择状态由 antd 内部管理）。
              差异仅在选择状态的管理方式，不影响选择列的位置。
            </li>
            <li>
              <strong>data-grid 选中态可视化区</strong>：页面下方额外显示 data-grid 当前的
              <code>selectedKeys</code>（antd 侧为非受控，不显示此区），便于直接查看选择结果。
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
        <strong>data-grid selectedKeys:</strong>{' '}
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

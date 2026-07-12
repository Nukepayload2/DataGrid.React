import { useState } from 'react'
import { theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { useVirtualization } from './VirtualizationContext'
import RowSelectionCustomDg from './custom-selection-menu.dg'
import RowSelectionCustomAntd from './custom-selection-menu.antd'

export default function RowSelectionCustomDemo() {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<React.Key>>([])
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SplitDemo
        minPaneWidth={480}
        left={
          <RowSelectionCustomDg
            selectedRowKeys={selectedRowKeys}
            onSelectedRowKeysChange={setSelectedRowKeys}
            virtual={virtual}
          />
        }
        right={
          <RowSelectionCustomAntd
            selectedRowKeys={selectedRowKeys}
            onSelectedRowKeysChange={setSelectedRowKeys}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd row-selection-custom demo，
          共享 selectedRowKeys 同步驱动两侧 46 行的 selections 菜单（3 内置哨兵 + 自定义 odd/even）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>内置哨兵来源</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 <code>Table.SELECTION_ALL/INVERT/NONE</code> 来自
                  data-grid 引擎；右栏同名哨兵来自 antd 本体。</li>
                <li><strong>触发条件</strong>：表头全选框旁下拉箭头点开后选择前 3 项菜单。</li>
                <li><strong>差异原因</strong>：data-grid 在引擎内重新声明了与 antd 等价的哨兵常量对象
                  （供 data-grid 选择体系消费），但语义/结构对齐 antd。两侧 selections 数组结构等价。</li>
              </ul>
            </li>
            <li>
              <strong>pagination</strong>：本 demo 为复刻 antd row-selection-custom 的 46 行全显效果，
              两侧均显式关闭分页（<code>pagination={false}</code>）。
            </li>
            <li>
              <strong>选中态可视化区</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：页面下方显示共享 <code>selectedRowKeys</code>，
                  antd demo 原本仅 <code>onChange</code> console.log。</li>
                <li><strong>触发条件</strong>：任意选择变化（内置项 / 自定义 odd-even / 行 checkbox）。</li>
                <li><strong>差异原因</strong>：双栏对照需在无 console 环境验证两侧同步，
                  额外加可视化区对照；antd demo 逐字复刻无此区。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>

      {/* Extra readout for side-by-side verification without opening the console. */}
      <div style={{ padding: 12, background: token.colorFillQuaternary, borderRadius: 8 }}>
        <strong>selectedRowKeys:</strong>{' '}
        {selectedRowKeys.length === 0 ? (
          <span style={{ color: token.colorTextTertiary }}>(none)</span>
        ) : (
          <code>[{selectedRowKeys.join(', ')}]</code>
        )}
        <div style={{ marginTop: 4, color: token.colorTextSecondary, fontSize: 12 }}>
          点表头全选框旁的下拉箭头，选择 Select all data / Invert current page / Clear all data / Odd Row / Even Row。
          两侧共享同一 selectedRowKeys → 点任一侧菜单项两侧勾选同步。
          打开浏览器 console 可看到 onChange 回调日志（内置项触发；自定义 odd/even 由 demo 内 setState）。
        </div>
      </div>
    </div>
  )
}

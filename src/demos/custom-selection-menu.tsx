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
    <div className="demo-view demo-view--stack">
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
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd row-selection-custom demo，
          共享 selectedRowKeys 同步驱动两侧的 selections 菜单（46 行数据；3 个内置菜单项 + 自定义 odd/even 菜单项）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>内置菜单项来源</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 的 <code>Table.SELECTION_ALL/INVERT/NONE</code> 是
                  data-grid 包导出的内置常量；antd 同名常量来自 antd 本体。</li>
                <li><strong>触发条件</strong>：表头全选框旁下拉箭头点开后选择前 3 项菜单。</li>
                <li><strong>说明</strong>：两侧 selections 数组结构相同，选择菜单项行为一致。</li>
              </ul>
            </li>
            <li>
              <strong>pagination</strong>：本 demo 为复刻 antd row-selection-custom 的 46 行全显效果，
              两侧均显式关闭分页（<code>pagination={false}</code>）。
            </li>
            <li>
              <strong>选中态显示区（demo 额外加的元素）</strong>：页面下方额外显示共享的 <code>selectedRowKeys</code>
              （官方 antd demo 只是把 <code>onChange</code> 打印到控制台），方便直接观察两侧选择状态；
              任意选择变化（内置菜单项 / 自定义 odd-even / 行 checkbox）都会刷新。
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
          点表头全选框旁的下拉箭头，选择 Select all data / Invert current page / Clear all data / Select Odd Row / Select Even Row。
          两侧共享同一 selectedRowKeys → 点任一侧菜单项两侧勾选同步。
          打开浏览器 console 可看到 onChange 回调日志（内置菜单项触发；自定义 odd/even 项直接更新共享状态，不经过 onChange）。
        </div>
      </div>
    </div>
  )
}

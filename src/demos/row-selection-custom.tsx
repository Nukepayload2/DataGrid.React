/**
 * row-selection-custom 双栏对照 demo：复刻 antd
 * `G:\Projects\ant-design\components\table\demo\row-selection-custom.tsx`。
 * 共享 selectedRowKeys（受控真理源）同时驱动左栏 data-grid 与右栏 antd Table 的
 * rowSelection.selections 菜单（3 内置哨兵 + 自定义 odd/even）。
 */

import { useState } from 'react'
import { theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
import RowSelectionCustomDg from './row-selection-custom.dg'
import RowSelectionCustomAntd from './row-selection-custom.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function RowSelectionCustomDemo() {
  // 共享状态：同一个 state 同时驱动两侧表格 + 页面下方可视化区。
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<React.Key>>([])
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y。
  const { virtual } = useVirtualization()
  // 主题 token：选中态可视化区文字色 token 化，暗主题自适应。
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/*
        minPaneWidth=480（窄表，3 列 + 选择列=4 列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。46 行全显（无分页），
        SplitDemo pane body 内独立滚动。
      */}
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
              <strong>pagination 默认值</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 默认不分页（无 <code>pagination</code> 时
                  46 行全显）；右栏 antd 设 <code>pagination={false}</code> 显式关闭。</li>
                <li><strong>触发条件</strong>：本 demo 数据 46 行（antd demo 同款），无分页配置时。</li>
                <li><strong>差异原因</strong>：data-grid 默认无分页（需显式 <code>pagination={"{}"}</code> 才出现分页条），
                  antd 默认开启分页（需 <code>pagination={'{false}'}</code> 才关闭以复刻 demo 全显行为）。</li>
              </ul>
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

      {/* 选中态可视化（antd demo 仅 console.log；这里额外页面展示便于无 console 验证）。 */}
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

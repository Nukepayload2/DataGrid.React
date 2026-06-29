/**
 * 复刻 antd `column-defaults` demo：
 *   `G:\Projects\ant-design\components\table\demo\column-defaults.tsx`。
 *
 * 双栏对照：左栏 data-grid Table（Table 级 `column={{ align:'center', ellipsis }}` 设列默认属性），
 * 右栏忠实复刻 antd column-defaults demo。共享 `Ellipsis` 开关切换 Table 级 column.ellipsis（两侧同步）；
 * 共享数据见 `_compare/column-defaults.shared.ts`。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import ColumnDefaultsDg from './column-defaults.dg'
import ColumnDefaultsAntd from './column-defaults.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ColumnDefaultsDemo() {
  const [ellipsis, setEllipsis] = useState(true)
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。 */}
      <DemoToolbar>
        <Space>
          <Switch
            checked={ellipsis}
            onChange={setEllipsis}
            checkedChildren="Ellipsis"
            unCheckedChildren="Ellipsis"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<ColumnDefaultsDg ellipsis={ellipsis} virtual={virtual} />}
        right={<ColumnDefaultsAntd ellipsis={ellipsis} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd column-defaults demo，
          两侧 Table 级均传 <code>column</code> prop 设 <code>align:center</code> 与
          <code>ellipsis:true</code>。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>列默认属性合并</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧 Name/Description 继承 Table 级
                  <code> align:center</code>，Address 单列自身 <code>align</code> 覆盖默认 center。</li>
                <li><strong>触发条件</strong>：Table 级传 <code>column</code> + 列自身同名字段。</li>
                <li><strong>差异原因</strong>：data-grid <code>applyColumnDefaults</code> 浅合并（列自身优先）
                  与 antd <code>mergeProps(default, col)</code> 同语义。</li>
              </ul>
            </li>
            <li>
              <strong>Align 字面量</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 Address 用 <code>align:'start'</code>；右栏用
                  <code>align:'left'</code>。</li>
                <li><strong>触发条件</strong>：始终（demo 写死）。</li>
                <li><strong>差异原因</strong>：data-grid Align 类型用 CSS logical 的
                  <code>'start'/'center'/'end'</code>；antd v6 用物理方向
                  <code>'left'/'center'/'right'</code>。语义等价（<code>'start'='left'</code>）。</li>
              </ul>
            </li>
            <li>
              <strong>Ellipsis 省略号</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：开启 <code>Ellipsis</code> 开关时两侧内容溢出均显示
                  <code>...</code>；关闭时均无。</li>
                <li><strong>触发条件</strong>：Table 级 <code>column.ellipsis</code> 由开关驱动。</li>
                <li><strong>差异原因</strong>：data-grid 有 ellipsis 列即派生
                  <code>tableLayout:'fixed'</code> + <code>minmax(width,1fr)</code> 限 track 宽，
                  与 antd <code>table-layout:fixed</code> 等效。详见
                  <code>docs/design-notes/column-width.md</code>。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

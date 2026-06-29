/**
 * custom-filter-panel 双栏对照 demo：复刻 antd custom-filter-panel demo。
 *
 * 左栏 data-grid / 右栏 antd Table 均用 `getColumnSearchProps` 工厂注入 `filterDropdown`（antd Input 搜索框 +
 * Search/Reset/Filter/close 四按钮）+ `filterIcon`（放大镜，激活态 colorPrimary）+ `onFilter` +
 * `filterDropdownProps.onOpenChange`（打开时聚焦 Input）+ `render`（react-highlight-words 命中高亮）。
 * Address 列额外带 `sorter`。
 *
 * filterDropdown 内搜索词（searchText/searchedColumn/searchInput）属局部交互状态，两侧各自独立维护
 * （点左栏搜索不影响右栏，对照价值在于看两栏独立操作下行为是否一致）。共享 Bordered 开关 + 共享数据
 * （`RecordType` + `data` + `DataIndex` 见 `_compare/custom-filter-panel.shared.ts`）。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'
import CustomFilterPanelDg from './custom-filter-panel.dg'
import CustomFilterPanelAntd from './custom-filter-panel.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function CustomFilterPanelDemo() {
  // 共享 Bordered 开关同时驱动两侧。
  const [bordered, setBordered] = useState(false)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* 共享控制条：全宽，在 SplitDemo 上方。DemoToolbar 用 useToken 适配主题。 */}
      <DemoToolbar>
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列；Name/Age 有 width 百分比 + Address 自适应）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <CustomFilterPanelDg bordered={bordered} virtual={virtual} />
        }
        right={
          <CustomFilterPanelAntd bordered={bordered} virtual={virtual} />
        }
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd custom-filter-panel demo。filterDropdown 面板
          UI、应用/重置语义、高亮、放大镜激活态在两侧行为一致。两侧的代码差异（非可观察行为差异）：
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>类型与 import 来源</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 用 <code>HTMLInputElement</code> ref、
                  <code>FilterDropdownProps</code>/<code>TableColumnType</code> 从 <code>../table</code> 导入；
                  右栏 antd 用 <code>InputRef</code> ref、同款类型从 <code>antd</code> 主入口导入。
                  两侧 <code>filterDropdownProps</code> 签名等价，<code>select()</code> 调用一致。</li>
                <li><strong>触发条件</strong>：始终（类型层面，无运行时可见差异）。</li>
                <li><strong>差异原因</strong>：data-grid 从自身包导出与 antd 同签名的类型；
                  antd 段按官方 demo 用 <code>antd</code> 包类型。两侧 ref 均最终透传到内部 input。</li>
              </ul>
            </li>
            <li>
              <strong>SearchOutlined 图标来源</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧均用同一份内联 SVG（共用 <code>SearchOutlined</code> 组件），
                  而非 <code>@ant-design/icons</code> 直接 import。视觉零差异（与 antd 官方 SearchOutlined 同一 SVG path）。</li>
                <li><strong>触发条件</strong>：始终。</li>
                <li><strong>差异原因</strong>：<code>@ant-design/icons</code> 未在本项目 package.json 直接声明
                  （仅 antd 间接依赖），为避免引入未声明依赖，两侧统一内联 SVG。</li>
              </ul>
            </li>
          </ul>
          <p style={{ margin: '8px 0 0' }}>
            两侧 filterDropdown 内搜索词属局部交互态，点左栏搜索不影响右栏。已知：两侧
            <code>clearFilters()</code> 无参默认 <code>{'{confirm:false}'}</code>，点 Reset 只清草稿不立即清表
            （需再 Search 或关闭下拉才回全量）；Address 列 <code>sortDirections: ['descend','ascend']</code>
            第三次点击回 null。均为 data-grid 与 antd 一致的正确行为。
          </p>
        </div>
      </SplitDemo>
    </div>
  )
}

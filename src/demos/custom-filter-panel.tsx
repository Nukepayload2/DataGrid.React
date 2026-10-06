import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import CustomFilterPanelDg from './custom-filter-panel.dg'
import CustomFilterPanelAntd from './custom-filter-panel.antd'

export default function CustomFilterPanelDemo() {
  const [bordered, setBordered] = useState(false)
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
      
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
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd custom-filter-panel demo。filterDropdown 面板
          UI、应用/重置语义、高亮、放大镜激活态在两侧行为一致。两侧的代码差异（非可观察行为差异）：
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>类型与 import 来源</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 用 <code>HTMLInputElement</code> ref、
                  <code>FilterDropdownProps</code>/<code>TableColumnType</code> 从 <code>../table</code> 导入；
                  antd 用 <code>InputRef</code> ref，<code>InputRef</code>/<code>TableColumnType</code>
                  从 <code>antd</code> 主入口导入，<code>FilterDropdownProps</code> 从深路径
                  <code>antd/es/table/interface</code> 导入。两侧 <code>filterDropdownProps</code> 签名等价，
                  <code>select()</code> 调用一致。</li>
                <li><strong>触发条件</strong>：始终（类型层面，无运行时可见差异）。</li>
                <li><strong>说明</strong>：两侧筛选面板签名等价，输入框聚焦和确认行为一致。</li>
              </ul>
            </li>
            <li>
              <strong>SearchOutlined 图标来源</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧各自内联定义同一路径的 <code>SearchOutlined</code> 组件
                  （两个 demo 变体各有一份，无共享模块；均非 <code>@ant-design/icons</code> 直接 import）。
                  视觉零差异（与 antd 官方 SearchOutlined 同一 SVG path）。</li>
              </ul>
            </li>
          </ul>
          <p style={{ margin: '8px 0 0' }}>
            两侧 filterDropdown 内搜索词属局部交互态，点 data-grid 搜索不影响 antd。已知：两侧
            <code>clearFilters()</code> 无参默认 <code>{'{confirm:false}'}</code>，点 Reset 只清草稿不立即清表
            （需再点 Search 确认清空才回全量；自定义面板关闭下拉不应用草稿）；Address 列
            <code>sortDirections: ['descend','ascend']</code> 第三次点击回 null。均为 data-grid 与 antd
            一致的正确行为。
          </p>
        </div>
      </SplitDemo>
    </div>
  )
}



import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'
import FilterSearchDg from './filter-search.dg'
import FilterSearchAntd from './filter-search.antd'

// Demo 根组件

export default function FilterSearchDemo() {
  // 共享 Bordered 开关同时驱动两侧。
  const [bordered, setBordered] = useState(false)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y。
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
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
        minPaneWidth=480（窄表，3 列无 scroll.x，Name 30% + Address 40%）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<FilterSearchDg bordered={bordered} virtual={virtual} />}
        right={<FilterSearchAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>前后两栏呈现 data-grid 与 antd filter-search demo。两侧 <code>filterSearch</code>
          行为完全对齐（Name 列 <code>filterMode:'tree'</code>、Address 列默认 menu；data-grid FilterDropdown
          用 antd <code>&lt;Tree&gt;</code>，视觉/交互一致），无可观察差异。两侧行为要点：
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li><strong>tree 模式 filterSearch</strong>（两侧 Name）：输入搜索词后命中节点<strong>高亮</strong>
              （antd <code>filterTreeNode</code> "highlight" 语义），<strong>不隐藏</strong>不匹配节点。</li>
            <li><strong>menu 模式 filterSearch</strong>（两侧 Address）：下拉顶部搜索框实时过滤筛选项
              （item.text 转小写包含输入即命中，大小写不敏感）；输入空显全部；关闭清空搜索值。</li>
          </ul>
          <p style={{ margin: '8px 0 0' }}>
            搜索框只过滤显示/高亮，不影响已勾选的筛选值（搜索与勾选状态解耦）。
            <strong>Bordered 开关</strong>同时切换两侧边框；打开 console 查看 <code>onChange</code> 参数。
          </p>
        </div>
      </SplitDemo>
    </div>
  )
}


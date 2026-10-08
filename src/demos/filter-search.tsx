
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
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd filter-search demo。两侧的筛选搜索
          行为完全一致（Name 列 <code>filterMode:'tree'</code>、Address 列默认 menu 模式；data-grid 侧的树形筛选
          也用 antd <code>&lt;Tree&gt;</code> 渲染，视觉和交互一致），无可观察差异。两侧行为要点：
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li><strong>tree 模式</strong>（两侧 Name 列）：输入搜索词后匹配节点只<strong>高亮</strong>
              （antd <code>Tree</code> 的 <code>filterTreeNode='highlight'</code> 行为），<strong>不隐藏</strong>不匹配节点。</li>
            <li><strong>menu 模式</strong>（两侧 Address 列）：下拉顶部搜索框实时过滤筛选项
              （大小写不敏感）；输入为空时显示全部；关闭下拉清空搜索词。</li>
          </ul>
          <p style={{ margin: '8px 0 0' }}>
            搜索框只影响筛选项的显示/高亮，不影响已勾选的筛选值。
            <strong>Bordered 开关</strong>同时切换两侧边框；打开 console 查看 <code>onChange</code> 参数。
          </p>
        </div>
      </SplitDemo>
    </div>
  )
}



import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高）
import { useVirtualization } from './VirtualizationContext'
import FilterInTreeDg from './tree-filter.dg'
import FilterInTreeAntd from './tree-filter.antd'

// Demo 根组件

export default function FilterInTreeDemo() {
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
        minPaneWidth=480（窄表，3 列无 scroll.x，Name 30% + Address 40%）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<FilterInTreeDg bordered={bordered} virtual={virtual} />}
        right={<FilterInTreeAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd filter-in-tree demo。两侧
          <code>filterMode:'tree'</code> 树形筛选行为完全对齐（均用 antd
          <code>&lt;Tree checkable&gt;</code> 父子联动），无可观察差异：
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li><strong>Name 列</strong>：<code>filterMode:'tree'</code> + filters 含 children（Joe /
              Category 1→[Yellow,Pink] / Category 2→[Green,Black]）。勾 Category 1 自动勾 Yellow+Pink
              （父子联动）；选中值作 filteredValue，onFilter 对每个 value 判定 OR。</li>
            <li><strong>filterSearch（tree 模式）</strong>：输入搜索词后命中节点<strong>高亮</strong>
              （antd <code>filterTreeNode</code> "highlight" 语义），<strong>不隐藏</strong>不匹配节点
              ——两侧一致。</li>
            <li><strong>Address 列</strong>：无 filterMode → 默认 menu + filterSearch。tree + menu 共存
              （Name 走 tree，Address 走 menu，互不影响）。</li>
          </ul>
          <p style={{ margin: '8px 0 0' }}>
            <strong>Bordered 开关</strong>同时切换两侧边框；打开 console 查看 <code>onChange</code> 参数。
          </p>
        </div>
      </SplitDemo>
    </div>
  )
}


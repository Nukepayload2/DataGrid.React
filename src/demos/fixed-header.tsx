
import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import FixedHeaderDg from './fixed-header.dg'
import FixedHeaderAntd from './fixed-header.antd'

// Demo 根组件

export default function FixedHeaderDemo() {
  // 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=600 → 横排阈值 ≈ 600×2 + 16 = 1216px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 是窄表（3 列、无 scroll.x），但表体有 300px 高 + 双向需要可读宽度；
        取中等阈值使常规笔记本视口（≥1280）横排，更窄屏（<1216）竖排。
      */}
      <SplitDemo
        minPaneWidth={600}
        left={<FixedHeaderDg bordered={bordered} virtual={virtual} />}
        right={<FixedHeaderAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd fixed-header。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>固定表头</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧一致——3 列（Name/Age/Address）× 100 行，表头纵向固定
                  （<code>position:sticky; top:0</code>），表体纵向滚动时表头钉顶。</li>
                <li><strong>触发条件</strong>：表体纵向滚动时。</li>
                <li><strong>说明</strong>：此 demo 仅作结构对照基线。</li>
              </ul>
            </li>
            <li>
              <strong>scroll.y 取值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 用 <code>scroll.y:true</code>（布尔，父容器
                  height:394 = stickyHeader 54.8 + 表体可见 275.2 + 分页条区 64）；右栏 antd 用数字
                  <code>scroll.y:55*5</code>（忠实官方）。两侧可见行数一致（6 行）。</li>
                <li><strong>触发条件</strong>：表格进入固定表头模式即出现。</li>
                <li><strong>说明</strong>：data-grid 使用 <code>scroll.y: true</code>，高度由父容器决定；antd 使用数字高度。</li>
              </ul>
            </li>
            <li>
              <strong>滚动条样式差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏走悬浮滚动条（macOS 风格细条），右栏用浏览器默认滚动条。</li>
                <li><strong>触发条件</strong>：表体出现滚动条即出现。</li>
                <li><strong>说明</strong>：两侧滚动条样式不同，但滚动交互一致。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}


import { useState } from 'react'
import { Segmented, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { getData } from './_compare/grouped-header.shared'
import { useVirtualization } from './VirtualizationContext'
import GroupingColumnsDg from './grouped-header.dg'
import GroupingColumnsAntd from './grouped-header.antd'

// Demo 根组件

type SizeOption = 'medium' | 'large'

export default function GroupingColumnsDemo() {
  // 共享状态：同一个 bordered/size/count 同时驱动两侧表格。
  const [bordered, setBordered] = useState(true)
  const [size, setSize] = useState<SizeOption>('medium')
  const [count, setCount] = useState<number>(100)
  const { virtual } = useVirtualization()

  const data = getData(count)

  return (
    <div className="demo-view">
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <Segmented
            value={size}
            onChange={(val) => setSize(val as SizeOption)}
            options={[
              { label: 'medium', value: 'medium' },
              { label: 'large', value: 'large' },
            ]}
          />
          <Segmented
            value={count}
            onChange={(val) => setCount(val as number)}
            options={[
              { label: '6 rows', value: 6 },
              { label: '100 rows', value: 100 },
            ]}
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=900 → 横排阈值 ≈ 900×2 + 16 = 1816px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 含 scroll.x:'calc(700px + 50%)' 的宽表 + 多级表头，半宽（~960px at 1920 视口）
        下每栏仅 ~480px 太挤；取大阈值使常规笔记本视口（1440–1920）下竖排（每栏全宽，对宽表更友好），
        仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={
          // 左栏 data-grid：多级表头 + 固定列 + filters/sorter。473px 父高 wrapper 在子组件内
          // （表头 4 行 ~188 + 表体 ~235 + 分页条 ~50，对齐 antd）。
          <GroupingColumnsDg
            bordered={bordered}
            size={size}
            virtual={virtual}
            data={data}
          />
        }
        right={
          // antd 官方 grouping-columns demo 忠实复刻：filters（Joe/John）+ Age sorter +
          // fixed:left/right + scroll={{x:'calc(700px + 50%)', y:47*5}}（固定表头 5 行高纵滚）。
          <GroupingColumnsAntd
            bordered={bordered}
            size={size}
            virtual={virtual}
            data={data}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>本 demo 前后两栏呈现 data-grid 与 antd grouping-columns。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>多级表头实现机制</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：Other → Age / Address（→ Street / Block（→ Building /
                  Door No.））+ Company（→ Company Address / Company Name），任意深度嵌套。data-grid
                  用 <code>grid-column/grid-row span N</code>；antd 用原生 children 嵌套。</li>
                <li><strong>触发条件</strong>：列定义含 <code>children</code>（始终）。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid，把嵌套叶子映射到 grid 线号，
                  跨级用 span 表达合并范围；antd 原生 <code>&lt;table&gt;</code> 用 <code>colspan/rowspan</code>。
                  两侧最终视觉结构一致。详见 <code>docs/features/layout/header-and-span.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>fixed 逻辑属性</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧 fixed 类型都接受 <code>'start'/'end'</code> 与
                  <code>'left'/'right'</code>（rc-table FixedType 含全部取值）；demo 前栏写
                  <code>'start'/'end'</code>、后栏写 <code>'left'/'right'</code>，渲染结果等价。</li>
                <li><strong>触发条件</strong>：Name 固定 start、Gender 固定 end（始终）。</li>
                <li><strong>差异原因</strong>：data-grid 把 <code>'start'/'end'</code> 解析为物理
                  left/right sticky 偏移；antd 固定单元格用 CSS 逻辑属性
                  <code>inset-inline-start/end</code>（RTL 自动镜像）。</li>
              </ul>
            </li>
            <li>
              <strong>scroll.y 高度模式</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：后栏 antd <code>scroll: {'{ x:"calc(700px+50%)", y:47*5 }'}</code>
                  （数字 y = 表体 max-height）；前栏 data-grid <code>scroll: {'{ x:"calc(700px+50%)", y:true }'}</code>
                  + 父容器固定高 473px。</li>
                <li><strong>触发条件</strong>：始终（表体需限高纵滚）。</li>
                <li><strong>差异原因</strong>：data-grid <code>y:true</code> 是数据区域模式——CSS Grid
                  自适应填满父容器高度（父容器 473px = 表头 ~188 + 表体 ~235 + 分页条 ~50，对齐 antd
                  <code>y:47*5=235</code>）。antd 直接给表体数字 max-height。详见
                  <code>docs/features/layout/layout.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>无 width 列填满剩余 scroll.x</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：Company Name 列无 <code>width</code>，data-grid 用
                  <code>minmax(0,1fr)</code> 填满 scroll.x 剩余空间，Gender 贴右；antd 用原生
                  <code>&lt;table&gt;</code> + <code>&lt;colgroup&gt;</code>，auto/fixed 布局下浏览器把
                  剩余宽度分给该列。</li>
                <li><strong>触发条件</strong>：含无 <code>width</code> 的普通列 + scroll.x 时。</li>
                <li><strong>差异原因</strong>：data-grid 命中 fixed 布局的 fill 分支：有 width 列保持
                  绝对 px track、无 width 列 <code>minmax(0,1fr)</code> 均分剩余，使右固定列贴右；
                  antd 侧由原生 table 布局完成同效填充。详见
                  <code>docs/features/columns/column-width.md</code>。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}


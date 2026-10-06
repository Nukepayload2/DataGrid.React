import { useState } from 'react'
import { Segmented, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import NarrowDg from './narrow-container-table.dg'
import NarrowAntd from './narrow-container-table.antd'

export default function NarrowDemo() {
  const [paginated, setPaginated] = useState(true)
  const [defaultCurrent, setDefaultCurrent] = useState<number>(13)
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={paginated}
            onChange={setPaginated}
            checkedChildren="Pagination"
            unCheckedChildren="Pagination"
          />
          <Segmented
            value={defaultCurrent}
            onChange={(val) => setDefaultCurrent(val as number)}
            options={[
              { label: 'Page 1', value: 1 },
              { label: 'Page 13', value: 13 },
              { label: 'Page 20', value: 20 },
            ]}
            disabled={!paginated}
          />
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={320}
        left={
          <NarrowDg
            paginated={paginated}
            defaultCurrent={defaultCurrent}
            virtual={virtual}
          />
        }
        right={
          <NarrowAntd
            paginated={paginated}
            defaultCurrent={defaultCurrent}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd narrow demo，
          两侧均包 300px 宽容器 + 200 行 + size="small" + 分页。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>列宽策略差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 无 width 列为 <code>minmax(min-content,1fr)</code>
                  且 grid <code>width:100%</code>，列均分 300px 容器、无横向溢出；antd 无 scroll 时
                  <code>table-layout</code> 默认 <code>auto</code>，列按内容尺寸，内容总宽超出 300px 时
                  表格溢出容器。</li>
                <li><strong>触发条件</strong>：列无固定 <code>width</code> 且未显式传
                  <code>tableLayout</code>/scroll 时。</li>
                <li><strong>差异原因</strong>：data-grid CSS Grid 的 fill 分支把剩余空间均分给无 width 列；
                  antd <code>&lt;table&gt;</code> auto 布局按内容决定列宽。详见
                  <code>docs/features/columns/column-width.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>Page Segmented 切换不翻页</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：无（两侧均为不跳转——切换 Page 1/13/20 Segmented
                  只更新 React state，分页器不跳转）。</li>
                <li><strong>触发条件</strong>：任意时刻切换控制条 Page Segmented。</li>
                <li><strong>差异原因</strong>：Segmented 仅设 <code>pagination.defaultCurrent</code>
                  （非受控初值，仅在 Table 挂载时读取一次，antd <code>defaultCurrent</code> 同语义）。
                  要切换即跳转需改受控 <code>pagination.current</code> + <code>onChange</code>。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

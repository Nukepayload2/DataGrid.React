
import { useState } from 'react'
import { Button, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'
import HeadDg from './sorting-and-filtering.dg'
import HeadAntd from './sorting-and-filtering.antd'

// Demo 根组件

export default function HeadDemo() {
  // 共享状态（提升到父）：同一个状态同时驱动两侧表格 + 顶部控制条。
  const [bordered, setBordered] = useState(false)
  // Reset trick：递增 remountKey 强制两侧 Table 重新挂载，清空所有排序/筛选草稿与激活态
  // （不引入受控 filteredValue/sortOrder，保持 head demo 非受控本质）。
  const [remountKey, setRemountKey] = useState(0)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y
  // （原 head demo 无 scroll，ON 用 dg {y:true}/antd {y:280}；OFF 回 undefined）。
  const { virtual } = useVirtualization()

  const handleReset = () => setRemountKey((k) => k + 1)

  return (
    <div className="demo-view">
      {/* 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。
          DemoToolbar 用 useToken 适配主题（light/dark/自定义 token 自适应）。 */}
      <DemoToolbar>
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <Button onClick={handleReset}>Reset (remount both)</Button>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <HeadDg
            bordered={bordered}
            virtual={virtual}
            remountKey={remountKey}
          />
        }
        right={
          <HeadAntd
            bordered={bordered}
            virtual={virtual}
            remountKey={remountKey}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd head demo（排序 + 筛选共存），
          共享数据驱动两侧 Name/Age/Address 列（sorter/filters/onFilter 配置逐字一致）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Submenu 渲染层级</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：Name 列 filters 含 Submenu→children（Green/Black）。
                  左栏 data-grid 扁平化为顶层项（一级 Checkbox 参与勾选）；右栏 antd 原生 menu 模式
                  渲染二级菜单（点 Submenu 弹出 Green/Black）。</li>
                <li><strong>触发条件</strong>：点 Name 列筛选图标展开下拉。</li>
                <li><strong>差异原因</strong>：两侧 filters 数据结构完全一致（逐字 antd demo），
                  data-grid 现状不做二级菜单 UI（已知简化）。详见 <code>docs/features/interaction/filter-sorter.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>filter 下拉控件来源</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 的 FilterDropdown 由引擎统一渲染
                  （内部用 antd Dropdown/Checkbox/Radio/Button）；右栏 antd 用原生 filter 下拉。</li>
                <li><strong>触发条件</strong>：展开任意列筛选下拉。</li>
                <li><strong>差异原因</strong>：data-grid 自绘 FilterDropdown 以对接引擎的筛选状态管理，
                  但行为对齐 antd（filterOnClose 默认 / confirm 应用 / clearFilters 草稿不立即清表）。</li>
              </ul>
            </li>
            <li>
              <strong>排序/筛选叠加与 sortDirections 循环</strong>（两侧一致，行为说明）：
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li>raw → sort → filter 管线一致；<code>sortDirections</code> 耗尽回 null 是 antd 本身循环
                  （data-grid <code>nextSortDirection</code> 与 antd 逐字相同）。</li>
                <li><code>clearFilters()</code> 无参默认 <code>{'{confirm:false}'}</code>，点 Reset 只清草稿
                  不立即清表，与 antd <code>onReset</code> 一致。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}


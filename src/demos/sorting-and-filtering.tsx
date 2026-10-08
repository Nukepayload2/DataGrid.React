
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
          <Button onClick={handleReset}>Reset (clear sorting and filtering)</Button>
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
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd 排序 + 筛选共存 demo，
          两侧 Name/Age/Address 列的 sorter/filters/onFilter 配置完全一致。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Submenu 选项的展示差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：Name 列 filters 含一个 Submenu（下面带 Green/Black 两个选项）。
                  data-grid 把 Green/Black 直接显示为顶层选项（与其他选项同级参与勾选）；antd 渲染为二级菜单
                  （点 Submenu 弹出 Green/Black）。</li>
                <li><strong>触发条件</strong>：点 Name 列筛选图标展开下拉。</li>
                <li><strong>说明</strong>：两侧 filters 配置完全一致（照抄 antd 官方 demo），
                  data-grid 现状不做二级菜单 UI（已知简化）。详见 <code>docs/features/interaction/filter-sorter.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>筛选下拉的渲染</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 的筛选下拉由 data-grid 自行渲染
                  （视觉上使用 antd 的 Dropdown/Checkbox/Radio/Button）；antd 用自带的原生筛选下拉。</li>
                <li><strong>触发条件</strong>：展开任意列筛选下拉。</li>
                <li><strong>说明</strong>：data-grid 筛选下拉的行为与 antd 对齐：filterOnClose 默认行为相同，点「确认」才应用筛选，
                  点「重置」只清空下拉内已选选项，不立即清空表格。</li>
              </ul>
            </li>
            <li>
              <strong>排序/筛选叠加与 sortDirections 循环</strong>（两侧一致，行为说明）：
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li>两侧排序与筛选的生效顺序相同（先排序、后筛选）；<code>sortDirections</code> 耗尽后再次点击回到无排序
                  （两侧返回值细节略有不同，但都按无排序处理，行为一致）。</li>
                <li>筛选下拉里点「重置」只清空下拉内已选选项，不立即清空表格，与 antd 行为一致。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}


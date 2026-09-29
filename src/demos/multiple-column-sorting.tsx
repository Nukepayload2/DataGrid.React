import { useState } from 'react'
import { Button, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import MultipleSorterDg from './multiple-column-sorting.dg'
import MultipleSorterAntd from './multiple-column-sorting.antd'

export default function MultipleSorterDemo() {
  const [bordered, setBordered] = useState(false)
  const [remountKey, setRemountKey] = useState(0)
  const { virtual } = useVirtualization()

  const handleReset = () => setRemountKey((k) => k + 1)

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
          <Button onClick={handleReset}>Reset (remount both)</Button>
        </Space>
      </DemoToolbar>
      <SplitDemo
        minPaneWidth={480}
        left={
          <MultipleSorterDg
            bordered={bordered}
            virtual={virtual}
            remountKey={remountKey}
          />
        }
        right={
          <MultipleSorterAntd
            bordered={bordered}
            virtual={virtual}
            remountKey={remountKey}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd multiple-sorter demo。
          三分数列 <code>sorter.multiple</code>（Chinese=3 / Math=2 / English=1，multiple 越大 = 优先级越高）；
          排序结果、循环、onChange 数组本身均一致。两侧可观察差异：
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>优先级徽标</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：多列激活时 data-grid SortIndicator 在 caret 旁渲染一个数字徽标
                  （<code>dg-column-sorter-priority</code>，<strong>1 = 最高优先级 = multiple 最大</strong>，
                  即 Chinese 激活时显示 1）；antd multiple-sorter demo 不渲染此徽标。</li>
                <li><strong>触发条件</strong>：两列及以上同时激活。</li>
                <li><strong>差异原因</strong>：属 data-grid 增强（排序样式自带徽标），非 antd 对齐项。
                  详见 <code>docs/features/interaction/filter-sorter.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>onChange sorter 数组顺序</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧一致——非受控多列激活时 <code>sorter</code> 数组按**状态集原序**输出激活项
                  （被点列搬到末尾 ⇒ 数组顺序＝点击顺序），元素集合与顺序都相同。</li>
                <li><strong>触发条件</strong>：多列激活，<code>onChange</code> 的 <code>sorter</code> 为数组时。</li>
                <li><strong>差异原因</strong>：无差异。两侧 <code>generateSorterInfo</code> 都对状态集**原序**收集激活项、
                  <strong>不做二次排序</strong>（antd 6.4.4 <code>es/table/hooks/useSorter.js:216-239</code>）；
                  <code>sorter.multiple</code> 只决定比较次序。详见 <code>docs/features/interaction/filter-sorter.md</code>。</li>
              </ul>
            </li>
          </ul>
          <p style={{ margin: '8px 0 0' }}>
            <strong>Bordered 开关</strong>：同时切换两侧边框。<strong>Reset 按钮</strong>：递增 React key
            强制两侧 Table 重新挂载，清空所有排序激活态（不引入受控语义）。打开 console 查看
            <code>onChange</code> 参数。
          </p>
        </div>
      </SplitDemo>
    </div>
  )
}

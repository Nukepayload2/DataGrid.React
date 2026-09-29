import { useMemo, useRef, useState } from 'react'
import { Button, Segmented, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { getData, type RecordType } from './_compare/virtual-list.shared'
import type { TableRef } from '../table'
import type { ScrollBarFoldMode } from '../table'
import type { GetRef } from 'antd'
import { Table as AntdTable } from 'antd'
import VirtualListDg from './virtual-list.dg'
import VirtualListAntd from './virtual-list.antd'

/** antd Table ref type with `scrollTo`. */
type AntdTableRef = GetRef<typeof AntdTable>

export default function VirtualListDemo() {
  const [fixed, setFixed] = useState(true)
  const [bordered, setBordered] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [empty, setEmpty] = useState(false)
  const [count, setCount] = useState<number>(10000)
  const [merged, setMerged] = useState(true)
  const [showOnTableHover, setShowOnTableHover] = useState(false)
  const [expandOnHover, setExpandOnHover] = useState(true)

  const dgRef = useRef<TableRef>(null)
  const antdRef = useRef<AntdTableRef | null>(null)

  const data = useMemo<RecordType[]>(() => getData(count), [count])
  const scrollBarFoldMode = useMemo<ScrollBarFoldMode>(
    () => ({ showOnTableHover, expandOnHover }),
    [showOnTableHover, expandOnHover],
  )

  const scrollToBoth = (opts: { index?: number; key?: import('react').Key }) => {
    dgRef.current?.scrollTo(opts)
    antdRef.current?.scrollTo(opts)
  }

  const showScroll = data.length >= 999

  return (
    <div className="demo-view">
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={bordered}
            onChange={() => setBordered(!bordered)}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <Switch
            checked={fixed}
            onChange={() => setFixed(!fixed)}
            checkedChildren="Fixed"
            unCheckedChildren="Fixed"
          />
          <Switch
            checked={expanded}
            onChange={() => setExpanded(!expanded)}
            checkedChildren="Expandable"
            unCheckedChildren="Expandable"
          />
          <Switch
            checked={empty}
            onChange={() => setEmpty(!empty)}
            checkedChildren="Empty"
            unCheckedChildren="Empty"
          />
          <Switch
            checked={merged}
            onChange={() => setMerged(!merged)}
            checkedChildren="Merged (data-grid only)"
            unCheckedChildren="Merged (data-grid only)"
          />
          <Switch
            checked={showOnTableHover}
            onChange={setShowOnTableHover}
            checkedChildren="showOnTableHover"
            unCheckedChildren="showOnTableHover"
          />
          <Switch
            checked={expandOnHover}
            onChange={setExpandOnHover}
            checkedChildren="expandOnHover"
            unCheckedChildren="expandOnHover"
          />
          <Segmented
            value={count}
            onChange={(val) => setCount(val as number)}
            options={[
              { label: 'None', value: 0 },
              { label: 'Less', value: 4 },
              { label: 'Lot', value: 10000 },
            ]}
          />
          {showScroll ? (
            <>
              <Button onClick={() => scrollToBoth({ index: 999 })}>
                Scroll To index 999 (both)
              </Button>
              <Button onClick={() => scrollToBoth({ index: 0 })}>
                Scroll To Top (both)
              </Button>
              <Button onClick={() => dgRef.current?.scrollTo({ key: 50 })}>
                Scroll To key 50 (data-grid)
              </Button>
            </>
          ) : null}
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={1000}
        virtualizable={false}
        left={
          <VirtualListDg
            bordered={bordered}
            fixed={fixed}
            expanded={expanded}
            empty={empty}
            merged={merged}
            data={data}
            tableRef={dgRef}
            scrollBarFoldMode={scrollBarFoldMode}
          />
        }
        right={
          <VirtualListAntd
            bordered={bordered}
            fixed={fixed}
            expanded={expanded}
            empty={empty}
            data={data}
            tableRef={antdRef}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd virtual-list（万行虚拟 + 宽表横滚 + 合并/展开）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Merged 开关来源</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 有独立 <code>Merged</code> 开关；
                  右栏 antd 的 merged 行为由 <code>Fixed + Expandable</code> 推导（fixed 时展开关闭即合并、展开即清 onCell）。</li>
                <li><strong>触发条件</strong>：切换 Merged 开关（仅左栏可独立切换）或 Fixed / Expandable。</li>
                <li><strong>差异原因</strong>：data-grid 保留独立开关便于直接对照有/无合并下的虚拟渲染差异；
                  antd demo 原本即把合并与 fixed/expanded 耦合，未单独暴露。</li>
              </ul>
            </li>
            <li>
              <strong>合并 × 虚拟的覆盖补画</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 合并组左上角滚出可视区上边界后，其延伸到可视区的覆盖部分不补画（视觉「缺一块」）；右栏 antd 无此问题。</li>
                <li><strong>触发条件</strong>：开启合并 + 虚拟滚动，且合并组被「Scroll To index 999」拉到边界时。</li>
                <li><strong>差异原因</strong>：data-grid 虚拟窗口按行测量逐行渲染，未实现跨行合并组的边界补画（antd 的 extraRender 机制）。详见 <code>docs/features/scrolling/virtualization.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>展开行高与虚拟窗口</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 展开内容直接渲染但<strong>不计入虚拟窗口</strong>（窗口按收起态 rowHeight=40 算）；右栏 antd 展开内容参与测量。</li>
                <li><strong>触发条件</strong>：开启 Expandable 并展开任意行。</li>
                <li><strong>差异原因</strong>：data-grid 为保证展开后滚动稳定，虚拟窗口尺寸只按收起态行高推导。详见 <code>docs/features/scrolling/virtualization.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>滚动条外观</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 用 macOS 风格自定义悬浮滚动条（2px 半透明细线，hover hit 区变 8px 实色 + 拖动同步）；右栏 antd 用浏览器原生滚动条。</li>
                <li><strong>触发条件</strong>：任意滚动操作（滚轮/拖动/键盘/程序 scrollTop）。</li>
                <li><strong>差异原因</strong>：data-grid 用 FloatingScrollBar 替代原生滚动条，视觉更轻；滚动行为与原生等价。详见 <code>docs/features/scrolling/scrollbar.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>scrollTo key</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：「Scroll To index 999 / Top」同时滚动两侧；「Scroll To key 50」仅左栏 data-grid。</li>
                <li><strong>触发条件</strong>：Count ≥ 999 时显示滚动按钮。</li>
                <li><strong>差异原因</strong>：按 key 滚动是 data-grid 原生 demo 保留的专属能力。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

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
          <strong>对照说明：</strong>前后两栏呈现 data-grid 与 antd virtual-list（万行虚拟 + 宽表横滚 + 合并/展开）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>scrollTo</strong>：「Scroll To index 999 / Top」同时滚动两栏；
              「Scroll To key 50」仅滚动前栏 data-grid（后栏 antd 的 <code>scrollTo</code> 同样支持
              <code>key</code>，demo 按钮未接后栏）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

import { useState } from 'react'
import type { RadioChangeEvent } from 'antd'
import { Form, Radio, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { useVirtualization } from './VirtualizationContext'
import DynamicSettingsDg from './dynamic-table-settings.dg'
import DynamicSettingsAntd from './dynamic-table-settings.antd'

type SharedSize = 'large' | 'medium' | 'small'

type TablePaginationPlacement =
  | 'topStart'
  | 'topCenter'
  | 'topEnd'
  | 'bottomStart'
  | 'bottomCenter'
  | 'bottomEnd'
  | 'none'

export default function DynamicSettingsDemo() {
  const [bordered, setBordered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [size, setSize] = useState<SharedSize>('large')
  const [expandableEnabled, setExpandableEnabled] = useState(true)
  const [showTitle, setShowTitle] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const [showFooter, setShowFooter] = useState(true)
  const [rowSelectionEnabled, setRowSelectionEnabled] = useState(true)
  const [hasData, setHasData] = useState(true)
  const [tableLayout, setTableLayout] = useState<'unset' | 'fixed'>('unset')
  const [top, setTop] = useState<TablePaginationPlacement>('none')
  const [bottom, setBottom] = useState<TablePaginationPlacement>('bottomEnd')
  const [ellipsis, setEllipsis] = useState(false)
  const [yScroll, setYScroll] = useState(false)
  const [xScroll, setXScroll] = useState<'unset' | 'scroll' | 'fixed'>('unset')
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
      <Form layout="inline" className="table-demo-control-bar" style={{ marginBottom: 16 }}>
        <Form.Item label="Bordered">
          <Switch checked={bordered} onChange={setBordered} />
        </Form.Item>
        <Form.Item label="loading">
          <Switch checked={loading} onChange={setLoading} />
        </Form.Item>
        <Form.Item label="Title">
          <Switch checked={showTitle} onChange={setShowTitle} />
        </Form.Item>
        <Form.Item label="Column Header">
          <Switch checked={showHeader} onChange={setShowHeader} />
        </Form.Item>
        <Form.Item label="Footer">
          <Switch checked={showFooter} onChange={setShowFooter} />
        </Form.Item>
        <Form.Item label="Expandable">
          <Switch checked={expandableEnabled} onChange={setExpandableEnabled} />
        </Form.Item>
        <Form.Item label="Checkbox">
          <Switch
            checked={rowSelectionEnabled}
            onChange={setRowSelectionEnabled}
          />
        </Form.Item>
        <Form.Item label="Fixed Header">
          <Switch checked={yScroll} onChange={setYScroll} />
        </Form.Item>
        <Form.Item label="Has Data">
          <Switch checked={hasData} onChange={setHasData} />
        </Form.Item>
        <Form.Item label="Ellipsis">
          <Switch checked={ellipsis} onChange={setEllipsis} />
        </Form.Item>
        <Form.Item label="Size">
          <Radio.Group value={size} onChange={(e: RadioChangeEvent) => setSize(e.target.value)}>
            <Radio.Button value="large">Large</Radio.Button>
            <Radio.Button value="medium">Medium</Radio.Button>
            <Radio.Button value="small">Small</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Table Scroll">
          <Radio.Group
            value={xScroll}
            onChange={(e: RadioChangeEvent) => setXScroll(e.target.value)}
          >
            <Radio.Button value="unset">Unset</Radio.Button>
            <Radio.Button value="scroll">Scroll</Radio.Button>
            <Radio.Button value="fixed">Fixed Columns</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Table Layout">
          <Radio.Group
            value={tableLayout}
            onChange={(e: RadioChangeEvent) => setTableLayout(e.target.value)}
          >
            <Radio.Button value="unset">Unset</Radio.Button>
            <Radio.Button value="fixed">Fixed</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Pagination Top">
          <Radio.Group value={top} onChange={(e) => setTop(e.target.value)}>
            <Radio.Button value="topStart">TopStart</Radio.Button>
            <Radio.Button value="topCenter">TopCenter</Radio.Button>
            <Radio.Button value="topEnd">TopEnd</Radio.Button>
            <Radio.Button value="none">None</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Pagination Bottom">
          <Radio.Group value={bottom} onChange={(e) => setBottom(e.target.value)}>
            <Radio.Button value="bottomStart">BottomStart</Radio.Button>
            <Radio.Button value="bottomCenter">BottomCenter</Radio.Button>
            <Radio.Button value="bottomEnd">BottomEnd</Radio.Button>
            <Radio.Button value="none">None</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </Form>

      <SplitDemo
        minPaneWidth={600}
        left={
          <DynamicSettingsDg
            bordered={bordered}
            loading={loading}
            size={size}
            expandableEnabled={expandableEnabled}
            showTitle={showTitle}
            showHeader={showHeader}
            showFooter={showFooter}
            rowSelectionEnabled={rowSelectionEnabled}
            hasData={hasData}
            tableLayout={tableLayout}
            top={top}
            bottom={bottom}
            ellipsis={ellipsis}
            yScroll={yScroll}
            xScroll={xScroll}
            virtual={virtual}
          />
        }
        right={
          <DynamicSettingsAntd
            bordered={bordered}
            loading={loading}
            size={size}
            expandableEnabled={expandableEnabled}
            showTitle={showTitle}
            showHeader={showHeader}
            showFooter={showFooter}
            rowSelectionEnabled={rowSelectionEnabled}
            hasData={hasData}
            tableLayout={tableLayout}
            top={top}
            bottom={bottom}
            ellipsis={ellipsis}
            yScroll={yScroll}
            xScroll={xScroll}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd dynamic-settings demo
          （10 Switch + 5 Radio.Group 全量动态切换），用于集成回归 + 对照差异。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>scroll.y 取值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 用 <code>scroll:&#123;y:true&#125;</code>
                  （表格占满父容器可用空间，不向 Table 传计算高度）；antd 用 <code>scroll:&#123;y:240&#125;</code>（数字）。</li>
                <li><strong>触发条件</strong>：Fixed Header 开关 ON。</li>
                <li><strong>说明</strong>：data-grid 使用 <code>scroll.y: true</code>，高度由父容器提供；antd 使用数字高度。</li>
              </ul>
            </li>
            <li>
              <strong>pagination</strong>：data-grid 与 antd 默认均开启分页；本 demo 显式传
              <code>&#123; placement:[top,bottom] &#125;</code> 只是为了让顶部/底部分页位置跟随控件变化。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

import { useState } from 'react'
import { Form, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { useVirtualization } from './VirtualizationContext'
import NestTableBorderDebugDg from './nested-table-border-isolation.dg'
import NestTableBorderDebugAntd from './nested-table-border-isolation.antd'

export default function NestTableBorderDebugDemo() {
  const [rootTableBordered, setRootTableBordered] = useState(true)
  const [childTableBordered, setChildTableBordered] = useState(true)
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
      <Form
        layout="inline"
        className="table-demo-control-bar"
        style={{ marginBottom: 16 }}
      >
        <Form.Item label="Root Table Bordered">
          <Switch
            checked={rootTableBordered}
            onChange={(v) => setRootTableBordered(v)}
          />
        </Form.Item>
        <Form.Item label="Child Table Bordered">
          <Switch
            checked={childTableBordered}
            onChange={(v) => setChildTableBordered(v)}
          />
        </Form.Item>
      </Form>

      <SplitDemo
        minPaneWidth={480}
        left={
          <NestTableBorderDebugDg
            rootTableBordered={rootTableBordered}
            childTableBordered={childTableBordered}
            virtual={virtual}
          />
        }
        right={
          <NestTableBorderDebugAntd
            rootTableBordered={rootTableBordered}
            childTableBordered={childTableBordered}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd nest-table-border-debug demo
          （主表 + expandedRowRender 子 Table，父子 bordered 各自独立 Switch）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>父子 bordered 隔离</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：主表 <code>bordered</code> 与 expandedRowRender 内
                  子 Table 的 <code>bordered</code> 各自独立。切换 Root Switch 仅影响主表外边框/竖线；
                  切换 Child Switch 仅影响子表边框。data-grid 与 antd 行为一致（无差异）。</li>
                <li><strong>触发条件</strong>：切换任一 Switch。</li>
                <li><strong>差异原因</strong>：无差异。<code>bordered</code> 是每张 Table 自身 prop，
                  嵌套子表是独立 Table 实例，父子天然隔离。详见{' '}
                  <code>docs/features/layout/bordered.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>嵌套子表实现差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 侧子表是 data-grid <code>&lt;Table&gt;</code>；
                  antd 侧子表是真实 antd <code>&lt;Table&gt;</code>。</li>
                <li><strong>触发条件</strong>：展开任意行。</li>
                <li><strong>差异原因</strong>：data-grid 的 <code>expandedRowRender</code> 把返回内容
                  放进 <code>dg-row-expanded</code>（grid-column: 1 / -1 跨整行），嵌套的
                  <code>&lt;Table&gt;</code> 是独立实例，与主表正交。详见{' '}
                  <code>docs/features/interaction/expand.md</code>。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

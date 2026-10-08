import { useState } from 'react'
import { Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import TreeTablePreserveSelectedRowKeysDg from './preserved-tree-selection.dg'
import TreeTablePreserveSelectedRowKeysAntd from './preserved-tree-selection.antd'

export default function TreeTablePreserveSelectedRowKeysDemo() {
  const [checkStrictly, setCheckStrictly] = useState(false)
  const [preserveSelectedRowKeys, setPreserveSelectedRowKeys] = useState(true)
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div className="demo-view">
      <DemoToolbar>
        <Space>
          <Switch
            checked={checkStrictly}
            onChange={setCheckStrictly}
            checkedChildren="CheckStrictly"
            unCheckedChildren="CheckStrictly"
          />
          <Switch
            checked={preserveSelectedRowKeys}
            onChange={setPreserveSelectedRowKeys}
            checkedChildren="Preserve"
            unCheckedChildren="Preserve"
          />
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            checkStrictly={String(checkStrictly)} · preserveSelectedRowKeys=
            {String(preserveSelectedRowKeys)}
          </span>
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={480}
        left={
          <TreeTablePreserveSelectedRowKeysDg
            checkStrictly={checkStrictly}
            preserveSelectedRowKeys={preserveSelectedRowKeys}
            virtual={virtual}
          />
        }
        right={
          <TreeTablePreserveSelectedRowKeysAntd
            checkStrictly={checkStrictly}
            preserveSelectedRowKeys={preserveSelectedRowKeys}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd tree-table-preserveSelectedRowKeys
          demo（树形 × 分页 × checkStrictly × preserveSelectedRowKeys）。顶部 CheckStrictly +
          Preserve 两开关共享驱动两侧。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>preserve=false 的 key 保留范围</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧都用<strong>完整数据</strong>（未排序/未筛选/未分页）判断 key 是否还在，
                  key 保留范围一致：仍存在于数据源的 key 保留，彻底离开数据源的 key 丢弃。</li>
                <li><strong>触发条件</strong>：<code>preserveSelectedRowKeys: false</code> + dataSource 跨请求切换。</li>
                <li><strong>说明</strong>：本 demo 用固定数据源，
                  两侧 preserve=true / false 行为一致。详见
                  <code>docs/features/interaction/selection.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>checkStrictly 默认值</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧默认均为 <strong>true</strong>（父子独立），无差异。</li>
                <li><strong>触发条件</strong>：未显式传 <code>checkStrictly</code>。</li>
                <li><strong>说明</strong>：本 demo 两侧均显式传 <code>checkStrictly</code>（初值 false = 父子联动），顶部开关同时驱动两侧。</li>
              </ul>
            </li>
            <li>
              <strong>onSelect 回调</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：antd 侧额外接了 <code>onSelect</code>（<code>rowSelection</code> 的
                  单行勾选回调）；data-grid 侧仅接 <code>onChange</code>（同样声明了 <code>onSelect</code>，
                  demo 未使用）。</li>
                <li><strong>触发条件</strong>：勾选任意一行。</li>
              </ul>
            </li>
            <li>
              <strong>三场景演示</strong>（共享 CheckStrictly + Preserve 开关同时驱动两侧）：
              <ol style={{ margin: '4px 0', paddingLeft: 20 }}>
                <li>跨页保留：页1勾父 → 翻页2 → 翻回页1，勾选保留。</li>
                <li>折叠保留：展开父→勾子→折叠父→再展开仍勾。</li>
                <li>联动折叠：勾父 → 全部子（含折叠的）被勾。</li>
              </ol>
            </li>
            <li>
              <strong>分页</strong>：15 个父行 × 每父 2 个子行，分页 <code>defaultPageSize: 5</code> → 共 3 页
              （分页只数顶层父行；展开的子行不占页面行数）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

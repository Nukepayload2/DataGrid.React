import { useState } from 'react'
import { Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import TreeTablePreserveSelectedRowKeysDg from './tree-table-preserveSelectedRowKeys.dg'
import TreeTablePreserveSelectedRowKeysAntd from './tree-table-preserveSelectedRowKeys.antd'

export default function TreeTablePreserveSelectedRowKeysDemo() {
  const [checkStrictly, setCheckStrictly] = useState(false)
  const [preserveSelectedRowKeys, setPreserveSelectedRowKeys] = useState(true)
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
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
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd tree-table-preserveSelectedRowKeys
          demo（树形 × 分页 × checkStrictly × preserveSelectedRowKeys）。顶部 CheckStrictly +
          Preserve 两开关共享驱动两侧。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>preserve=false 数据源语义差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：对<strong>固定树形数据</strong>，两侧 preserve=false 翻页/折叠均不丢
                  key；但<strong>ajax（数据源切换）</strong>场景下，data-grid 与 antd 的 key 保留范围可能不同。</li>
                <li><strong>触发条件</strong>：<code>preserveSelectedRowKeys: false</code> + dataSource 跨请求切换。</li>
                <li><strong>差异原因</strong>：antd <code>getRecordByKey</code>（useLazyKVMap dig 递归 <code>rawData</code>
                  全树）与 data-grid 全树存在性判定（<code>filteredDataSource</code> 递归 walk）覆盖范围不同；
                  本 demo 用固定数据源，两侧 preserve=true / false 行为一致。详见
                  <code> docs/design-notes/selection.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>checkStrictly 引擎默认差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid <code>checkStrictly</code> 默认 <strong>true</strong>，
                  antd 默认 <strong>false</strong>。</li>
                <li><strong>触发条件</strong>：未显式传 <code>checkStrictly</code>。</li>
                <li><strong>差异原因</strong>：data-grid 引擎默认偏向父子独立。本 demo 两侧均显式传共享 state（初值 false）规避差异。</li>
              </ul>
            </li>
            <li>
              <strong>onSelect 回调差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：antd demo 含 <code>onSelect</code>；data-grid 仅 <code>onChange</code>。</li>
                <li><strong>触发条件</strong>：勾选任意一行。</li>
                <li><strong>差异原因</strong>：data-grid 尚未声明 onSelect 类型，左栏用 onChange 观察勾选变化（功能等价）。</li>
              </ul>
            </li>
            <li>
              <strong>三场景演示</strong>（共享 CheckStrictly + Preserve 开关同时驱动两侧）：
              <ol style={{ margin: '4px 0', paddingLeft: 20 }}>
                <li>跨页保留：页1勾父 → 翻页2 → 翻回页1，勾选保留。</li>
                <li>折叠保留：展开父→勾子→折叠父→再展开仍勾。</li>
                <li>联动跨页/折叠：勾父 → 全部子（含折叠/跨页的）被勾。</li>
              </ol>
            </li>
            <li>
              <strong>分页</strong>：15 父 × 2 子 + 分页 <code>defaultPageSize: 5</code> → 3 页/父
              （切片基于顶层父行；展开子行不占页大小预算）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

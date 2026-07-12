import { SplitDemo } from './_compare/SplitDemo'
import { useVirtualization } from './VirtualizationContext'
import AjaxDg from './remote-data.dg'
import AjaxAntd from './remote-data.antd'

export default function AjaxDemo() {
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      
      <SplitDemo
        minPaneWidth={600}
        left={<AjaxDg virtual={virtual} />}
        right={<AjaxAntd virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd ajax demo（loading +
          服务端分页/排序/筛选 + preserveSelectedRowKeys）。两栏各自维护异步加载 state，
          任一侧 onChange 只刷新该侧。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>服务端分页切片差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：当 <code>dataSource.length &lt; pagination.total</code>
                  时，data-grid 不再二次切片（假定 dataSource 已是当前页切片）；antd
                  <code>InternalTable</code> 同款判定。</li>
                <li><strong>触发条件</strong>：服务端模式（受控 <code>pagination</code> + <code>onChange</code>
                  触发请求，回填的 dataSource 是该页切片）。</li>
                <li><strong>差异原因</strong>：data-grid 的 <code>slicePage</code> 检测
                  <code>length &lt; total</code> 判定为服务端切片，避免覆盖；对齐 antd
                  <code>InternalTable.tsx</code> 同款检测，保证两侧切片行为一致。</li>
              </ul>
            </li>
            <li>
              <strong>筛选漏斗渲染条件</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：服务端筛选列常不带 <code>onFilter</code>（筛选在服务端做），
                  data-grid <code>filters/filterDropdown/onFilter</code> 任一存在即渲染漏斗；antd 同款。</li>
                <li><strong>触发条件</strong>：列配置 <code>filters</code> 但无 <code>onFilter</code>。</li>
                <li><strong>差异原因</strong>：服务端筛选场景下漏斗仍需展示以触发 onChange，两侧一致放宽条件。</li>
              </ul>
            </li>
            <li>
              <strong>数据源</strong>：两侧均用同一本地 mock（<code>queryData</code>，100 条），机制与
              antd demo 等价（loading + 异步回填），区别于 antd 官方 demo 的真实 fetch（避免网络依赖）。
            </li>
            <li>
              <strong>preserveSelectedRowKeys</strong>：两侧均 <code>true</code>，翻页后翻回勾选保留。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}


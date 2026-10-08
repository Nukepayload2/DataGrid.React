import { SplitDemo } from './_compare/SplitDemo'
import { useVirtualization } from './VirtualizationContext'
import AjaxDg from './remote-data.dg'
import AjaxAntd from './remote-data.antd'

export default function AjaxDemo() {
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
      
      <SplitDemo
        minPaneWidth={600}
        left={<AjaxDg virtual={virtual} />}
        right={<AjaxAntd virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd ajax demo（loading +
          服务端分页/排序/筛选 + preserveSelectedRowKeys）。两侧各自独立管理加载和数据，
          任一侧 onChange 只刷新该侧。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>服务端分页行为</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：当 <code>dataSource.length &lt; pagination.total</code>（即传入的数据已是当前页的数据）
                  时，data-grid 与 antd 都直接使用该 dataSource，不再重新切分。</li>
                <li><strong>触发条件</strong>：服务端模式（受控 <code>pagination</code> + <code>onChange</code>
                  触发请求，回填的 dataSource 是该页数据）。</li>
                <li><strong>说明</strong>：该判定与 antd 行为对齐，保证服务端分页模式下两侧展示的数据一致。</li>
              </ul>
            </li>
            <li>
              <strong>筛选图标的显示条件</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：服务端筛选的列常不带 <code>onFilter</code>（筛选在服务端做），
                  data-grid 与 antd 都只要设置了 <code>filters</code>、<code>filterDropdown</code> 或 <code>onFilter</code>
                  任意一项，就在该列显示筛选图标。</li>
                <li><strong>触发条件</strong>：列配置 <code>filters</code> 但无 <code>onFilter</code>。</li>
                <li><strong>说明</strong>：服务端筛选场景下仍需显示筛选图标，才能让用户通过它触发 onChange，两侧显示条件相同。</li>
              </ul>
            </li>
            <li>
              <strong>数据源</strong>：两侧均用同一本地模拟数据（<code>queryData</code>，100 条），模拟
              loading + 异步更新数据，区别于 antd 官方 demo 的真实网络请求（避免网络依赖）。
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


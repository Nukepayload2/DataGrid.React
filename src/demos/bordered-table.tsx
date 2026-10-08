import { useState } from 'react'
import { Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import { BorderedTitleFooterDg, BorderedFixedDg } from './bordered-table.dg'
import { BorderedTitleFooterAntd, BorderedFixedAntd } from './bordered-table.antd'

export default function BorderedDemo() {
  const [bordered, setBordered] = useState(true)
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div className="demo-view demo-view--stack demo-view--stack-wide">
      <DemoToolbar style={{ marginBottom: 0 }}>
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            同时驱动下方两示例的 data-grid 与 antd 两栏
          </span>
        </Space>
      </DemoToolbar>

      
      <div>
        <h3 style={{ margin: '0 0 12px' }}>
          示例 1：bordered + title/footer（antd 官方 bordered demo）
        </h3>
        <SplitDemo
          minPaneWidth={600}
          left={<BorderedTitleFooterDg bordered={bordered} virtual={virtual} />}
          right={<BorderedTitleFooterAntd bordered={bordered} virtual={virtual} />}
        >
          <div>
            <strong>对照说明：</strong>示例 1，bordered + title/footer。
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <strong>有 footer 时底部圆角</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li><strong>差异行为</strong>：有 footer 时，表格四角都是圆角（顶部表头 + 底部 footer
                    一起构成完整圆角矩形）。两侧一致（无差异）。</li>
                  <li><strong>触发条件</strong>：表格设了 <code>footer</code> 且 bordered 开启。</li>
                  <li><strong>差异原因</strong>：无差异，两侧外观一致。</li>
                </ul>
              </li>
              <li>
                <strong>Cash Assets 列（.column-money）</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li><strong>差异行为</strong>：两栏的 Cash Assets 列都带 <code>className:'column-money'</code>，
                    两侧均无视觉高亮（无差异）。<code>align</code> 两栏等价
                    （data-grid <code>'end'</code> = antd <code>'right'</code>）。</li>
                  <li><strong>触发条件</strong>：始终。</li>
                  <li><strong>差异原因</strong>：无差异。<code>column.className</code> 只是给该列附加的
                    类名，两侧默认样式都没有为 <code>column-money</code> 定义规则，所以不产生高亮。</li>
                </ul>
              </li>
            </ul>
          </div>
        </SplitDemo>
      </div>

      
      <div>
        <h3 style={{ margin: '0 0 12px' }}>
          示例 2：bordered + fixed 组合（验证固定列边框完整）
        </h3>
        <SplitDemo
          minPaneWidth={600}
          left={<BorderedFixedDg bordered={bordered} virtual={virtual} />}
          right={<BorderedFixedAntd bordered={bordered} virtual={virtual} />}
        >
          <div>
            <strong>对照说明：</strong>示例 2，bordered + fixed 组合。
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <strong>固定列组合边框</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li><strong>差异行为</strong>：Full Name+Age 左固定、Action 右固定，bordered 模式下
                    两侧竖向边框均完整（无差异）。</li>
                  <li><strong>触发条件</strong>：bordered 开启 + 横滚到固定列边界。</li>
                  <li><strong>差异原因</strong>：无差异，两侧固定列的边框外观一致。</li>
                </ul>
              </li>
              <li>
                <strong>fixed 取值差异</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li><strong>差异行为</strong>：data-grid 写 <code>'start'/'end'</code>，
                    antd 写 <code>'left'/'right'</code>。两侧的 <code>fixed</code> 都接受
                  <code>'start'/'end'</code> 与 <code>'left'/'right'</code> 两种写法，
                  渲染结果等价。</li>
                  <li><strong>触发条件</strong>：始终（列定义写死）。</li>
                  <li><strong>差异原因</strong>：无差异，两种写法效果相同。</li>
                </ul>
              </li>
            </ul>
          </div>
        </SplitDemo>
      </div>
    </div>
  )
}

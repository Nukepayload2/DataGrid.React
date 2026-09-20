import { Flex, Typography, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { useVirtualization } from './VirtualizationContext'
import { SummaryTotalDg, SummaryFixedDg } from './summary-row.dg'
import { SummaryTotalAntd, SummaryFixedAntd } from './summary-row.antd'

const { Text } = Typography

export default function SummaryDemo() {
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div className="demo-view">
      <Flex vertical gap="middle">
        <div>
          <div
            style={{
              marginBottom: 8,
              fontWeight: 600,
              color: token.colorText,
            }}
          >
            示例 1：summary 函数计算总计（Total + Balance colSpan=2）
          </div>
          <SplitDemo
            minPaneWidth={600}
            left={<SummaryTotalDg virtual={virtual} />}
            right={<SummaryTotalAntd virtual={virtual} />}
          />
        </div>

        <div>
          <div
            style={{
              marginBottom: 8,
              fontWeight: 600,
              color: token.colorText,
            }}
          >
            示例 2：Table.Summary fixed sticky bottom（滚动固定底部）
          </div>
          <SplitDemo
            minPaneWidth={600}
            left={<SummaryFixedDg virtual={virtual} />}
            right={<SummaryFixedAntd virtual={virtual} />}
          />
        </div>
      </Flex>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: token.colorFillQuaternary,
          borderRadius: 8,
          color: token.colorTextSecondary,
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        <p style={{ margin: '0 0 4px' }}>
          <b>对照说明：</b>
          左右并排呈现 data-grid 与 antd summary（示例1 计算总计 + 示例2 fixed sticky bottom）。
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <b>示例 1</b>：两侧均 <code>summary=&#123;(pageData) =&gt; ...&#125;</code> 计算总计——
          Total 行（Borrow=<Text type="danger">195</Text> / Repayment=<Text>88</Text>）+
          Balance 行（colSpan=2 = <Text type="danger">107</Text>）。
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <b>示例 2</b>：两侧均 <code>&lt;Table.Summary fixed&gt;</code> sticky bottom——表体纵向滚动时
          summary 固定底部。
        </p>
        <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
          <li>示例 1 展示 <code>summary</code> 函数如何根据当前页数据计算多行汇总。</li>
          <li>示例 2 展示 <code>&lt;Table.Summary fixed&gt;</code> 在表体滚动时固定在底部。</li>
          <li>左栏 data-grid 使用 <code>scroll.y: true</code>，高度由父容器决定；右栏 antd 保持数字高度写法。</li>
        </ul>
      </div>
    </div>
  )
}

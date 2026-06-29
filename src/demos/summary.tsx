/**
 * summary demo：左右并排呈现 data-grid 与 antd summary（示例1 计算总计 + 示例2 fixed sticky bottom）。
 *
 * 两示例各自独立（示例1 静态 + 示例2 固定开关嵌在 Table.Summary fixed 属性中），
 * 故无共享控制条，两示例直接并排，每示例左右各一对。
 */

import { Flex, Typography, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
// ON 时叠加 virtual + scroll.y（split pane 自动限高）
import { useVirtualization } from './VirtualizationContext'
import { SummaryTotalDg, SummaryFixedDg } from './summary.dg'
import { SummaryTotalAntd, SummaryFixedAntd } from './summary.antd'

const { Text } = Typography

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function SummaryDemo() {
  // ON 时两侧叠加 virtual=true。
  // - 示例 1：ON 时叠加 scroll.y（两侧 pagination={false}，antd y:340 扣除无分页条高）。
  // - 示例 2：已自带 scroll（dg y:true / antd y:500），ON 时仅叠加 virtual（从数据区域切到虚拟）；
  //   scroll 原值保留（fixed sticky bottom 仍生效）。
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      <Flex vertical gap="middle">
        {/*
          示例 1（计算总计）：两侧并排对照。
          minPaneWidth=600（3 列窄表）→ 横排阈值 ≈ 1216，常规视口（≥1280）横排。
        */}
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

        {/*
          示例 2（fixed sticky bottom）：两侧并排对照。
          左栏 data-grid scroll.y:true（父容器 height:550，对齐右栏 antd scroll.y:500 表体 + 表头 ~50）。
          右栏 antd scroll.y:500（忠实官方数字）。
          minPaneWidth=600 → 横排阈值 ≈ 1216。
        */}
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

      {/*
        底部说明区（SplitDemo 之外的独立块，两个示例共用一份说明）。
      */}
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
          <li>
            <strong>DOM 结构</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
              <li><strong>差异行为</strong>：antd summary 是 <code>&lt;tfoot&gt;&lt;tr&gt;&lt;td colspan&gt;</code>；data-grid 是 div + CSS Grid（无 tfoot），Cell 按 <code>index</code>（0-based）+ <code>colSpan</code> 定位。</li>
              <li><strong>触发条件</strong>：渲染任意 summary。</li>
              <li><strong>差异原因</strong>：data-grid 用 CSS Grid，summary Cell 作为 grid item（<code>gridColumn</code> 由 index+colSpan 推导），与表体同处一个 grid；antd 原生 <code>&lt;table&gt;</code> 用 tfoot/colspan。视觉等价（summary 在表体底部，fixed sticky bottom）。详见 <code>docs/design-notes/summary.md</code>。</li>
            </ul>
          </li>
          <li>
            <strong>scroll.y 取值</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
              <li><strong>差异行为</strong>：示例 2 左栏 data-grid <code>scroll.y:true</code>（父容器 height:550）；右栏 antd 数字 <code>scroll.y:500</code>。</li>
              <li><strong>触发条件</strong>：示例 2 表体纵向滚动。</li>
              <li><strong>差异原因</strong>：data-grid 用 CSS 自适应高度（容器 clientHeight 实时测量），antd 需数字像素高度。</li>
            </ul>
          </li>
          <li>
            <strong>滚动条外观</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
              <li><strong>差异行为</strong>：data-grid 侧用悬浮滚动条；antd 侧用浏览器默认滚动条。</li>
              <li><strong>触发条件</strong>：任意滚动。</li>
              <li><strong>差异原因</strong>：antd 官方 demo 用 antd-style 自定义细滚动条，data-grid 项目未装 antd-style，两侧均不引入；data-grid 侧走引擎悬浮滚动条。详见 <code>docs/design-notes/scrollbar.md</code>。</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  )
}

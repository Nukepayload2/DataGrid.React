/**
 * row-selection-custom-debug 双栏对照 demo：复刻 antd
 *   `G:\Projects\ant-design\components\table\demo\row-selection-custom-debug.tsx`。
 * 共享数据驱动左栏 data-grid 与右栏 antd Table 的 `rowSelection.renderCell`
 * 自定义勾选格内容 + 返回 `props.rowSpan`（合并行）。46 行单列 Name。
 *
 * renderCell 两侧逻辑逐字一致（`index % 2 === 0 ? 2 : 0` 合并 +
 * `<>{String(checked)}: {node}</>` 渲染）。无控制条（renderCell 逻辑固定，两侧同款）。
 */

import { SplitDemo } from './_compare/SplitDemo'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
import RowSelectionCustomDebugDg from './row-selection-custom-debug.dg'
import RowSelectionCustomDebugAntd from './row-selection-custom-debug.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function RowSelectionCustomDebugDemo() {
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y。
  // 注：本 demo 含 rowSpan 合并行，合并 × 虚拟属已知简化（不在此处理）。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/*
        minPaneWidth=480（窄表，单列 Name + 选择列=2 列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。46 行全显（无分页），
        SplitDemo pane body 内独立滚动。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<RowSelectionCustomDebugDg virtual={virtual} />}
        right={<RowSelectionCustomDebugAntd virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd row-selection-custom-debug demo，
          共享数据驱动两侧 renderCell 自定义勾选格 + rowSpan 合并行（renderCell 逻辑逐字一致：
          偶数行合并 2 行、奇数行 rowSpan=0 被覆盖）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>rowSpan 接入机制</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 引擎在 <code>onCell</code> 提取
                  <code>props.rowSpan</code> 交给 cellMerge（被覆盖格 hidden 不渲染），
                  <code>render</code> 提取 <code>children</code> 替代默认勾选 UI；右栏 antd 由
                  rc-table 原生 <code>onCell</code>/<code>render</code> 链路处理。</li>
                <li><strong>触发条件</strong>：<code>renderCell</code> 返回
                  <code>{'{ props: { rowSpan }, children }'}</code>。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid，需经 cellMerge 在引擎层
                  把 rowSpan&gt;0 的被覆盖格隐藏（保持 grid track 布局），antd 原生 table 直接靠
                  <code>&lt;td rowSpan&gt;</code> 跨行。详见 <code>docs/design-notes/selection.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>类型来源</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 <code>TableRowSelection</code> 来自 data-grid
                  引擎；右栏 antd <code>TableProps['rowSelection']</code> 来自 antd 本体。</li>
                <li><strong>触发条件</strong>：声明 rowSelection 类型时。</li>
                <li><strong>差异原因</strong>：两侧各自维护等价类型声明，签名等价（renderCell 回调
                  形态、props 返回结构一致）。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

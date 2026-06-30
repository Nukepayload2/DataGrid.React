/**
 * edit-row 双栏对照 demo：行级 editingKey + Edit/Save/Cancel + InputNumber(age)/Input +
 * 100 行分页 + Form 外层。两侧各自维护 form/data/editingKey state（初始数据相同，
 * 见 `_compare/edit-row.shared.ts`）。
 */

import { SplitDemo } from './_compare/SplitDemo'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y。
import { useVirtualization } from './VirtualizationContext'
import EditRowDg from './edit-row.dg'
import EditRowAntd from './edit-row.antd'

// ===========================================================================
// Demo 根组件
// ===========================================================================

export default function EditRowDemo() {
  // 虚拟化开关接入：顶栏 Switch ON 时两侧 Table 叠加 virtual + scroll.y。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/*
        minPaneWidth=480（窄表，4 列无 scroll.x + 分页）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<EditRowDg virtual={virtual} />}
        right={<EditRowAntd virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd edit-row（行级 editingKey +
          Edit/Save/Cancel + InputNumber(age)/Input + 100 行分页 + Form 外层）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>EditableCell 返回值</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 的 <code>components.body.cell</code> 返回
                  <strong> 内容 ReactNode（不包 td）</strong>，引擎渲染在 <code>.dg-cell-inner</code>；
                  antd 返回原生 <code>&lt;td &#123;...props&#125;&gt;</code>。</li>
                <li><strong>触发条件</strong>：编辑态整行（name/age/address 三列进入 Input/InputNumber）。</li>
                <li><strong>差异原因</strong>：data-grid 用 div 渲染（无 td），cell 组件只产出单元格内容；
                  antd 是原生 <code>&lt;table&gt;</code>，cell 组件产出整个 <code>&lt;td&gt;</code>。</li>
              </ul>
            </li>
            <li>
              <strong>Form context 透传</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧均 <strong>Form 在 Table 外层</strong>
                  （<code>component=&#123;false&#125;</code> 不产生 DOM），Form.Item 在 EditableCell 内。
                  data-grid 的 div 渲染层级<em>不</em>阻断 Form context 透传到 Form.Item。</li>
                <li><strong>触发条件</strong>：点击 Edit 后整表共享一个 Form（<code>Form.useForm</code>），
                  靠 <code>editingKey</code> 区分当前编辑行。</li>
                <li><strong>差异原因</strong>：React FormContext 是 React context（跨组件树传递），
                  不依赖 DOM 层级；data-grid 的 dg-row/dg-cell 只改变 DOM 不改变 React 组件树，
                  故 context 正常透传（<code>validateFields</code> 可成功）。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

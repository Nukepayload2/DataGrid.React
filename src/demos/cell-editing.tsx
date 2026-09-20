
import { SplitDemo } from './_compare/SplitDemo'
import { useVirtualization } from './VirtualizationContext'
import EditCellDg from './cell-editing.dg'
import EditCellAntd from './cell-editing.antd'

// Demo 根组件

export default function EditCellDemo() {
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
      {/*
        minPaneWidth=480（窄表，4 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<EditCellDg virtual={virtual} />}
        right={<EditCellAntd virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd edit-cell
          （components.body.cell/row + onCell 编辑 + 增删行）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>EditableCell / EditableRow 返回值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid <code>EditableCell</code> 返回内容 ReactNode
                  （不包 <code>&lt;td&gt;</code>），<code>EditableRow</code> 用
                  <code> Form component=&#123;false&#125;</code> + Provider（不产生 DOM）；
                  antd 两侧分别返回 <code>&lt;td&gt;</code> / <code>&lt;tr&gt;</code>。</li>
                <li><strong>触发条件</strong>：任意行渲染时（components.body.cell/row 自定义组件）。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid + div 渲染（<code>dg-row</code>/<code>dg-cell</code>），
                  单元格需穿透为 grid 直接子元素；引擎把 EditableCell 渲染在 <code>.dg-cell-inner</code> 处。
                  antd 原生 <code>&lt;table&gt;</code> 走原生 <code>&lt;td&gt;</code>/<code>&lt;tr&gt;</code>。</li>
              </ul>
            </li>
            <li>
              <strong>Form context 透传</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid div 渲染层级下，antd Form context 仍正常透传到
                  EditableCell 内的 Form.Item，save(validateFields) 成功。</li>
                <li><strong>触发条件</strong>：单元格进入编辑态后回车/失焦触发 validateFields。</li>
                <li><strong>差异原因</strong>：React context 不依赖 DOM 层级，data-grid 的 div 渲染不改变
                  React 组件树层级，故 Form context 跨层透传正常。</li>
              </ul>
            </li>
            <li>
              <strong>编辑/增删行各自独立</strong>：两栏各自维护 <code>dataSource</code>/<code>count</code> state
              （编辑是局部交互，共用 dataSource 会互相干扰）。点击 name 单元格进入编辑（回车/失焦保存）。
            </li>
            <li>
              <strong>rowClassName + CSS</strong>：两侧均传 <code>rowClassName</code> 返回
              <code>{'editable-row'}</code> + 同款 <code>.editable-cell-value-wrap</code> hover 边框 CSS
              （注入 document.head，两子组件共用同一 CSS，幂等检查防重复注入）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}


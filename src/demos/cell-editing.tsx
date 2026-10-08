
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
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd edit-cell
          （components.body.cell/row + onCell 编辑 + 增删行）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>EditableCell / EditableRow 返回值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：antd 的 <code>EditableCell</code> / <code>EditableRow</code> 分别返回
                  <code>&lt;td&gt;</code> / <code>&lt;tr&gt;</code>；data-grid 的 <code>EditableCell</code> 只返回单元格内容
                  （不包 <code>&lt;td&gt;</code>），<code>EditableRow</code> 原样渲染该行的各单元格（不产生额外 DOM）。</li>
                <li><strong>触发条件</strong>：任意行渲染时（components.body.cell/row 自定义组件）。</li>
                <li><strong>差异原因</strong>：用法无差异：两侧都通过 <code>components.body.cell/row</code> 传入自定义
                  单元格/行组件，编辑行为与外观一致。</li>
              </ul>
            </li>
            <li>
              <strong>Form 校验</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧的可编辑单元格都用 antd <code>&lt;Form.Item&gt;</code> 做必填校验，
                  校验通过才保存，行为一致。</li>
                <li><strong>触发条件</strong>：单元格进入编辑态后回车/失焦触发校验与保存。</li>
                <li><strong>差异原因</strong>：无差异。</li>
              </ul>
            </li>
            <li>
              <strong>编辑/增删行各自独立</strong>：两栏各自维护 <code>dataSource</code>/<code>count</code> state
              （编辑是局部交互，共用 dataSource 会互相干扰）。点击 name 单元格进入编辑（回车/失焦保存）。
            </li>
            <li>
              <strong>rowClassName + CSS</strong>：两侧均传 <code>rowClassName</code> 返回
              <code>{'editable-row'}</code>，并用同一套 <code>.editable-cell-value-wrap</code> hover 边框样式。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}


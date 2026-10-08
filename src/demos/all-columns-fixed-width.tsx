import { SplitDemo } from './_compare/SplitDemo'
import { declaredWidthTotal } from './_compare/all-columns-fixed-width.shared'
import AllColumnsFixedWidthDg from './all-columns-fixed-width.dg'
import AllColumnsFixedWidthAntd from './all-columns-fixed-width.antd'

export default function AllColumnsFixedWidthDemo() {
  return (
    <div className="demo-view">
      <SplitDemo
        minPaneWidth={480}
        left={<AllColumnsFixedWidthDg />}
        right={<AllColumnsFixedWidthAntd />}
        virtualizable={false}
      >
        <div>
          <strong>对照说明：</strong>两栏呈现所有列都声明数字 <code>width</code> 的表格。
          四列声明宽度总和为 <code>{declaredWidthTotal}px</code>，通常小于单个栏的可用宽度。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>全列固定宽度填满容器</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>预期行为</strong>：两侧表格都填满容器；列宽不会停在声明的 px 总和，
                  而是按声明宽度的比例放大到可用宽度。</li>
                <li><strong>触发条件</strong>：所有列都声明了数字（px）<code>width</code>，且没有传
                  <code>scroll.x:'max-content'</code>。</li>
                <li><strong>差异说明</strong>：两侧表现一致，列宽都按声明宽度的比例放大填满容器。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

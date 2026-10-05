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
          <strong>对照说明：</strong>前后两栏呈现所有列都声明 numeric <code>width</code> 的表格。
          四列声明宽度总和为 <code>{declaredWidthTotal}px</code>，通常小于单个 pane 的可用宽度。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>全列固定宽度填满容器</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>预期行为</strong>：两侧表格都填满容器；列宽不是停在声明 px 总和，
                  而是把声明宽度作为比例权重放大到可用宽度。</li>
                <li><strong>触发条件</strong>：所有真实列都给了 numeric/px <code>width</code>，且没有传
                  <code>scroll.x:'max-content'</code>。</li>
                <li><strong>实现差异</strong>：antd 用原生 <code>&lt;table&gt;</code> +
                  <code>&lt;colgroup&gt;</code> 声明列宽，<code>table-layout:auto</code> 下浏览器按声明宽度
                  比例放大填满；官方通常建议至少留一列不设宽度以减少复杂布局。data-grid 用 CSS Grid
                  <code>minmax(0,width-fr)</code> 表达同一结果，不需要 JS 测量列宽。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

import { SplitDemo } from './_compare/SplitDemo'
import { useVirtualization } from './VirtualizationContext'
import RowSelectionCustomDebugDg from './custom-selection-cell.dg'
import RowSelectionCustomDebugAntd from './custom-selection-cell.antd'

export default function RowSelectionCustomDebugDemo() {
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
      <SplitDemo
        minPaneWidth={480}
        left={<RowSelectionCustomDebugDg virtual={virtual} />}
        right={<RowSelectionCustomDebugAntd virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd row-selection-custom-debug demo：
          两侧表格共用同一份 dataSource，用 rowSelection.renderCell 自定义勾选格内容，
          并用 rowSpan 合并行（两侧 renderCell 逻辑相同：偶数行合并 2 行、奇数行 rowSpan=0
          不渲染、被上方合并格覆盖）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>rowSpan 用法</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧都通过 <code>renderCell</code> 返回值的
                  <code>props</code> 字段提供 <code>rowSpan</code>，并在 <code>children</code> 自定义勾选单元格内容。</li>
                <li><strong>触发条件</strong>：<code>renderCell</code> 返回
                  <code>{'{ props: { rowSpan }, children }'}</code>。</li>
                <li><strong>说明</strong>：本页重点验证选择列自定义内容和跨行合并能同时生效。</li>
              </ul>
            </li>
            <li>
              <strong>类型来源</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 的 <code>TableRowSelection</code> 是 data-grid
                  包导出的类型；antd 的 <code>TableProps['rowSelection']</code> 来自 antd 本体。</li>
                <li><strong>触发条件</strong>：声明 rowSelection 类型时。</li>
                <li><strong>说明</strong>：两侧 <code>renderCell</code> 回调的参数和返回结构相同。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

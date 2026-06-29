/**
 * 复刻 antd row-selection-and-operation demo：
 * `G:\Projects\ant-design\components\table\demo\row-selection-and-operation.tsx`。
 *
 * 双栏对照：左栏 data-grid Table（rowSelection.selectedRowKeys 受控 + 批量操作 Reload），
 * 右栏忠实复刻 antd demo。
 * 顶部操作区（Reload + Selected N items）作为共享控制条全宽置于 SplitDemo 上方，
 * 同一个 `selectedRowKeys` + `loading` state 同时驱动两侧 + 按钮。
 * 共享数据见 `_compare/row-selection-and-operation.shared.ts`。
 */

import { useState } from 'react'
import { Button, Flex } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import RowSelectionAndOperationDg from './row-selection-and-operation.dg'
import RowSelectionAndOperationAntd from './row-selection-and-operation.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function RowSelectionAndOperationDemo() {
  // 共享状态（提升到父）：顶部 Reload 按钮需直接操作「批量清空选择」。
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<React.Key>>([])
  const { virtual } = useVirtualization()
  // Reload 按钮的 loading 态（1s 模拟 ajax）。
  const [loading, setLoading] = useState(false)

  // 模拟 ajax：点 Reload → loading 1s → 清空选中 + 取消 loading（两侧同步）。
  const start = () => {
    setLoading(true)
    // ajax request after empty completing
    setTimeout(() => {
      setSelectedRowKeys([])
      setLoading(false)
    }, 1000)
  }

  const hasSelected = selectedRowKeys.length > 0

  return (
    <div style={{ padding: 24 }}>
      {/*
        顶部全宽操作区：antd 原始结构即"顶部操作区"（Reload + Selected N items），作为共享控制条
        全宽置于 SplitDemo 上方——同一组 selectedRowKeys/loading state 同时驱动两侧表格与按钮态。
      */}
      <DemoToolbar>
        <Flex align="center" gap="medium">
          <Button type="primary" onClick={start} disabled={!hasSelected} loading={loading}>
            Reload
          </Button>
          {hasSelected ? `Selected ${selectedRowKeys.length} items` : null}
        </Flex>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列 + 选择列=4 列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。46 行全显（无分页），
        SplitDemo pane body 内独立滚动。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <RowSelectionAndOperationDg
            selectedKeys={selectedRowKeys}
            onSelectedKeysChange={setSelectedRowKeys}
            virtual={virtual}
          />
        }
        right={
          <RowSelectionAndOperationAntd
            selectedKeys={selectedRowKeys}
            onSelectedKeysChange={setSelectedRowKeys}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd row-selection-and-operation demo，
          受控 selectedRowKeys 共享 + 顶部 Reload 批量清空。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>受控 selectedRowKeys</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧 <code>rowSelection.selectedRowKeys</code> 共用同一
                  state（真理源在 Demo 根组件），勾选任一侧 → 顶部 Reload 启用 +
                  <code> Selected N items</code>。</li>
                <li><strong>触发条件</strong>：勾选/取消勾选任一行。</li>
                <li><strong>差异原因</strong>：data-grid 与 antd 受控语义一致，无差异（行为对齐项）。</li>
              </ul>
            </li>
            <li>
              <strong>批量清空</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：点顶部 <code>Reload</code> → loading 1s →
                  <code> setSelectedRowKeys([])</code> → 两侧行 checkbox + 表头全选框同步清空。</li>
                <li><strong>触发条件</strong>：点 Reload 按钮（<code>hasSelected</code> 为 true）。</li>
                <li><strong>差异原因</strong>：两侧均由父 setState 驱动受控 UI，链路一致，无差异。</li>
              </ul>
            </li>
            <li>
              <strong>分页</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 默认不分页；右栏 antd demo 默认分页，
                  本 demo 显式传 <code>pagination={'{'}false{'}'}</code> 取消。</li>
                <li><strong>触发条件</strong>：始终（demo 写死 <code>pagination={'{'}false{'}'}</code>）。</li>
                <li><strong>差异原因</strong>：antd Table 对任意行数默认渲染分页条，data-grid 默认不渲染；
                  本 demo 取消 antd 分页以让 46 行全显对照。详见
                  <code>docs/design-notes/pagination.md</code>。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

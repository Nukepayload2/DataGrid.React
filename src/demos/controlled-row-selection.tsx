import { useState } from 'react'
import { Button, Flex } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import RowSelectionAndOperationDg from './controlled-row-selection.dg'
import RowSelectionAndOperationAntd from './controlled-row-selection.antd'

export default function RowSelectionAndOperationDemo() {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<React.Key>>([])
  const { virtual } = useVirtualization()
  const [loading, setLoading] = useState(false)

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
    <div className="demo-view">
      <DemoToolbar>
        <Flex align="center" gap="medium">
          <Button type="primary" onClick={start} disabled={!hasSelected} loading={loading}>
            Reload
          </Button>
          {hasSelected ? `Selected ${selectedRowKeys.length} items` : null}
        </Flex>
      </DemoToolbar>

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
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd row-selection-and-operation demo，
          受控 selectedRowKeys 共享 + 顶部 Reload 批量清空。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>受控 selectedRowKeys</strong>：两侧 <code>rowSelection.selectedRowKeys</code>
              由同一个 state 驱动（state 在 Demo 根组件），受控行为两侧一致：勾选任一行 → 顶部 Reload 按钮启用，
              并显示 <code>Selected N items</code>。
            </li>
            <li>
              <strong>批量清空</strong>：点顶部 <code>Reload</code> → loading 1 秒 →
              选中被清空，两侧行 checkbox + 表头全选框同步清空。
            </li>
            <li>
              <strong>分页</strong>：两侧默认都会开启分页；本 demo 显式传
              <code>pagination={'{'}false{'}'}</code> 取消，复刻 antd row-selection-and-operation 的 46 行全显效果，
              避免默认分页影响批量选择对照。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

/**
 * 复刻 antd row-selection-and-operation demo：
 * `G:\Projects\ant-design\components\table\demo\row-selection-and-operation.tsx`。
 *
 * === antd demo 要素 ===
 *
 * - `rowSelection.selectedRowKeys` **受控**（外部 useState 驱动）。
 * - `onChange(keys, rows)`：antd demo 用 console.log；本 demo 同时在页面下方展示 selectedRowKeys
 *   （可视化对照，便于无 console 环境验证）。
 * - 顶部操作区：
 *     * `Reload` 按钮（`type="primary"`，`disabled={!hasSelected}`，`loading` 态）。
 *     * 点击 `start()` → `setLoading(true)` → `setTimeout 1000ms` → `setSelectedRowKeys([])` +
 *       `setLoading(false)`（模拟 ajax 完成后清空选中）。
 *     * `hasSelected ? 'Selected N items' : null` 文案。
 * - 数据：46 行（Edward King 0..45，age 32，address `London, Park Lane no. i`）。
 * - columns：Name/Age/Address（纯文本，无 render）。
 *
 * === 与 antd demo 的差异 ===
 *
 * - antd 用 `<Flex gap="medium" vertical>`（antd v6 组件）布局；data-grid 决策 6 允许非核心控件用 antd，
 *   但本 demo 为最小依赖，用原生 div + flex 等价实现（视觉对齐 antd Flex 间距）。
 * - antd demo 默认分页（10/页）；**data-grid 尚未实现分页（S11 任务）**，本 demo **46 行全显**（无分页）。
 *   选择/批量操作不受分页缺失影响（受控 selectedRowKeys + 清空链路在本 demo 全显场景下同样成立）。
 *
 * === 验证点（S8）===
 *
 * 1. 受控 selectedRowKeys：
 *    - 勾选若干行 → Reload 按钮启用，显示 "Selected N items"。
 *    - 表头全选框反映半选/全选态。
 * 2. 批量操作清空（核心验证：外部 setState 清空 → 勾选 UI 同步清空）：
 *    - 点 Reload → 按钮转 loading（1s）→ 1s 后 selectedRowKeys 清空 →
 *      所有行 checkbox + 表头全选框**同步清空**为未选态，"Selected N items" 文案消失，Reload 再次 disabled。
 *    - 此路径验证 M5 受控 selectedRowKeys 的"外部清空 → UI 同步"链路（M5 row-selection demo 未专测批量清空）。
 * 3. onChange 回调：每次勾选触发 console.log（含 selectedRowKeys 与 selectedRows）。
 */

import { useState } from 'react'
import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'

interface DataType {
  key: number
  name: string
  age: number
  address: string
}

const columns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
]

const data: DataType[] = Array.from({ length: 46 }).map<DataType>((_, i) => ({
  key: i,
  name: `Edward King ${i}`,
  age: 32,
  address: `London, Park Lane no. ${i}`,
}))

/** 最小 Button（原生 button，视觉对齐 antd primary button）。 */
function PrimaryButton({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: '4px 15px',
        borderRadius: 6,
        border: 'none',
        background: disabled || loading ? 'rgba(0,0,0,0.04)' : '#1677ff',
        color: disabled || loading ? 'rgba(0,0,0,0.25)' : '#fff',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontSize: 14,
        lineHeight: '22px',
      }}
    >
      {loading ? 'Loading…' : children}
    </button>
  )
}

export default function RowSelectionAndOperationDemo() {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<React.Key>>([])
  const [loading, setLoading] = useState(false)

  // 模拟 ajax：点 Reload → loading 1s → 清空选中 + 取消 loading。
  const start = () => {
    setLoading(true)
    setTimeout(() => {
      setSelectedRowKeys([])
      setLoading(false)
    }, 1000)
  }

  // onChange：与 antd demo 一致 console.log，同时更新受控 state。
  const onSelectChange = (newSelectedRowKeys: Array<React.Key>) => {
    // eslint-disable-next-line no-console
    console.log('selectedRowKeys changed: ', newSelectedRowKeys)
    setSelectedRowKeys(newSelectedRowKeys)
  }

  const rowSelection: TableRowSelection<DataType> = {
    selectedRowKeys,
    onChange: onSelectChange,
  }

  const hasSelected = selectedRowKeys.length > 0

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 顶部操作区（对齐 antd <Flex align="center" gap="medium">）。 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <PrimaryButton onClick={start} disabled={!hasSelected} loading={loading}>
          Reload
        </PrimaryButton>
        {hasSelected ? `Selected ${selectedRowKeys.length} items` : null}
      </div>

      <Table<DataType>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data}
      />

      {/* 选中态可视化（antd demo 仅 console.log；这里额外页面展示便于无 console 验证）。 */}
      <div style={{ padding: 12, background: '#fafafa', borderRadius: 8 }}>
        <strong>selectedRowKeys:</strong>{' '}
        {selectedRowKeys.length === 0 ? (
          <span style={{ color: 'rgba(0,0,0,0.45)' }}>(none)</span>
        ) : (
          <code>[{selectedRowKeys.join(', ')}]</code>
        )}
        <div style={{ marginTop: 4, color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
          点 Reload 后 1 秒，selectedRowKeys 应清空为 (none)，且表格内勾选框同步清空。
          分页属 S11，本 demo 46 行全显。
        </div>
      </div>
    </div>
  )
}

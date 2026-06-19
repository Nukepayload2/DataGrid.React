/**
 * 复刻 antd row-selection demo：`G:\Projects\ant-design\components\table\demo\row-selection.tsx`。
 *
 * === antd demo 要素 ===
 *
 * - 顶部 Radio.Group 切换 type（'checkbox' | 'radio'）。
 * - Table 配 `rowSelection={{ type, onChange, getCheckboxProps }}`：
 *     * onChange(selectedRowKeys, selectedRows)：antd demo 用 console.log。
 *       本 demo 同时在页面下方展示 selectedRowKeys（可视化对照，便于无 console 环境验证）。
 *     * getCheckboxProps(record)：禁用 "Disabled User" 行（record.name === 'Disabled User'），
 *       并透传 name（antd demo 同款）。
 * - 数据：4 行，最后一行被禁用。
 *
 * === 与 antd demo 的差异 ===
 *
 * - antd 用 `Radio.Group`（antd 组件）；data-grid 不依赖 antd 本体，用原生 `<input type="radio">`
 *   最小实现 Radio.Group（视觉等价）。
 * - onChange 同样用 console.log（保留与 antd 一致）；额外用页面状态展示选中 key 列表。
 *
 * === 验证点（M5）===
 *
 * 1. checkbox 模式：
 *    - 勾选某行 → 该行 + 表头反映状态。
 *    - 表头全选框：未选/全选/半选（部分勾选时 indeterminate）三态正确。
 *    - 全选/全不选切换。
 *    - "Disabled User" 行的 checkbox 不可勾选（点击无反应、视觉 disabled）。
 * 2. radio 模式：
 *    - 单选互斥（点新行自动取消旧行）。
 *    - 表头无全选框。
 *    - "Disabled User" 行的 radio 不可选。
 * 3. onChange 回调：每次勾选触发 console.log（含 selectedRowKeys 与 selectedRows）。
 */

import { useState } from 'react'
import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'

interface DataType {
  key: string
  name: string
  age: number
  address: string
}

const columns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text: string) => <a>{text}</a>,
  },
  {
    title: 'Age',
    dataIndex: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
]

const data: DataType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park' },
  { key: '4', name: 'Disabled User', age: 99, address: 'Sydney No. 1 Lake Park' },
]

/** 最小 Radio.Group（原生 input[type='radio']，视觉对齐 antd）。 */
function RadioGroup({
  value,
  onChange,
  options,
}: {
  value: 'checkbox' | 'radio'
  onChange: (v: 'checkbox' | 'radio') => void
  options: Array<{ value: 'checkbox' | 'radio'; label: string }>
}) {
  return (
    <span style={{ display: 'inline-flex', gap: 16 }}>
      {options.map((opt) => (
        <label key={opt.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="radio"
            name="selection-type"
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            style={{ margin: 0 }}
          />
          {opt.label}
        </label>
      ))}
    </span>
  )
}

export default function RowSelectionDemo() {
  const [selectionType, setSelectionType] = useState<'checkbox' | 'radio'>('checkbox')
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])

  // 切换 type 时清空已选（避免 checkbox→radio 时残留多选）。
  const handleTypeChange = (v: 'checkbox' | 'radio') => {
    setSelectionType(v)
    setSelectedKeys([])
  }

  // rowSelection 配置：对齐 antd demo（onChange + getCheckboxProps）。
  // selectedRowKeys 受控（由本组件 state 驱动）；onChange 时更新 state。
  const rowSelection: TableRowSelection<DataType> = {
    type: selectionType,
    selectedRowKeys: selectedKeys,
    onChange: (keys, rows) => {
      // 与 antd demo 一致：console.log 输出（便于浏览器 console 对照）。
      // eslint-disable-next-line no-console
      console.log(`selectedRowKeys: ${JSON.stringify(keys)}`, 'selectedRows: ', rows)
      setSelectedKeys(keys)
    },
    getCheckboxProps: (record: DataType) => ({
      disabled: record.name === 'Disabled User', // 禁用"Disabled User"行
      name: record.name,
    }),
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <RadioGroup
          value={selectionType}
          onChange={handleTypeChange}
          options={[
            { value: 'checkbox', label: 'Checkbox' },
            { value: 'radio', label: 'Radio' },
          ]}
        />
      </div>

      {/* 分割线（antd demo 用 <Divider />，这里用 border-top 替代）。 */}
      <div style={{ borderTop: '1px solid #f0f0f0', margin: '0 0 16px' }} />

      <Table<DataType>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data}
      />

      {/* 选中态可视化（antd demo 仅 console.log；这里额外页面展示便于无 console 验证）。 */}
      <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
        <strong>selectedRowKeys:</strong>{' '}
        {selectedKeys.length === 0 ? (
          <span style={{ color: 'rgba(0,0,0,0.45)' }}>(none)</span>
        ) : (
          <code>[{selectedKeys.map((k) => `"${k}"`).join(', ')}]</code>
        )}
        <div style={{ marginTop: 4, color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
          打开浏览器 console 可看到 onChange 回调日志（与 antd demo 一致）。
        </div>
      </div>
    </div>
  )
}

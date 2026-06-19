/**
 * 复刻 antd `hidden-columns` demo：
 *   `G:\Projects\ant-design\components\table\demo\hidden-columns.tsx`
 *
 * 重点：用 Checkbox 控制列显隐；`column.hidden` 动态切换。
 *
 * === antd demo 要素 ===
 *
 * - 8 列（Column 1..8），dataIndex 全为 `address`（同 antd demo），title 各异。
 * - 顶部 `Checkbox.Group` 列出所有列 title，`checkedList` 控制哪些列显示。
 *   默认全选（所有列可见）。
 * - `newColumns = columns.map((c) => ({ ...c, hidden: !checkedList.includes(c.key) }))`：
 *   不在 checkedList 中的列标记为 hidden。
 * - 取消勾选某列 → 该列 `column.hidden = true` → 引擎把其 grid track 置为 `0fr`（track 仍占位），
 *   单元格/表头格内容 `visibility:hidden + overflow:hidden`，配合 `.dg-grid` 的
 *   `transition: grid-template-columns 0.3s` 实现 `0fr↔原宽` 平滑过渡。
 *
 * === 与 antd demo 的差异 ===
 *
 * - antd 用 `Checkbox.Group`（antd 组件）；data-grid 不依赖 antd 本体，用原生 `<input type="checkbox">`
 *   最小实现等价的 Checkbox.Group（视觉对齐 antd：方块勾选框 + label 横排）。
 * - 数据 / 列定义与 antd demo 一致（8 列、2 行；dataIndex 全为 address）。
 *
 * === 验证点（M6）===
 *
 * 1. 初始：8 列全显，Checkbox.Group 全选。
 * 2. 取消勾选 "Column 3" → 第 3 列平滑收起（0fr 过渡）消失；其它列不动（线号稳定，无跳变）。
 * 3. 再勾选 "Column 3" → 第 3 列平滑展开恢复。
 * 4. 同时取消多列 → 多列同时收起/展开。
 * 5. 全部取消 → 表格内容区缩到极窄（仅剩 padding）；表头各格 0fr track。
 * 6. 表头线号稳定：取消/恢复勾选不会导致其它列的标题/数据错位。
 */
import { useState } from 'react'
import { Table } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: React.Key
  name: string
  age: number
  address: string
}

const columns: ColumnType<DataType>[] = [
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  { title: 'Column 6', dataIndex: 'address', key: '6' },
  { title: 'Column 7', dataIndex: 'address', key: '7' },
  { title: 'Column 8', dataIndex: 'address', key: '8' },
]

const data: DataType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York Park' },
  { key: '2', name: 'Jim Green', age: 40, address: 'London Park' },
]

/** 默认全选（所有列可见）。 */
const defaultCheckedList = columns.map((item) => item.key as string)

/**
 * 最小 Checkbox.Group（原生 input[type='checkbox']，视觉对齐 antd）。
 * - value：当前选中的 value 数组（受控）。
 * - options：选项列表（label + value）。
 * - onChange：勾选变化时回调，返回新的选中 value 数组。
 */
function CheckboxGroup({
  value,
  options,
  onChange,
}: {
  value: Array<string>
  options: Array<{ label: React.ReactNode; value: string }>
  onChange: (next: Array<string>) => void
}) {
  // 单项勾选：把 value 加入/移出数组（保持原 options 顺序，与 antd Checkbox.Group 一致）。
  const toggle = (v: string, checked: boolean) => {
    const next = options.map((o) => o.value).filter((id) => {
      if (id === v) return checked
      return value.includes(id)
    })
    onChange(next)
  }
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '8px 16px' }}>
      {options.map((opt) => (
        <label
          key={opt.value}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={value.includes(opt.value)}
            onChange={(e) => toggle(opt.value, e.target.checked)}
            style={{ margin: 0 }}
          />
          {opt.label}
        </label>
      ))}
    </span>
  )
}

export default function HiddenColumnsDemo() {
  const [checkedList, setCheckedList] = useState<Array<string>>(defaultCheckedList)

  const options = columns.map(({ key, title }) => ({
    label: title,
    value: key as string,
  }))

  // 不在 checkedList 的列标记为 hidden（对齐 antd demo 写法）。
  const newColumns = columns.map((item) => ({
    ...item,
    hidden: !checkedList.includes(item.key as string),
  }))

  return (
    <div style={{ padding: 24 }}>
      {/* 分割线（antd demo 用 <Divider>，这里用 border-top 替代）。 */}
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Columns displayed</div>
      <div style={{ borderTop: '1px solid #f0f0f0', margin: '0 0 16px' }} />

      <CheckboxGroup value={checkedList} options={options} onChange={setCheckedList} />

      <Table<DataType>
        columns={newColumns}
        dataSource={data}
        style={{ marginTop: 24 }}
      />
    </div>
  )
}

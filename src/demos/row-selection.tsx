/**
 * 复刻 antd row-selection demo：`G:\Projects\ant-design\components\table\demo\row-selection.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（rowSelection type 切换 + getCheckboxProps
 *   禁用 "Disabled User" 行 + onChange 回调 + 页面 selectedKeys 可视化）。type 用原生
 *   `<input type="radio">` 最小 RadioGroup（data-grid 引擎不依赖 antd 本体控件）。
 * - **右栏（antd Table）**：忠实复刻 antd row-selection demo（antd `<Radio.Group>` + antd
 *   `<Divider>` + antd 原生 rowSelection，不再用左栏原生 input radio 等价实现）。
 * - **共享控制条**：`Selection Type` Radio.Group（Checkbox/Radio 切换），同一个 state
 *   同时驱动两侧 `rowSelection.type`；切换 type 时同步清空 selectedKeys（避免 checkbox→radio
 *   残留多选），**两侧同步清空**。
 * - **共享状态**：`selectedKeys`（受控）+ `selectionType`，**同一组 state 同时驱动两侧**；
 *   两侧 onChange 都写回同一个 selectedKeys，diff 选中差异（§9 disabled 行灰底差异对照）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/row-selection.shared.ts`。
 *
 * === antd demo 要素（M5）===
 *
 * - 顶部 Radio.Group 切换 type（'checkbox' | 'radio'）。
 * - Table 配 `rowSelection={{ type, onChange, getCheckboxProps }}`：
 *     * onChange(selectedRowKeys, selectedRows)：antd demo 用 console.log。
 *     * getCheckboxProps(record)：禁用 "Disabled User" 行（record.name === 'Disabled User'），
 *       并透传 name（antd demo 同款）。
 * - 数据：4 行，最后一行被禁用。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **type 控件**：左栏用原生 `<input type="radio">` 最小 RadioGroup（决策 6 允许非核心控件
 *    用 antd，但 data-grid 引擎本身不依赖 antd 本体，保留改造前的原生实现）；右栏 antd
 *    `<Radio.Group>`。
 * 2. **分隔线**：左栏用 `border-top`；右栏 antd `<Divider>`。
 * 3. **★ §9 已知差异（disabled 行灰底）**：data-grid disabled 行**无整行灰底**（仅 checkbox
 *    自身灰），与 antd 默认 disabled 行淡灰背景不一致。**对照可见**——如实保留差异，
 *    登记 §9（M5）不修。
 * 4. **onChange 回调签名**：data-grid `onChange(keys, rows, info)` 三参；antd `onChange(keys, rows)`
 *    两参。两侧均 console.log 实际入参（对照可看 console）。
 *
 * === 验证点（M5 + 决策 9）===
 *
 * 【checkbox 模式】
 * 1. 勾选某行 → 表头反映状态；表头全选框三态（未选/全选/半选）。
 * 2. 表头全选切换；"Disabled User" 行 checkbox 不可勾选（点击无反应、视觉 disabled）。
 * 【radio 模式】
 * 3. 单选互斥；表头无全选框；"Disabled User" 行 radio 不可选。
 * 【★ 双栏对照（§9 差异）】
 * 4. disabled 行（"Disabled User"）：
 *    - 右栏 antd：整行淡灰背景（bg-container-disabled）+ checkbox 灰。
 *    - 左栏 data-grid：**仅 checkbox 灰，整行无灰底**（§9 已知差异，登记不修）。
 * 5. 两侧 onChange 各自 console.log（selectedRowKeys + selectedRows）。
 * 6. 切换 type → 两侧 selectedKeys 同步清空（共享 state）。
 */

import { useState } from 'react'
import { Divider, Radio, Space, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/row-selection.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
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

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd row-selection demo
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
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

// ---------------------------------------------------------------------------
// 左栏：最小 Radio.Group（原生 input[type='radio']，视觉对齐 antd）。保留改造前实现。
// ---------------------------------------------------------------------------

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
        <label
          key={opt.value}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        >
          <input
            type="radio"
            name="selection-type-dg"
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

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

type SelectionType = 'checkbox' | 'radio'

export default function RowSelectionDemo() {
  // ★ 共享状态：同一组 state 同时驱动两侧表格。
  const [selectionType, setSelectionType] = useState<SelectionType>('checkbox')
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])

  // 切换 type 时清空已选（避免 checkbox→radio 时残留多选），同步两侧。
  const handleTypeChange = (v: SelectionType) => {
    setSelectionType(v)
    setSelectedKeys([])
  }

  // 左栏（data-grid）rowSelection：selectedRowKeys 受控（共享 state）+ onChange 写回同一 state。
  const dgRowSelection: TableRowSelection<RecordType> = {
    type: selectionType,
    selectedRowKeys: selectedKeys,
    onChange: (keys, rows) => {
      // 与 antd demo 一致：console.log 输出（便于浏览器 console 对照）。
      // eslint-disable-next-line no-console
      console.log(`selectedRowKeys: ${JSON.stringify(keys)}`, 'selectedRows: ', rows)
      setSelectedKeys(keys)
    },
    getCheckboxProps: (record: RecordType) => ({
      disabled: record.name === 'Disabled User', // 禁用"Disabled User"行
      name: record.name,
    }),
  }

  // 右栏（antd）rowSelection：selectedRowKeys 受控（共享 state）+ onChange 写回同一 state。
  // ★ 与 antd row-selection demo 逐字一致（onChange + getCheckboxProps），叠加 type + selectedRowKeys 受控。
  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {
    type: selectionType,
    selectedRowKeys: selectedKeys,
    onChange: (keys: React.Key[], rows: RecordType[]) => {
      // eslint-disable-next-line no-console
      console.log(`selectedRowKeys: ${keys}`, 'selectedRows: ', rows)
      setSelectedKeys(keys)
    },
    getCheckboxProps: (record: RecordType) => ({
      disabled: record.name === 'Disabled User', // Column configuration not to be checked
      name: record.name,
    }),
  }

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一组 state 同时驱动两侧表格。 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <Space>
          <span style={{ color: 'rgba(0,0,0,0.65)' }}>Selection Type:</span>
          <Radio.Group
            onChange={(e) => handleTypeChange(e.target.value as SelectionType)}
            value={selectionType}
          >
            <Radio value="checkbox">Checkbox</Radio>
            <Radio value="radio">Radio</Radio>
          </Radio.Group>
        </Space>
      </div>

      {/*
        minPaneWidth=480（窄表，3 列无 scroll.x + 选择列=4 列）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <div>
            <RadioGroup
              value={selectionType}
              onChange={handleTypeChange}
              options={[
                { value: 'checkbox', label: 'Checkbox' },
                { value: 'radio', label: 'Radio' },
              ]}
            />
            {/* 分割线（antd demo 用 <Divider />，这里用 border-top 替代）。 */}
            <div style={{ borderTop: '1px solid #f0f0f0', margin: '0 0 16px' }} />
            <Table<RecordType>
              rowSelection={dgRowSelection}
              columns={dgColumns}
              dataSource={data}
            />
          </div>
        }
        right={
          <div>
            <Radio.Group
              onChange={(e) => handleTypeChange(e.target.value as SelectionType)}
              value={selectionType}
            >
              <Radio value="checkbox">Checkbox</Radio>
              <Radio value="radio">Radio</Radio>
            </Radio.Group>
            <Divider />
            <AntdTable<RecordType>
              rowSelection={antdRowSelection}
              columns={antdColumns}
              dataSource={data}
            />
          </div>
        }
      >
        <div>
          <strong>对照说明（决策 9 B8 / M5）：</strong>
          左右并排呈现 data-grid 与 antd row-selection demo（type 切换 + getCheckboxProps 禁用 +
          onChange 回调）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Selection Type</strong>：顶部 Radio.Group 同一个 state 同时驱动两侧
              <code> rowSelection.type</code>（checkbox / radio）；切换时两侧 selectedKeys 同步清空。
            </li>
            <li>
              <strong>getCheckboxProps</strong>：两侧同款判定
              <code> record.name === 'Disabled User'</code>，该行 checkbox/radio 禁用、不参与全选。
            </li>
            <li>
              <strong>onChange</strong>：两侧 onChange 都写回同一 <code>selectedKeys</code> state
              （受控），console.log 各自入参（data-grid 三参含 info，antd 两参）。
            </li>
            <li>
              <strong>★ §9 已知差异</strong>：右栏 antd <strong>"Disabled User" 整行淡灰背景</strong>
              （bg-container-disabled）；左栏 data-grid **仅 checkbox 灰、整行无灰底**（功能正确）。
              登记 §9（M5 disabled 行灰底），<strong>本任务不修</strong>——对照可见差异是双栏价值所在。
            </li>
            <li>
              <strong>type 控件差异</strong>：左栏原生 <code>&lt;input type="radio"&gt;</code> RadioGroup
              （data-grid 引擎不依赖 antd 本体）；右栏 antd <code>&lt;Radio.Group&gt;</code>。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

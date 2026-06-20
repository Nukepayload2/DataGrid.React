/**
 * 复刻 antd `edit-row` demo（S16 验收）：
 *   `G:\Projects\ant-design\components\table\demo\edit-row.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致 —— 行级 editingKey + Edit/Save/Cancel +
 *   InputNumber(age)/Input + 100 行分页 + Form 外层。★ data-grid div 渲染适配：EditableCell 返回
 *   **内容 ReactNode（不包 td）**，引擎渲染在 `.dg-cell-inner`。
 * - **右栏（antd Table）**：忠实复刻 antd edit-row demo —— antd `components.body.cell` 返回 `<td>` +
 *   onCell + Form 外层 + `rowClassName='editable-row'` + CSS（.editable-row .ant-form-item-explain 定位）。
 * - **共享控制条**：无（按 antd demo 原结构——无控制条，operation 列内 Edit/Save/Cancel）。
 *   编辑是局部交互（行级 editingKey + Form），两栏各自编辑便于对照（共用 form/data/editingKey 会
 *   互相干扰——两栏同时只能编辑一行、Form 共享会冲突）。故两侧各自维护 `form`/`data`/`editingKey`
 *   state，初始数据相同（_compare/edit-row.shared.ts）。
 * - **共享数据**：`RecordType` + `originData`（100 行）见 `_compare/edit-row.shared.ts`。
 *
 * === 两侧保留的差异（如实呈现）===
 *
 * 1. **EditableCell 返回值**：左栏 data-grid 返回内容 ReactNode（不包 td）；右栏 antd 返回
 *    `<td {...restProps}>`（原生 td）。
 * 2. **Form 位置**：两侧均 Form 在 Table 外层（`Form component={false}` 不产生 DOM），Form.Item 在
 *    EditableCell 内，通过 React FormContext（不依赖 DOM 层级）访问 Form 实例。
 * 3. **无 components.body.row**：两侧均无（区别 S15 的 EditableRow——S16 整表共享一个 Form，靠
 *    editingKey 区分当前编辑行）。
 * 4. **rowClassName**：左栏 data-grid 支持 rowClassName（透传到该行所有数据单元格 className），
 *    传 `'editable-row'`；右栏 antd 原生 rowClassName，同款。
 * 5. **CSS**：注入 antd demo 配套 CSS（`.editable-row .ant-form-item-explain` 定位）到 document.head
 *    （仅注入一次），两侧共享。
 *
 * === ★ Form context 透传（关键，与 S15 同）===
 *
 * antd Form context 是 React context，**不依赖 DOM 层级**（跨组件树传递）。data-grid 的 div 渲染
 * 层级（dg-row/dg-cell）不改变 React 组件树层级，故 Form（在 Table 外层）的 context 正常透传到
 * EditableCell 内的 Form.Item。S16 已验证 save(validateFields) 成功。
 *
 * === 验证点（S16 + 决策 9）===
 *
 * 1. 两侧 100 行数据分页（默认 10 行/页），bordered 表格。
 * 2. 点击某行 operation 列 `Edit` → 该行 name/age/address 三列进入编辑态（Input/InputNumber），
 *    operation 列变 Save+Cancel；其他行 Edit 禁用。
 * 3. `Save`：校验通过则保存（表格更新）+ 退出编辑；空值校验失败 console.log Validate Failed。
 * 4. `Cancel`（Popconfirm 确认）：退出编辑不保存。
 * 5. 翻页（pagination.onChange）→ 自动 cancel 退出编辑。
 * 6. age 列编辑用 InputNumber（number 类型），name/address 用 Input（text 类型）。
 */

import React, { useEffect, useState } from 'react'
import type { TableProps as AntdTableProps } from 'antd'
import { Form, Input, InputNumber, Popconfirm, Table as AntdTable, Typography } from 'antd'
import { Table } from '../table'
import type { TableProps } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { originData, type RecordType } from './_compare/edit-row.shared'

// ---------------------------------------------------------------------------
// antd demo 配套 CSS（注入 document.head，仅注入一次）
// 对齐 antd edit-row demo 的 .editable-row .ant-form-item-explain 定位（校验错误信息悬浮）。
// 两侧共享。
// ---------------------------------------------------------------------------

let cssInjected = false
function injectEditRowCss() {
  if (cssInjected) return
  cssInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-edit-row-css', '')
  style.textContent = `
.editable-row .ant-form-item-explain {
  position: absolute;
  top: 100%;
  font-size: 12px;
}
`
  document.head.appendChild(style)
}

// ===========================================================================
// 左栏（data-grid）—— 行级编辑（components.body.cell + onCell + Form 外层）
// ===========================================================================

interface DgEditableCellProps {
  editing: boolean
  dataIndex: keyof RecordType
  title: React.ReactNode
  inputType: 'number' | 'text'
  record: RecordType
  index: number
}

/**
 * data-grid 适配：返回**内容 ReactNode（不包 td）**。引擎把本组件渲染在 `.dg-cell-inner` 处。
 * editing 态 Form.Item + inputNode（InputNumber for number / Input for text）；
 * 展示态直接渲染 children。
 *
 * ★ Form.Item 此处无需 useContext 取 Form——外层 `<Form form>` 通过 React FormContext 自动透传
 * （Form context 不依赖 DOM 层级）。
 */
const DgEditableCell: React.FC<React.PropsWithChildren<DgEditableCellProps>> = ({
  editing,
  dataIndex,
  title,
  inputType,
  children,
}) => {
  const inputNode = inputType === 'number' ? <InputNumber /> : <Input />

  // ★ data-grid 适配：返回内容 ReactNode（不包 td）。
  return (
    <>
      {editing ? (
        <Form.Item
          name={dataIndex as string}
          style={{ margin: 0 }}
          rules={[{ required: true, message: `Please Input ${title}!` }]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </>
  )
}

type DgColumnTypes = Exclude<TableProps<RecordType>['columns'], undefined>

function DgEditRowPane() {
  // ★ 编辑各自独立 state（两栏对照时互不干扰——共用 form/data/editingKey 会冲突）。
  const [form] = Form.useForm()
  const [data, setData] = useState<RecordType[]>(originData)
  const [editingKey, setEditingKey] = useState('')

  const isEditing = (record: RecordType) => record.key === editingKey

  const edit = (record: Partial<RecordType> & { key: React.Key }) => {
    form.setFieldsValue({ name: '', age: '', address: '', ...record })
    setEditingKey(record.key as string)
  }

  const cancel = () => {
    setEditingKey('')
  }

  const save = async (key: React.Key) => {
    try {
      const row = (await form.validateFields()) as RecordType
      setData((d) => {
        const newData = [...d]
        const index = newData.findIndex((item) => key === item.key)
        if (index > -1) {
          const item = newData[index]
          newData.splice(index, 1, { ...item, ...row })
        } else {
          newData.push(row)
        }
        return newData
      })
      setEditingKey('')
    } catch (errInfo) {
      console.log('Validate Failed:', errInfo)
    }
  }

  const columns = [
    { title: 'name', dataIndex: 'name', width: '25%', editable: true },
    { title: 'age', dataIndex: 'age', width: '15%', editable: true },
    { title: 'address', dataIndex: 'address', width: '40%', editable: true },
    {
      title: 'operation',
      dataIndex: 'operation',
      render: (_: unknown, record: RecordType) => {
        const editable = isEditing(record)
        return editable ? (
          <span>
            <Typography.Link onClick={() => save(record.key)} style={{ marginInlineEnd: 8 }}>
              Save
            </Typography.Link>
            <Popconfirm title="Sure to cancel?" onConfirm={cancel}>
              <a>Cancel</a>
            </Popconfirm>
          </span>
        ) : (
          <Typography.Link disabled={editingKey !== ''} onClick={() => edit(record)}>
            Edit
          </Typography.Link>
        )
      },
    },
  ]

  const mergedColumns: DgColumnTypes = columns.map((col) => {
    if (!col.editable) {
      return col as DgColumnTypes[number]
    }
    return {
      ...col,
      onCell: (record: RecordType) => ({
        record,
        inputType: col.dataIndex === 'age' ? 'number' : 'text',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    }
  }) as DgColumnTypes

  return (
    // ★ Form 在 Table 外层（component={false} 不产生 DOM）。Form.Item 在 EditableCell 内，
    //   通过 React FormContext（不依赖 DOM 层级）访问此 Form 实例——data-grid 的 div 渲染层级
    //   不影响 context 透传。无 components.body.row（区别 S15 的 EditableRow）。
    <Form form={form} component={false}>
      <Table<RecordType>
        components={{ body: { cell: DgEditableCell } }}
        rowClassName="editable-row"
        bordered
        dataSource={data}
        columns={mergedColumns}
        pagination={{ onChange: cancel }}
      />
    </Form>
  )
}

// ===========================================================================
// 右栏（antd）—— 忠实复刻 antd edit-row demo（components.body.cell + onCell + Form 外层）
// ===========================================================================

interface AntdEditableCellProps {
  editing: boolean
  dataIndex: string
  title: React.ReactNode
  inputType: 'number' | 'text'
  record: RecordType
  index: number
}

/** antd 原生：返回 <td {...restProps}>...</td>。 */
const AntdEditableCell: React.FC<
  React.PropsWithChildren<AntdEditableCellProps> & React.HTMLAttributes<HTMLElement>
> = ({ editing, dataIndex, title, inputType, children, ...restProps }) => {
  const inputNode = inputType === 'number' ? <InputNumber /> : <Input />

  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[{ required: true, message: `Please Input ${title}!` }]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  )
}

type AntdColumnTypes = Exclude<AntdTableProps<RecordType>['columns'], undefined>

function AntdEditRowPane() {
  // ★ 编辑各自独立 state（两栏对照时互不干扰）。
  const [form] = Form.useForm()
  const [data, setData] = useState<RecordType[]>(originData)
  const [editingKey, setEditingKey] = useState('')

  const isEditing = (record: RecordType) => record.key === editingKey

  const edit = (record: Partial<RecordType> & { key: React.Key }) => {
    form.setFieldsValue({ name: '', age: '', address: '', ...record })
    setEditingKey(record.key)
  }

  const cancel = () => {
    setEditingKey('')
  }

  const save = async (key: React.Key) => {
    try {
      const row = (await form.validateFields()) as RecordType
      setData((d) => {
        const newData = [...d]
        const index = newData.findIndex((item) => key === item.key)
        if (index > -1) {
          const item = newData[index]
          newData.splice(index, 1, { ...item, ...row })
        } else {
          newData.push(row)
        }
        return newData
      })
      setEditingKey('')
    } catch (errInfo) {
      console.log('Validate Failed:', errInfo)
    }
  }

  const columns = [
    { title: 'name', dataIndex: 'name', width: '25%', editable: true },
    { title: 'age', dataIndex: 'age', width: '15%', editable: true },
    { title: 'address', dataIndex: 'address', width: '40%', editable: true },
    {
      title: 'operation',
      dataIndex: 'operation',
      render: (_: unknown, record: RecordType) => {
        const editable = isEditing(record)
        return editable ? (
          <span>
            <Typography.Link onClick={() => save(record.key)} style={{ marginInlineEnd: 8 }}>
              Save
            </Typography.Link>
            <Popconfirm title="Sure to cancel?" onConfirm={cancel}>
              <a>Cancel</a>
            </Popconfirm>
          </span>
        ) : (
          <Typography.Link disabled={editingKey !== ''} onClick={() => edit(record)}>
            Edit
          </Typography.Link>
        )
      },
    },
  ]

  const mergedColumns: AntdColumnTypes = columns.map((col) => {
    if (!col.editable) {
      return col as AntdColumnTypes[number]
    }
    return {
      ...col,
      onCell: (record: RecordType) => ({
        record,
        inputType: col.dataIndex === 'age' ? 'number' : 'text',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    }
  }) as AntdColumnTypes

  return (
    <Form form={form} component={false}>
      <AntdTable<RecordType>
        components={{ body: { cell: AntdEditableCell } }}
        bordered
        dataSource={data}
        columns={mergedColumns}
        rowClassName="editable-row"
        pagination={{ onChange: cancel }}
      />
    </Form>
  )
}

// ===========================================================================
// Demo 根组件
// ===========================================================================

export default function EditRowDemo() {
  // 注入 antd demo 配套 CSS（仅注入一次）。
  useEffect(() => {
    injectEditRowCss()
  }, [])

  return (
    <div style={{ padding: 24 }}>
      {/*
        minPaneWidth=480（窄表，4 列无 scroll.x + 分页）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo minPaneWidth={480} left={<DgEditRowPane />} right={<AntdEditRowPane />}>
        <div>
          <strong>对照说明（决策 9 B17 / S16）：</strong>
          左右并排呈现 data-grid 与 antd edit-row（行级 editingKey + Edit/Save/Cancel +
          InputNumber(age)/Input + 100 行分页 + Form 外层）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Edit/Save/Cancel</strong>：operation 列内（按 antd demo 原结构）。点击 Edit →
              整行进入编辑（age 用 <strong>InputNumber</strong>，name/address 用 <strong>Input</strong>），
              同时其他行 Edit 禁用。<strong>Save</strong> 保存，<strong>Cancel</strong>（Popconfirm）放弃；
              翻页自动取消编辑。
            </li>
            <li>
              <strong>编辑各自独立</strong>：两侧各自维护 <code>form</code>/<code>data</code>/
              <code>editingKey</code> state（共用会冲突——两栏同时只能编辑一行、Form 共享串台）。
              初始数据相同（<code>_compare/edit-row.shared.ts</code>，100 行）。
            </li>
            <li>
              <strong>★ data-grid 适配</strong>：左栏 EditableCell 返回
              <strong> 内容 ReactNode（不包 td）</strong>；右栏 antd 原生 <code>&lt;td&gt;</code>。
              两侧均 <strong>Form 在 Table 外层</strong>（<code>component=&#123;false&#125;</code> 不产生 DOM），
              <strong>无 components.body.row</strong>（区别 S15）。
            </li>
            <li>
              <strong>Form context 透传</strong>：React FormContext 不依赖 DOM 层级，data-grid div 渲染
              不影响 Form context（在 Table 外层）透传到 EditableCell 内的 Form.Item（S16 已验证
              save(validateFields) 成功）。
            </li>
            <li>
              <strong>rowClassName + CSS</strong>：两侧 <code>rowClassName="editable-row"</code> + 同款
              <code> .editable-row .ant-form-item-explain</code> 校验错误定位 CSS（注入 document.head）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

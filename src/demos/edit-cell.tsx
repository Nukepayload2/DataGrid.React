/**
 * 复刻 antd `edit-cell` demo（S15 验收）：
 *   `G:\Projects\ant-design\components\table\demo\edit-cell.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致 —— `components.body.cell/row` + `onCell` 编辑。
 *   ★ data-grid div 渲染适配：EditableCell 返回**内容 ReactNode（不包 td）**；EditableRow 用
 *   `Form component={false}` + Context.Provider（不产生 DOM），行内单元格穿透为 grid 直接子元素，
 *   引擎在 components.body.row 提供时强制走 multi 显式定位路径。
 * - **右栏（antd Table）**：忠实复刻 antd edit-cell demo —— antd `components.body.cell/row` +
 *   onCell（EditableRow 返回 `<tr>`、EditableCell 返回 `<td>`）+ `rowClassName='editable-row'` +
 *   CSS（.editable-cell-value-wrap hover 边框）。
 * - **共享控制条**：无（按 antd demo 原结构——Add a row 按钮在 Table 上方，各 pane 内各自维护）。
 *   编辑是局部交互（点击单元格→Form.Input→save），两栏各自编辑便于对照（共用 dataSource 会
 *   互相干扰——一个单元格进入编辑态另一侧跟着进编辑态无意义）。故两侧各自维护
 *   `dataSource`/`count` state，初始数据相同（_compare/edit-cell.shared.ts）。
 * - **共享数据**：`RecordType` + `defaultData`/`defaultCount`/`makeNewRow` 见 `_compare/edit-cell.shared.ts`。
 *
 * === 两侧保留的差异（如实呈现）===
 *
 * 1. **EditableCell 返回值**：左栏 data-grid 返回内容 ReactNode（不包 td，引擎渲染在
 *    `.dg-cell-inner`）；右栏 antd 返回 `<td {...restProps}>`（原生 td）。
 * 2. **EditableRow 返回值**：左栏 `Form component={false}`+Provider（不产生 DOM，单元格穿透为
 *    grid 直接子元素）；右栏 `Form component={false}`+Provider+`<tr {...props} />`（原生 tr）。
 * 3. **rowClassName**：左栏 data-grid 支持 rowClassName（透传到该行所有数据单元格 className），
 *    传 `() => 'editable-row'`；右栏 antd 原生 rowClassName，同款。
 * 4. **CSS**：注入 antd demo 配套 CSS（`.editable-cell-value-wrap` hover 边框）到 document.head
 *    （仅注入一次），两侧共享（data-grid 单元格 hover 同样触发边框）。
 *
 * === ★ Form context 透传（关键）===
 *
 * antd Form context 是 React context，**不依赖 DOM 层级**（跨组件树传递）。data-grid 的 div
 * 渲染层级（dg-row/dg-cell）不改变 React 组件树层级，故 Form context 正常透传到 EditableCell
 * 内的 Form.Item。S15 已验证 save(validateFields) 成功。
 *
 * === 验证点（S15 + 决策 9）===
 *
 * 1. 两侧 name 列单元格点击 → 进入编辑态（Input 自动聚焦、预填当前值）。
 * 2. 回车/失焦 → 校验通过则保存（表格更新）+ 退出编辑；空值校验失败 console.log + 保持编辑。
 * 3. 各 pane 内 `Add a row` 按钮 → 追加新行（各自 count 递增）。
 * 4. Delete 链接 → Popconfirm 确认后删除该行（两侧各自，>=1 行显示 Delete）。
 * 5. hover name 单元格 → `.editable-cell-value-wrap` 显示边框（两侧同款 CSS）。
 */

import React, { useContext, useEffect, useRef, useState } from 'react'
import type { GetRef, InputRef, TableProps as AntdTableProps } from 'antd'
import { Button, Form, Input, Popconfirm, Table as AntdTable } from 'antd'
import { Table } from '../table'
import type { TableProps } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { defaultCount, defaultData, makeNewRow, type RecordType } from './_compare/edit-cell.shared'

// ---------------------------------------------------------------------------
// antd demo 配套 CSS（注入 document.head，仅注入一次）
// 对齐 antd edit-cell demo 的 .editable-cell-value-wrap / .editable-row hover 边框样式。
// 两侧共享：data-grid 单元格 hover 同样触发边框（editable-row class 透传到该行所有单元格）。
// ---------------------------------------------------------------------------

type FormInstance<T> = GetRef<typeof Form<T>>

let cssInjected = false
function injectEditCellCss() {
  if (cssInjected) return
  cssInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-edit-cell-css', '')
  style.textContent = `
.editable-cell {
  position: relative;
}
.editable-cell-value-wrap {
  padding: 5px 12px;
  cursor: pointer;
}
.editable-row:hover .editable-cell-value-wrap {
  padding: 4px 11px;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
}
`
  document.head.appendChild(style)
}

// ===========================================================================
// 左栏（data-grid）—— 行为与改造前一致（components.body.cell/row + onCell 编辑）
// ===========================================================================

const DgEditableContext = React.createContext<FormInstance<any> | null>(null)

/** data-grid 适配：Form component={false} + Provider 不产生 DOM，单元格穿透为 grid 直接子元素。 */
const DgEditableRow: React.FC<Record<string, any>> = ({ ...props }) => {
  const [form] = Form.useForm()
  return (
    <Form form={form} component={false}>
      <DgEditableContext.Provider value={form}>
        {/* children = 该行所有 BodyCell（grid 直接子元素，由引擎定位）。 */}
        {props.children}
      </DgEditableContext.Provider>
    </Form>
  )
}

interface DgEditableCellProps {
  title: React.ReactNode
  editable?: boolean
  dataIndex: keyof RecordType
  record: RecordType
  handleSave: (record: RecordType) => void
}

/**
 * data-grid 适配：返回**内容 ReactNode（不包 td）**。引擎把本组件渲染在 `.dg-cell-inner` 处。
 * editing 态 Form.Item+Input；展示态 div.editable-cell-value-wrap（onClick 进入编辑）。
 */
const DgEditableCell: React.FC<React.PropsWithChildren<DgEditableCellProps>> = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
}) => {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<InputRef>(null)
  const form = useContext(DgEditableContext)!

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
    }
  }, [editing])

  const toggleEdit = () => {
    setEditing(!editing)
    form.setFieldsValue({ [dataIndex]: record[dataIndex] })
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      toggleEdit()
      handleSave({ ...record, ...values })
    } catch (errInfo) {
      console.log('Save failed:', errInfo)
    }
  }

  let childNode = children

  if (editable) {
    childNode = editing ? (
      <Form.Item
        style={{ margin: 0 }}
        name={dataIndex}
        rules={[{ required: true, message: `${title} is required.` }]}
      >
        <Input ref={inputRef} onPressEnter={save} onBlur={save} />
      </Form.Item>
    ) : (
      <div
        className="editable-cell-value-wrap"
        style={{ paddingInlineEnd: 24 }}
        onClick={toggleEdit}
      >
        {children}
      </div>
    )
  }

  // ★ data-grid 适配：返回内容 ReactNode（不包 td）。
  return <>{childNode}</>
}

type DgColumnTypes = Exclude<TableProps<RecordType>['columns'], undefined>

function DgEditCellPane() {
  // ★ 编辑各自独立 state（两栏对照时互不干扰）。
  const [dataSource, setDataSource] = useState<RecordType[]>(defaultData)
  const [count, setCount] = useState(defaultCount)

  const handleDelete = (key: React.Key) => {
    setDataSource((ds) => ds.filter((item) => item.key !== key))
  }

  const handleAdd = () => {
    setDataSource((ds) => [...ds, makeNewRow(count)])
    setCount((c) => c + 1)
  }

  const handleSave = (row: RecordType) => {
    setDataSource((ds) => {
      const newData = [...ds]
      const index = newData.findIndex((item) => row.key === item.key)
      const item = newData[index]
      newData.splice(index, 1, { ...item, ...row })
      return newData
    })
  }

  const defaultColumns: (DgColumnTypes[number] & {
    editable?: boolean
    dataIndex: string
  })[] = [
    { title: 'name', dataIndex: 'name', width: '30%', editable: true },
    { title: 'age', dataIndex: 'age' },
    { title: 'address', dataIndex: 'address' },
    {
      title: 'operation',
      dataIndex: 'operation',
      render: (_, record) =>
        dataSource.length >= 1 ? (
          <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.key)}>
            <a>Delete</a>
          </Popconfirm>
        ) : null,
    },
  ]

  const components = {
    body: {
      row: DgEditableRow,
      cell: DgEditableCell,
    },
  }

  const columns = defaultColumns.map((col) => {
    if (!col.editable) {
      return col
    }
    return {
      ...col,
      onCell: (record: RecordType) => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: (col as { title?: React.ReactNode }).title,
        handleSave,
      }),
    }
  })

  return (
    <div>
      {/* Add a row 按钮在 Table 上方（按 antd demo 原结构，pane 内各自维护 state）。 */}
      <Button onClick={handleAdd} type="primary" style={{ marginBottom: 16 }}>
        Add a row
      </Button>
      <Table<RecordType>
        components={components}
        rowClassName={() => 'editable-row'}
        bordered
        dataSource={dataSource}
        columns={columns as DgColumnTypes}
        // 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination，data-grid 不传=无分页条）。
        pagination={{}}
      />
    </div>
  )
}

// ===========================================================================
// 右栏（antd）—— 忠实复刻 antd edit-cell demo（components.body.cell/row + onCell）
// ===========================================================================

const AntdEditableContext = React.createContext<FormInstance<any> | null>(null)

/** antd 原生：Form component={false} + Provider + <tr {...props} />。 */
const AntdEditableRow: React.FC<Record<string, any>> = ({ ...props }) => {
  const [form] = Form.useForm()
  return (
    <Form form={form} component={false}>
      <AntdEditableContext.Provider value={form}>
        <tr {...props} />
      </AntdEditableContext.Provider>
    </Form>
  )
}

interface AntdEditableCellProps {
  title: React.ReactNode
  editable?: boolean
  dataIndex: keyof RecordType
  record: RecordType
  handleSave: (record: RecordType) => void
}

/** antd 原生：返回 <td {...restProps}>{childNode}</td>。 */
const AntdEditableCell: React.FC<
  React.PropsWithChildren<AntdEditableCellProps> & React.HTMLAttributes<HTMLElement>
> = ({ title, editable, children, dataIndex, record, handleSave, ...restProps }) => {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<InputRef>(null)
  const form = useContext(AntdEditableContext)!

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
    }
  }, [editing])

  const toggleEdit = () => {
    setEditing(!editing)
    form.setFieldsValue({ [dataIndex]: record[dataIndex] })
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      toggleEdit()
      handleSave({ ...record, ...values })
    } catch (errInfo) {
      console.log('Save failed:', errInfo)
    }
  }

  let childNode = children

  if (editable) {
    childNode = editing ? (
      <Form.Item
        style={{ margin: 0 }}
        name={dataIndex}
        rules={[{ required: true, message: `${title} is required.` }]}
      >
        <Input ref={inputRef} onPressEnter={save} onBlur={save} />
      </Form.Item>
    ) : (
      <div
        className="editable-cell-value-wrap"
        style={{ paddingInlineEnd: 24 }}
        onClick={toggleEdit}
      >
        {children}
      </div>
    )
  }

  return <td {...restProps}>{childNode}</td>
}

type AntdColumnTypes = Exclude<AntdTableProps<RecordType>['columns'], undefined>

function AntdEditCellPane() {
  // ★ 编辑各自独立 state（两栏对照时互不干扰）。
  const [dataSource, setDataSource] = useState<RecordType[]>(defaultData)
  const [count, setCount] = useState(defaultCount)

  const handleDelete = (key: React.Key) => {
    setDataSource((ds) => ds.filter((item) => item.key !== key))
  }

  const handleAdd = () => {
    setDataSource((ds) => [...ds, makeNewRow(count)])
    setCount((c) => c + 1)
  }

  const handleSave = (row: RecordType) => {
    setDataSource((ds) => {
      const newData = [...ds]
      const index = newData.findIndex((item) => row.key === item.key)
      const item = newData[index]
      newData.splice(index, 1, { ...item, ...row })
      return newData
    })
  }

  const defaultColumns: (AntdColumnTypes[number] & {
    editable?: boolean
    dataIndex: string
  })[] = [
    { title: 'name', dataIndex: 'name', width: '30%', editable: true },
    { title: 'age', dataIndex: 'age' },
    { title: 'address', dataIndex: 'address' },
    {
      title: 'operation',
      dataIndex: 'operation',
      render: (_, record) =>
        dataSource.length >= 1 ? (
          <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.key)}>
            <a>Delete</a>
          </Popconfirm>
        ) : null,
    },
  ]

  const components = {
    body: {
      row: AntdEditableRow,
      cell: AntdEditableCell,
    },
  }

  const columns = defaultColumns.map((col) => {
    if (!col.editable) {
      return col
    }
    return {
      ...col,
      onCell: (record: RecordType) => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: (col as { title?: React.ReactNode }).title,
        handleSave,
      }),
    }
  })

  return (
    <div>
      <Button onClick={handleAdd} type="primary" style={{ marginBottom: 16 }}>
        Add a row
      </Button>
      <AntdTable<RecordType>
        components={components}
        rowClassName={() => 'editable-row'}
        bordered
        dataSource={dataSource}
        columns={columns as AntdColumnTypes}
      />
    </div>
  )
}

// ===========================================================================
// Demo 根组件
// ===========================================================================

export default function EditCellDemo() {
  // 注入 antd demo 配套 CSS（仅注入一次）。
  useEffect(() => {
    injectEditCellCss()
  }, [])

  return (
    <div style={{ padding: 24 }}>
      {/*
        minPaneWidth=480（窄表，4 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<DgEditCellPane />}
        right={<AntdEditCellPane />}
      >
        <div>
          <strong>对照说明（决策 9 B17 / S15）：</strong>
          左右并排呈现 data-grid 与 antd edit-cell（components.body.cell/row + onCell 编辑 + 增删行）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Add a row</strong>：各 pane 内按钮独立追加新行（按 antd demo 原结构——Add 在
              Table 上方，各 pane 各自维护 <code>dataSource</code>/<code>count</code> state）。
              两栏初始数据相同（<code>_compare/edit-cell.shared.ts</code>）。
            </li>
            <li>
              <strong>编辑各自独立</strong>：点击 name 单元格进入编辑（回车/失焦保存）。编辑是局部
              交互，两栏各自编辑便于对照（共用 dataSource 会互相干扰——一个单元格进入编辑态另一侧
              跟着进编辑态无意义）。
            </li>
            <li>
              <strong>Delete</strong>：Popconfirm 确认后删除该行（两侧各自，{' '}
              <code>dataSource.length &gt;= 1</code> 显示）。
            </li>
            <li>
              <strong>★ data-grid 适配</strong>：左栏 EditableCell 返回
              <strong> 内容 ReactNode（不包 td）</strong>；EditableRow 用
              <code> Form component=&#123;false&#125;</code> + Provider（不产生 DOM），单元格穿透为
              grid 直接子元素。右栏 antd 原生 <code>&lt;td&gt;</code>/<code>&lt;tr&gt;</code>。
            </li>
            <li>
              <strong>Form context 透传</strong>：React context 不依赖 DOM 层级，data-grid div 渲染
              不影响 Form context 透传到 EditableCell 内的 Form.Item（S15 已验证 save(validateFields) 成功）。
            </li>
            <li>
              <strong>rowClassName + CSS</strong>：两侧均传 <code>rowClassName</code> 返回
              <code>{'editable-row'}</code> + 同款 <code>.editable-cell-value-wrap</code> hover 边框 CSS
              （注入 document.head）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

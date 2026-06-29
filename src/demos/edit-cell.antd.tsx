/**
 * edit-cell demo 的 antd 段（右栏），从 edit-cell.tsx 拆出。
 *
 * === 增删行 + 编辑 state 自管（子组件内）===
 * 与 edit-cell.dg.tsx 同构：编辑/增删行 state 全在子组件内自管（dataSource + count +
 * handleAdd/handleDelete/handleSave），两栏各自独立（原始 demo 决策「编辑各自独立」）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 *
 * === 忠实复刻 antd edit-cell demo ===
 * antd 原生 `components.body.cell/row` + onCell（EditableRow 返回 `<tr>`、EditableCell 返回
 * `<td>`）+ `rowClassName='editable-row'` + CSS（.editable-cell-value-wrap hover 边框）。
 *
 * === ★ CSS 注入幂等保留（两子组件共用同一 CSS）===
 * `injectEditCellCss` 把 antd demo 配套 CSS 注入 document.head。本子文件 + edit-cell.dg.tsx 各自
 * 调用一次（useEffect），两子组件共用同一 CSS。幂等：模块级 `cssInjected` 标志 + DOM
 * `[data-edit-cell-css]` 存在性双重检查。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'react'` / `'antd'` / `'./_compare/edit-cell.shared'`）。
 */
import React, { useContext, useEffect, useRef, useState } from 'react'
import type { GetRef, InputRef, TableProps as AntdTableProps } from 'antd'
import { Button, Form, Input, Popconfirm, Table as AntdTable } from 'antd'
import {
  defaultCount,
  defaultData,
  makeNewRow,
  type RecordType,
} from './_compare/edit-cell.shared'

// ---------------------------------------------------------------------------
// antd demo 配套 CSS（注入 document.head，仅注入一次；两子组件共用同一 CSS）。
// 幂等：模块级 cssInjected 标志 + DOM [data-edit-cell-css] 存在性双重检查。
// ---------------------------------------------------------------------------

type FormInstance<T> = GetRef<typeof Form<T>>

let cssInjected = false
function injectEditCellCss() {
  if (cssInjected) return
  // 幂等检查：Vite HMR 跨模块实例重置 cssInjected 时，避免重复注入 <style>（DOM 已存在则跳过）。
  if (document.head.querySelector('[data-edit-cell-css]')) {
    cssInjected = true
    return
  }
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
  border: 1px solid var(--ant-color-border);
  border-radius: 2px;
}
`
  document.head.appendChild(style)
}

// ---------------------------------------------------------------------------
// antd 原生：EditableRow（Form component={false} + Provider + <tr>）+ EditableCell（<td>）
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 子组件（自管编辑/增删行 state）
// ---------------------------------------------------------------------------

export default function EditCellAntd({
  virtual = false,
}: {
  virtual: boolean
}) {
  // ★ 编辑/增删行 state 各自独立（两栏对照时互不干扰，按原始 demo 决策「编辑各自独立」）。
  const [dataSource, setDataSource] = useState<RecordType[]>(defaultData)
  const [count, setCount] = useState(defaultCount)

  // 注入 antd demo 配套 CSS（仅注入一次；两子组件共用同一 CSS，幂等）。
  useEffect(() => {
    injectEditCellCss()
  }, [])

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
        // 虚拟化（决策 7）：ON→virtual+scroll.y=300（有分页，antd scroll.y 须数字）；OFF→不传，非虚拟（零回归）。
        virtual={virtual}
        scroll={virtual ? { y: 300 } : undefined}
      />
    </div>
  )
}

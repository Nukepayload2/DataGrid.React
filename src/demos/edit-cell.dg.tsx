import React, { useContext, useEffect, useRef, useState } from 'react'
import type { GetRef, InputRef } from 'antd'
import { Button, Form, Input, Popconfirm } from 'antd'
import { Table } from '../table'
import type { TableProps } from '../table'
import {
  defaultCount,
  defaultData,
  makeNewRow,
  type RecordType,
} from './_compare/edit-cell.shared'

// antd demo 配套 CSS（.editable-cell-value-wrap hover 边框），注入 document.head。
// 两子组件共用同一 CSS，幂等：模块级 cssInjected 标志 + DOM [data-edit-cell-css] 双重检查
// （Vite HMR 重置模块标志时 DOM 检查兜底）。

type FormInstance<T> = GetRef<typeof Form<T>>

let cssInjected = false
function injectEditCellCss() {
  if (cssInjected) return
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

// data-grid 适配：EditableRow（Form component={false} + Provider，不产生 DOM）
// + EditableCell（返回内容 ReactNode，不包 td）

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

  // data-grid cell editors render inside `.dg-cell-inner`, so this component returns content only.
  return <>{childNode}</>
}

type DgColumnTypes = Exclude<TableProps<RecordType>['columns'], undefined>

// 子组件（自管编辑/增删行 state）

export default function EditCellDg({
  virtual = false,
}: {
  virtual: boolean
}) {
  // 编辑/增删行 state 各自独立（两栏对照时互不干扰）。
  const [dataSource, setDataSource] = useState<RecordType[]>(defaultData)
  const [count, setCount] = useState(defaultCount)

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
      <Button onClick={handleAdd} type="primary" style={{ marginBottom: 16 }}>
        Add a row
      </Button>
      <Table<RecordType>
        components={components}
        rowClassName={() => 'editable-row'}
        bordered
        dataSource={dataSource}
        columns={columns as DgColumnTypes}
        // data-grid 不传 pagination=无分页条；显式传 {} 对齐 antd 默认分页。
        pagination={{}}
        // ON→virtual+scroll.y=true（CSS 自适应高度，SplitDemo 限高 pane body 提供可滚动区域）。
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
    </div>
  )
}


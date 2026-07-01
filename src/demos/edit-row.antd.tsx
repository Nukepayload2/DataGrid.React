import React, { useEffect, useState } from 'react'
import type { TableProps as AntdTableProps } from 'antd'
import { Form, Input, InputNumber, Popconfirm, Table as AntdTable, Typography } from 'antd'
import { originData, type RecordType } from './_compare/edit-row.shared'

// antd demo 配套 CSS（.editable-row .ant-form-item-explain 校验错误定位）。
// 注入 document.head，两子组件共用同一 CSS；幂等（模块级标志 + DOM 存在性双重检查）。

let cssInjected = false
function injectEditRowCss() {
  if (cssInjected) return
  // 幂等检查：Vite HMR 跨模块实例重置 cssInjected 时，避免重复注入 <style>（DOM 已存在则跳过）。
  if (document.head.querySelector('[data-edit-row-css]')) {
    cssInjected = true
    return
  }
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

// antd 原生：EditableCell（返回 <td>）

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

// 子组件（自管行级编辑 state）

export default function EditRowAntd({
  virtual = false,
}: {
  virtual: boolean
}) {
  // 行级编辑 state 各自独立（两栏对照时互不干扰）。
  const [form] = Form.useForm()
  const [data, setData] = useState<RecordType[]>(originData)
  const [editingKey, setEditingKey] = useState('')

  // 注入 antd demo 配套 CSS（仅注入一次；两子组件共用同一 CSS，幂等）。
  useEffect(() => {
    injectEditRowCss()
  }, [])

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
        // 虚拟化开关：ON→virtual+scroll.y=300（有分页，antd scroll.y 须数字）；OFF→不传，非虚拟。
        virtual={virtual}
        scroll={virtual ? { y: 300 } : undefined}
      />
    </Form>
  )
}


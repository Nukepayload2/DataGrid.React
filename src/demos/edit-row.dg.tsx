import React, { useEffect, useState } from 'react'
import { Form, Input, InputNumber, Popconfirm, Typography } from 'antd'
import { Table } from '../table'
import type { TableProps } from '../table'
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

// data-grid 适配：EditableCell（返回内容 ReactNode，不包 td）

interface DgEditableCellProps {
  editing: boolean
  dataIndex: keyof RecordType
  title: React.ReactNode
  inputType: 'number' | 'text'
  record: RecordType
  index: number
}

const DgEditableCell: React.FC<React.PropsWithChildren<DgEditableCellProps>> = ({
  editing,
  dataIndex,
  title,
  inputType,
  children,
}) => {
  const inputNode = inputType === 'number' ? <InputNumber /> : <Input />

  // data-grid cells render the editor inside `.dg-cell-inner`, so this component returns content only.
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

// 子组件（自管行级编辑 state）

export default function EditRowDg({
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
    // Form 在 Table 外层（component={false} 不产生 DOM）。Form context 不依赖 DOM 层级，
    // data-grid 的 div 渲染层级不影响 context 透传到 EditableCell 内的 Form.Item。
    <Form form={form} component={false}>
      <Table<RecordType>
        components={{ body: { cell: DgEditableCell } }}
        rowClassName="editable-row"
        bordered
        dataSource={data}
        columns={mergedColumns}
        pagination={{ onChange: cancel }}
        // 虚拟化开关：ON→virtual+scroll.y=true（CSS 自适应高度）；OFF→不传，非虚拟全量 DOM。
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
    </Form>
  )
}


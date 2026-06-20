/**
 * 复刻 antd `edit-cell` demo（S15 验收）：
 *   `G:\Projects\ant-design\components\table\demo\edit-cell.tsx`
 *
 * === antd demo 要素 ===
 *
 * - `components.body.row = EditableRow`：自定义行组件，内部 `Form.useForm()` 创建 Form 实例 +
 *   `EditableContext.Provider` 透传给该行的 cell。
 * - `components.body.cell = EditableCell`：自定义单元格组件。
 *     * editing 态：`Form.Item + Input`（Input.onPressEnter / onBlur → save）。
 *     * 展示态：`div.editable-cell-value-wrap`（onClick → toggleEdit 进入编辑）。
 *     * `useContext(EditableContext)` 拿当前行 Form；`form.setFieldsValue` / `form.validateFields`。
 * - `column.onCell(record)` 返回 `{ record, editable, dataIndex, title, handleSave }`：
 *   透传给 EditableCell 作为 props（与 antd v6 additionalProps 语义一致）。
 * - `column.editable`：标记该列可编辑（onCell 据此返回 editable）。
 * - 增删行：Add button（追加新行）+ Delete Popconfirm（删行）。
 *
 * === ★ data-grid div 渲染适配（关键，与 antd `<td>` 实现不同）===
 *
 * data-grid 用 div 渲染单元格（`.dg-cell`，非 antd 的 `<td>`），且行不由单一 `<tr>` 元素包裹
 * （单元格是 CSS Grid 的直接子元素）。故 antd demo 的 EditableCell 返回 `<td>`、EditableRow
 * 返回 `<tr>` 的写法在 data-grid 下需适配：
 *
 * - **EditableCell**：返回**内容 ReactNode（不包 td）**。data-grid 引擎会把 EditableCell 渲染在
 *   `.dg-cell-inner` 处（dg-cell div 内），dg-cell div 本身（grid 定位 / sticky / hover / align）
 *   由引擎维持。其余逻辑（editing 态 / Form.Item / Input / save / toggleEdit）与 antd demo 照搬。
 *
 * - **EditableRow**：返回 `<Form component={false}><EditableContext.Provider>{children}
 *   </EditableContext.Provider></Form>`。`Form component={false}` 不产生 DOM，Context.Provider
 *   也不产生 DOM——故该行的 BodyCell（children）穿透为 grid 直接子元素，grid 显式定位保证布局正确。
 *   data-grid 引擎在 `components.body.row` 提供时强制走 multi 路径（显式 grid 定位），正是为此。
 *
 * - **onCell 透传**：data-grid 把 `onCell(record, index)` 返回值的**全部字段**（除 colSpan/rowSpan
 *   由 M3 合并消费）透传给 EditableCell props（与 antd additionalProps 一致）。故 EditableCell
 *   能收到 `{ record, editable, dataIndex, title, handleSave }`（来自 onCell）+ `{ children, index }`
 *   （引擎注入）。
 *
 * === shouldCellUpdate（API 支持）===
 *
 * antd demo 未使用 shouldCellUpdate；data-grid 已实现该 API（透传给 cell 组件，cell 组件可自行
 * React.memo 优化）。本 demo 注释说明用法（不强制启用，保持与 antd demo 一致）。
 *
 * === 验证点（S15）===
 *
 * 1. name 列单元格为可编辑（hover 提示）；age/address 列普通展示。
 * 2. 点击 name 单元格 → 进入编辑态（Input 自动聚焦，预填当前值）。
 * 3. 回车或失焦 → 校验通过则保存（表格更新）+ 退出编辑；校验失败（空值）控制台打印 + 保持编辑。
 * 4. Add a row 按钮 → 追加新行（key 递增）；新行 name 同样可编辑。
 * 5. Delete 链接 → Popconfirm 确认后删除该行（至少保留 0 行；antd demo 逻辑：>=1 行时显示 Delete）。
 * 6. 回归：无 components 的 demo（basic/head/colspan-rowspan 等）渲染不变。
 */

import React, { useContext, useEffect, useRef, useState } from 'react'
import type { GetRef, InputRef } from 'antd'
import { Button, Form, Input, Popconfirm } from 'antd'
import { Table } from '../table'
import type { TableProps } from '../table'

type FormInstance<T> = GetRef<typeof Form<T>>

const EditableContext = React.createContext<FormInstance<any> | null>(null)

interface Item {
  key: string
  name: string
  age: string
  address: string
}

interface EditableRowProps {
  index: number
}

/**
 * 自定义行组件（对齐 antd demo EditableRow）。
 *
 * ★ data-grid 适配：返回 `<Form component={false}><EditableContext.Provider>{children}
 *   </EditableContext.Provider></Form>`。Form with `component={false}` 不渲染 form DOM，
 * Context.Provider 也不产生 DOM → 该行 children（各 BodyCell）穿透为 grid 直接子元素，
 * grid 显式定位保证布局正确（引擎在 body.row 提供时强制走 multi 显式定位路径）。
 */
const EditableRow: React.FC<EditableRowProps> = ({ ...props }) => {
  const [form] = Form.useForm()
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        {/* children = 该行所有 BodyCell（grid 直接子元素，由引擎定位）。 */}
        {(props as any).children}
      </EditableContext.Provider>
    </Form>
  )
}

interface EditableCellProps {
  title: React.ReactNode
  editable: boolean
  dataIndex: keyof Item
  record: Item
  handleSave: (record: Item) => void
}

/**
 * 自定义单元格组件（对齐 antd demo EditableCell）。
 *
 * ★ data-grid 适配：返回**内容 ReactNode（不包 td）**。引擎把本组件渲染在 `.dg-cell-inner` 处
 * （dg-cell div 内），dg-cell div（grid 定位 / hover / align）由引擎维持。
 * 其余逻辑（editing 态 / Form.Item / Input / save / toggleEdit）与 antd demo 照搬。
 *
 * props 来源：children/index 由引擎注入；record/editable/dataIndex/title/handleSave 来自
 * column.onCell 返回值（引擎透传 onCell 的全部字段，与 antd additionalProps 一致）。
 */
const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
  // restProps（antd demo 用于透传给 td）在 data-grid 下无需消费（dg-cell div 由引擎管理），
  // 故不取——保持与 data-grid div 渲染适配一致。
}) => {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<InputRef>(null)
  const form = useContext(EditableContext)!

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

interface DataType {
  key: React.Key
  name: string
  age: string
  address: string
}

type ColumnTypes = Exclude<TableProps<DataType>['columns'], undefined>

export default function EditCellDemo() {
  const [dataSource, setDataSource] = useState<DataType[]>([
    {
      key: '0',
      name: 'Edward King 0',
      age: '32',
      address: 'London, Park Lane no. 0',
    },
    {
      key: '1',
      name: 'Edward King 1',
      age: '32',
      address: 'London, Park Lane no. 1',
    },
  ])

  const [count, setCount] = useState(2)

  const handleDelete = (key: React.Key) => {
    const newData = dataSource.filter((item) => item.key !== key)
    setDataSource(newData)
  }

  const defaultColumns: (ColumnTypes[number] & { editable?: boolean; dataIndex: string })[] = [
    {
      title: 'name',
      dataIndex: 'name',
      width: '30%',
      editable: true,
    },
    {
      title: 'age',
      dataIndex: 'age',
    },
    {
      title: 'address',
      dataIndex: 'address',
    },
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

  const handleAdd = () => {
    const newData: DataType = {
      key: count,
      name: `Edward King ${count}`,
      age: '32',
      address: `London, Park Lane no. ${count}`,
    }
    setDataSource([...dataSource, newData])
    setCount(count + 1)
  }

  const handleSave = (row: DataType) => {
    const newData = [...dataSource]
    const index = newData.findIndex((item) => row.key === item.key)
    const item = newData[index]
    newData.splice(index, 1, {
      ...item,
      ...row,
    })
    setDataSource(newData)
  }

  const components = {
    body: {
      row: EditableRow,
      cell: EditableCell,
    },
  }

  const columns = defaultColumns.map((col) => {
    if (!col.editable) {
      return col
    }
    return {
      ...col,
      onCell: (record: DataType) => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: (col as { title?: React.ReactNode }).title,
        handleSave,
      }),
    }
  })

  return (
    <div style={{ padding: 24 }}>
      <Button onClick={handleAdd} type="primary" style={{ marginBottom: 16 }}>
        Add a row
      </Button>
      {/* antd demo 额外用 rowClassName='editable-row' 加行样式；data-grid 暂未实现 rowClassName
          （决策 3 第二步补齐），此处省略。editable-row 无对应 data-grid CSS，省略不影响功能。 */}
      <Table<DataType>
        components={components}
        bordered
        dataSource={dataSource}
        columns={columns as ColumnTypes}
      />

      <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8, color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
        点击 <strong>name</strong> 列单元格进入编辑（回车/失焦保存）；<strong>Add a row</strong> 追加行；
        <strong>Delete</strong> 删行。<br />
        ★ data-grid 适配：EditableCell 返回<strong>内容 ReactNode（不包 td）</strong>；EditableRow 用
        <code> Form component=&#123;false&#125;</code> + Context.Provider（不产生 DOM），行内单元格穿透为
        grid 直接子元素，引擎在 components.body.row 提供时强制走 multi 显式定位路径。
        shouldCellUpdate API 已实现（透传给 cell 组件，本 demo 未启用）。
      </div>
    </div>
  )
}

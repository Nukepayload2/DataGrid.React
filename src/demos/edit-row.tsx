/**
 * 复刻 antd `edit-row` demo（S16 验收）：
 *   `G:\Projects\ant-design\components\table\demo\edit-row.tsx`
 *
 * === antd demo 要素（行级编辑，区别 S15 单格编辑）===
 *
 * - `editingKey` state：当前正在编辑的行 key（'' 表示无编辑行，同时只允许一行编辑）。
 * - `isEditing(record) = record.key === editingKey`。
 * - operation 列 render：
 *     * 编辑态：`Save`（Typography.Link → save）+ `Cancel`（Popconfirm → cancel）。
 *     * 展示态：`Edit`（Typography.Link，`disabled = editingKey !== ''`，即已有行在编辑时禁用其他 Edit）。
 * - `edit(record)`：`form.setFieldsValue({ name, age, address, ...record })` + `setEditingKey(record.key)`。
 * - `save(key)`：`form.validateFields()` + 更新 data + `setEditingKey('')`。
 * - `cancel()`：`setEditingKey('')`。
 * - EditableCell：`editing ? Form.Item+inputNode : children`；
 *   `inputNode = inputType==='number' ? <InputNumber/> : <Input/>`。
 * - **Form 在 Table 外层**（`<Form form component={false}><Table components={{body:{cell:EditableCell}}}/>...`），
 *   **无 body.row**（区别 S15 的 EditableRow——S15 每行独立 Form；S16 整表共享一个 Form，靠 editingKey 区分当前编辑行）。
 * - `onCell(record)` 返回 `{ record, inputType, dataIndex, title, editing: isEditing(record) }`。
 * - columns：name/age/address editable + operation。
 * - `pagination={{ onChange: cancel }}`（翻页取消编辑）。
 * - bordered + rowClassName='editable-row'。
 *
 * === ★ data-grid div 渲染适配（同 S15）===
 *
 * data-grid 用 div 渲染单元格（`.dg-cell`，非 antd 的 `<td>`）。antd demo 的 EditableCell 返回
 * `<td>` 在 data-grid 下需适配：
 *
 * - **EditableCell**：返回**内容 ReactNode（不包 td）**。data-grid 引擎把 EditableCell 渲染在
 *   `.dg-cell-inner` 处（dg-cell div 内），dg-cell div 本身（grid 定位 / sticky / hover / align）
 *   由引擎维持。其余逻辑（editing 态 / Form.Item / InputNumber / Input）与 antd demo 照搬。
 *
 * - **Form 在 Table 外层**（`<Form component={false}>` 包 Table）——data-grid 的 components.body.row
 *   未提供（S16 不用 body.row）。Form 在外层包裹整个 Table，Form.Item（在 EditableCell 内）通过
 *   **React FormContext** 工作：antd Form context 是 React context，**不依赖 DOM 层级**（跨组件树
 *   传递），故 data-grid 的 div 渲染层级（dg-row/dg-cell）不影响 Form context 透传到 body.cell 内的
 *   Form.Item。这是 React context 的基本机制，data-grid 渲染不改变 React 组件树层级。
 *
 * - **onCell 透传**：data-grid 把 `onCell(record, index)` 返回值的**全部字段**（除 colSpan/rowSpan
 *   由 M3 合并消费）透传给 EditableCell props（与 antd additionalProps 一致，S15 已实现）。故
 *   EditableCell 能收到 `{ record, inputType, dataIndex, title, editing }`（来自 onCell）+
 *   `{ children, index }`（引擎注入）。
 *
 * - **rowClassName**：data-grid 未实现 rowClassName（S15 已登记 §9，决策 3 第二步补齐）。
 *   antd demo 用 `rowClassName='editable-row'`，data-grid **省略**（注释说明），不影响功能。
 *
 * === 验证点（S16）===
 *
 * 1. 100 行数据分页（默认 10 行/页），bordered 表格。
 * 2. 点击某行 operation 列 `Edit` → 该行 name/age/address 三列进入编辑态（Input/InputNumber），
 *    同时 operation 列变为 `Save` + `Cancel`；其他行 `Edit` 禁用（disabled）。
 * 3. `Save`：校验通过则保存（表格更新）+ 退出编辑；空值校验失败（控制台打印 Validate Failed）。
 * 4. `Cancel`（Popconfirm 确认）：退出编辑不保存。
 * 5. 翻页（pagination.onChange）→ 自动 cancel 退出编辑。
 * 6. age 列编辑用 InputNumber（number 类型），name/address 用 Input（text 类型）。
 * 7. 回归：S15 edit-cell + 非编辑 demo（basic/head/colspan-rowspan）+ M3 合并不破。
 */
import React, { useState } from 'react'
import type { TableProps } from '../table'
import { Table } from '../table'
import { Form, Input, InputNumber, Popconfirm, Typography } from 'antd'

interface DataType {
  key: string
  name: string
  age: number
  address: string
}

const originData: DataType[] = Array.from({ length: 100 }).map<DataType>((_, i) => ({
  key: i.toString(),
  name: `Edward ${i}`,
  age: 32,
  address: `London Park no. ${i}`,
}))

interface EditableCellProps {
  editing: boolean
  dataIndex: keyof DataType
  title: React.ReactNode
  inputType: 'number' | 'text'
  record: DataType
  index: number
}

/**
 * 自定义单元格组件（对齐 antd demo EditableCell）。
 *
 * ★ data-grid 适配：返回**内容 ReactNode（不包 td）**。引擎把本组件渲染在 `.dg-cell-inner` 处
 * （dg-cell div 内），dg-cell div（grid 定位 / hover / align）由引擎维持。
 *
 * editing 态：Form.Item + inputNode（InputNumber for number / Input for text）。
 * 展示态：直接渲染 children（引擎注入的单元格默认内容）。
 *
 * props 来源：children/index 由引擎注入；editing/inputType/dataIndex/title/record 来自
 * column.onCell 返回值（引擎透传 onCell 的全部字段，与 antd additionalProps 一致，S15 已实现）。
 *
 * ★ Form.Item 此处无需 useContext 取 Form——外层 `<Form form>` 通过 React FormContext
 * 自动透传到此处（Form context 不依赖 DOM 层级）。
 */
const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
  editing,
  dataIndex,
  title,
  inputType,
  children,
  // record / index 来自 onCell 透传，本 demo 未直接消费（与 antd demo 一致，保留 prop 声明）。
  // restProps（antd demo 用于透传给 td）在 data-grid 下无需消费（dg-cell div 由引擎管理）。
}) => {
  const inputNode = inputType === 'number' ? <InputNumber /> : <Input />

  // ★ data-grid 适配：返回内容 ReactNode（不包 td）。
  return (
    <>
      {editing ? (
        <Form.Item
          name={dataIndex as string}
          style={{ margin: 0 }}
          rules={[
            {
              required: true,
              message: `Please Input ${title}!`,
            },
          ]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </>
  )
}

type ColumnTypes = Exclude<TableProps<DataType>['columns'], undefined>

export default function EditRowDemo() {
  const [form] = Form.useForm()
  const [data, setData] = useState<DataType[]>(originData)
  const [editingKey, setEditingKey] = useState('')

  const isEditing = (record: DataType) => record.key === editingKey

  const edit = (record: Partial<DataType> & { key: React.Key }) => {
    form.setFieldsValue({ name: '', age: '', address: '', ...record })
    setEditingKey(record.key as string)
  }

  const cancel = () => {
    setEditingKey('')
  }

  const save = async (key: React.Key) => {
    try {
      const row = (await form.validateFields()) as DataType

      const newData = [...data]
      const index = newData.findIndex((item) => key === item.key)
      if (index > -1) {
        const item = newData[index]
        newData.splice(index, 1, {
          ...item,
          ...row,
        })
        setData(newData)
        setEditingKey('')
      } else {
        newData.push(row)
        setData(newData)
        setEditingKey('')
      }
    } catch (errInfo) {
      console.log('Validate Failed:', errInfo)
    }
  }

  const columns = [
    {
      title: 'name',
      dataIndex: 'name',
      width: '25%',
      editable: true,
    },
    {
      title: 'age',
      dataIndex: 'age',
      width: '15%',
      editable: true,
    },
    {
      title: 'address',
      dataIndex: 'address',
      width: '40%',
      editable: true,
    },
    {
      title: 'operation',
      dataIndex: 'operation',
      render: (_: unknown, record: DataType) => {
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

  const mergedColumns: ColumnTypes = columns.map((col) => {
    if (!col.editable) {
      return col as ColumnTypes[number]
    }
    return {
      ...col,
      onCell: (record: DataType) => ({
        record,
        inputType: col.dataIndex === 'age' ? 'number' : 'text',
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    }
  }) as ColumnTypes

  return (
    <div style={{ padding: 24 }}>
      {/* ★ Form 在 Table 外层（component={false} 不产生 DOM）。Form.Item 在 EditableCell 内，
          通过 React FormContext（不依赖 DOM 层级）访问此 Form 实例——data-grid 的 div 渲染层级
          不影响 context 透传。无 components.body.row（区别 S15 的 EditableRow）。 */}
      <Form form={form} component={false}>
        {/* antd demo 额外用 rowClassName='editable-row' 加行样式；data-grid 暂未实现 rowClassName
            （决策 3 第二步补齐，S15 已登记 §9），此处省略。editable-row 无对应 data-grid CSS，省略不影响功能。 */}
        <Table<DataType>
          components={{
            body: { cell: EditableCell },
          }}
          bordered
          dataSource={data}
          columns={mergedColumns}
          pagination={{ onChange: cancel }}
        />
      </Form>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fafafa',
          borderRadius: 8,
          color: 'rgba(0,0,0,0.65)',
          fontSize: 12,
        }}
      >
        行级编辑：点击某行 operation 列 <strong>Edit</strong> → 整行进入编辑（age 用
        <strong> InputNumber</strong>，name/address 用 <strong>Input</strong>），同时其他行 Edit 禁用。
        <strong> Save</strong> 保存，<strong>Cancel</strong>（Popconfirm）放弃；翻页自动取消编辑。
        <br />
        ★ data-grid 适配：EditableCell 返回<strong>内容 ReactNode（不包 td）</strong>；
        <strong> Form 在 Table 外层</strong>（<code>component=&#123;false&#125;</code> 不产生 DOM），
        Form.Item 通过 React FormContext（不依赖 DOM 层级）访问 Form 实例。
        <strong>无 components.body.row</strong>（区别 S15）。rowClassName 暂未实现（省略，不影响功能）。
      </div>
    </div>
  )
}

/**
 * edit-row demo 的 data-grid 段（左栏），从 edit-row.tsx 拆出。
 *
 * === 行级编辑 state 自管（子组件内）===
 * edit-row demo 的核心交互是行级编辑（一个 form 共享整表 + editingKey 区分当前编辑行）+ Edit/
 * Save/Cancel，这些都是表格内部交互态（无外部控制条直接操作）。按 SOP「交互 state（编辑/增删行/
 * 选择/展开/分页等）优先留子组件内自管；仅当父控制条需直接操作时才提升父」+ 本 demo 原始决策
 * 「编辑各自独立」（共用 form/data/editingKey 会冲突——两栏同时只能编辑一行、Form 共享串台），
 * 本子组件内部自管：
 *   - `form`（Form.useForm 整表共享）
 *   - `data`（表格数据，初始 originData 100 行）
 *   - `editingKey`（当前编辑行 key，''=无编辑）
 *   + `isEditing`/`edit`/`cancel`/`save`
 * 这与改造前 DgEditRowPane 的行为完全等价（components.body.cell + onCell + Form 外层）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 已覆盖 virtual；行级编辑 state 全
 * 在子组件内自管，无需父级 prop 兜底——编辑模式单侧渲染也能完整演示 Edit/Save/Cancel（自管 state）。
 *
 * === ★ data-grid div 渲染适配（保留）===
 * EditableCell 返回**内容 ReactNode（不包 td）**，引擎渲染在 `.dg-cell-inner` 处。
 * Form 在 Table 外层（`Form component={false}` 不产生 DOM），Form.Item 在 EditableCell 内，
 * 通过 React FormContext（不依赖 DOM 层级）访问 Form 实例。无 components.body.row（区别 S15）。
 *
 * === ★ CSS 注入幂等保留（两子组件共用同一 CSS）===
 * `injectEditRowCss` 把 antd demo 配套 CSS（`.editable-row .ant-form-item-explain` 校验错误定位）
 * 注入 document.head。本子文件 + edit-row.antd.tsx 各自调用一次（useEffect），两子组件共用同一 CSS。
 * 幂等：模块级 `cssInjected` 标志 + DOM `[data-edit-row-css]` 存在性双重检查。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'react'` / `'../table'` / `'antd'` / `'./_compare/edit-row.shared'`），源码可原样展示无需路径改写。
 */
import React, { useEffect, useState } from 'react'
import { Form, Input, InputNumber, Popconfirm, Typography } from 'antd'
import { Table } from '../table'
import type { TableProps } from '../table'
import { originData, type RecordType } from './_compare/edit-row.shared'

// ---------------------------------------------------------------------------
// antd demo 配套 CSS（注入 document.head，仅注入一次；两子组件共用同一 CSS）。
// 对齐 antd edit-row demo 的 .editable-row .ant-form-item-explain 定位（校验错误信息悬浮）。
// 幂等：模块级 cssInjected 标志 + DOM [data-edit-row-css] 存在性双重检查。
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// data-grid 适配：EditableCell（返回内容 ReactNode，不包 td）
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 子组件（自管行级编辑 state）
// ---------------------------------------------------------------------------

export default function EditRowDg({
  virtual = false,
}: {
  virtual: boolean
}) {
  // ★ 行级编辑 state 各自独立（两栏对照时互不干扰，按原始 demo 决策「编辑各自独立」）。
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
        // 虚拟化（决策 7）：ON→virtual+scroll.y=true（CSS 自适应高度，SplitDemo 限高 pane body 提供可滚动区域）；OFF→不传，非虚拟全量 DOM（零回归）。
        // 编辑态单元格在虚拟窗口内正常工作（Form context 透传不依赖 DOM 层级）。
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
    </Form>
  )
}

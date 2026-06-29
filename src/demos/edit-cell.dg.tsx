/**
 * edit-cell demo 的 data-grid 段（左栏），从 edit-cell.tsx 拆出。
 *
 * === 增删行 + 编辑 state 自管（子组件内）===
 * edit-cell demo 的核心交互是单元格点击编辑（Form.Item+Input）+ 回车/失焦保存 + Add/Delete 行，
 * 这些都是表格内部交互态（无外部控制条直接操作）。按 SOP「交互 state（编辑/增删行/选择/展开/
 * 分页等）优先留子组件内自管；仅当父控制条需直接操作时才提升父」+ 本 demo 原始决策「编辑各自
 * 独立」（共用 dataSource 会互相干扰——一个单元格进入编辑态另一侧跟着进编辑态无意义），本子组件
 * 内部自管：
 *   - `dataSource`（表格数据，初始 defaultData）
 *   - `count`（生成新 key 计数器，初始 defaultCount）
 *   + `handleAdd`/`handleDelete`/`handleSave`
 * 这与改造前 DgEditCellPane 的行为完全等价（components.body.cell/row + onCell 编辑 + 增删行）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 已覆盖 virtual；编辑/增删行 state 全
 * 在子组件内自管，无需父级 prop 兜底——编辑模式单侧渲染也能完整演示编辑 + Add/Delete（自管 state）。
 *
 * === ★ data-grid div 渲染适配（保留）===
 * EditableCell 返回**内容 ReactNode（不包 td）**；EditableRow 用 `Form component={false}` +
 * Context.Provider（不产生 DOM），行内单元格穿透为 grid 直接子元素，引擎在 components.body.row
 * 提供时强制走 multi 显式定位路径。
 *
 * === ★ CSS 注入幂等保留（两子组件共用同一 CSS）===
 * `injectEditCellCss` 把 antd demo 配套 CSS（`.editable-cell-value-wrap` hover 边框）注入
 * document.head。本子文件 + edit-cell.antd.tsx 各自调用一次（useEffect），两子组件共用同一 CSS。
 * 幂等：模块级 `cssInjected` 标志 + DOM `[data-edit-cell-css]` 存在性双重检查（Vite HMR 跨模块
 * 实例重置 cssInjected 时，DOM 检查兜底避免重复 `<style>`）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'react'` / `'../table'` / `'antd'` / `'./_compare/edit-cell.shared'`），源码可原样展示无需路径改写。
 */
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

// ---------------------------------------------------------------------------
// antd demo 配套 CSS（注入 document.head，仅注入一次；两子组件共用同一 CSS）。
// 对齐 antd edit-cell demo 的 .editable-cell-value-wrap / .editable-row hover 边框样式。
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
// data-grid 适配：EditableRow（Form component={false} + Provider，不产生 DOM）
// + EditableCell（返回内容 ReactNode，不包 td）
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 子组件（自管编辑/增删行 state）
// ---------------------------------------------------------------------------

export default function EditCellDg({
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
        // 虚拟化（决策 7）：ON→virtual+scroll.y=true（CSS 自适应高度，SplitDemo 限高 pane body 提供可滚动区域）；OFF→不传，非虚拟全量 DOM（零回归）。
        // 编辑态单元格在虚拟窗口内正常工作（Form context 透传不依赖 DOM 层级）。
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
    </div>
  )
}

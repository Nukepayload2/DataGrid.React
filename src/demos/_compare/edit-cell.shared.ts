/**
 * 决策 9：edit-cell 左右对比 demo 的共享配置（S15）。
 *
 * 提取两侧都复用的类型与初始数据。单元格组件（EditableCell）/ 行组件（EditableRow）/
 * Form context 因两侧实现不同（data-grid div 渲染适配 vs antd td/tr 原生），保留在各自 demo
 * 文件，但均引用本文件的 `RecordType` 与 `defaultData`/`defaultCount`。
 *
 * === antd demo 共享要素 ===
 *
 * - `components.body.row = EditableRow`：每行独立 Form（`Form.useForm()`）+ EditableContext.Provider。
 * - `components.body.cell = EditableCell`：editing 态 Form.Item+Input，展示态 div.editable-cell-value-wrap。
 * - `column.onCell(record)` 返回 `{ record, editable, dataIndex, title, handleSave }`。
 * - 增删行：Add button（count 递增）+ Delete Popconfirm（>=1 行显示）。
 * - rowClassName='editable-row' + CSS（editable-cell-value-wrap padding/border on hover）。
 */

/** antd edit-cell demo 的记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: string
  address: string
}

/** antd edit-cell demo 的初始数据（2 行）。两侧共用初始基准，各自独立编辑。 */
export const defaultData: RecordType[] = [
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
]

/** 初始 count（用于 Add a row 生成新 key，对齐 antd demo 初值 2）。两侧共用。 */
export const defaultCount = 2

/**
 * 生成新行（对齐 antd demo handleAdd 的 newData 模板）。
 * 两侧复用，保证对照基准一致。
 */
export function makeNewRow(count: number): RecordType {
  return {
    key: count,
    name: `Edward King ${count}`,
    age: '32',
    address: `London, Park Lane no. ${count}`,
  }
}

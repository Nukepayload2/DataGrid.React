/**
 * edit-row 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与初始数据（100 行）。单元格组件（EditableCell）/ Form 因两侧实现
 * 不同（data-grid div 渲染适配 vs antd td 原生），保留在各自 demo 文件，但均引用本文件的
 * `RecordType` 与 `originData`。
 *
 * === antd demo 共享要素（行级编辑）===
 *
 * - `editingKey` state：当前编辑行 key（''=无编辑，同时只允许一行编辑）。
 * - `isEditing(record) = record.key === editingKey`。
 * - operation 列 render：编辑态 Save+Cancel，展示态 Edit（disabled=editingKey!==''）。
 * - `edit(record)`：`form.setFieldsValue` + `setEditingKey`。
 * - `save(key)`：`form.validateFields` + 更新 data + 清 editingKey。
 * - `cancel()`：`setEditingKey('')`。
 * - EditableCell：`editing ? Form.Item+inputNode : children`；inputType 'number'→InputNumber / 'text'→Input。
 * - Form 在 Table 外层（`Form component={false}`），无 body.row。
 * - `onCell(record)` 返回 `{ record, inputType, dataIndex, title, editing }`。
 * - `pagination={{ onChange: cancel }}`（翻页取消编辑）+ bordered + rowClassName='editable-row'。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key: string
  name: string
  age: number
  address: string
}

/** 初始数据（100 行）。两侧共用初始基准，各自独立编辑。 */
export const originData: RecordType[] = Array.from({ length: 100 }).map<RecordType>((_, i) => ({
  key: i.toString(),
  name: `Edward ${i}`,
  age: 32,
  address: `London Park no. ${i}`,
}))

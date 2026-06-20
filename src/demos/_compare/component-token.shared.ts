/**
 * 决策 9：component-token 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的数据、RecordType、title/footer。
 * 列定义因两侧类型不同（data-grid `ColumnType` vs antd `TableProps['columns']`，
 * render 实现也不同——antd 用 @ant-design/icons DownOutlined，data-grid 自绘 SVG）
 * + expandable（data-grid `Expandable` vs antd `ExpandableConfig` 字段不完全兼容）
 * 保留在各自 demo 文件；但 RecordType + dataSource + title/footer 共用。
 *
 * 对照源：`G:\Projects\ant-design\components\table\demo\component-token.tsx`。
 */

/** component-token / dynamic-settings 共享记录类型。两侧共用。 */
export interface RecordType {
  key: number
  name: string
  age: number
  address: string
  description: string
}

/** 10 行数据（对齐 antd component-token demo 的 dataSource）。两侧复用同一份。 */
export const dataSource: RecordType[] = Array.from({ length: 10 }).map<
  RecordType
>((_, i) => ({
  key: i,
  name: 'John Brown',
  age: Number(`${i}2`),
  address: `New York No. ${i} Lake Park`,
  description: `My name is John Brown, I am ${i}2 years old, living in New York No. ${i} Lake Park.`,
}))

/** 默认 title / footer（无副作用函数字面量，两侧共用）。 */
export const defaultTitle = () => 'Here is title'
export const defaultFooter = () => 'Here is footer'

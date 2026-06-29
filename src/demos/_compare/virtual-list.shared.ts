/**
 * virtual-list 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据生成函数，避免 data-grid 与 antd 两侧各自定义造成漂移。
 * 列定义因两侧类型不同（data-grid `ColumnType` vs antd `TableProps['columns']`，
 * 且 render 实现不同——antd 用 `Space`/`Typography.Link`，data-grid 用内联 `<a>`/`<span>`）
 * 保留在各自 demo 文件，但均引用本文件的 `RecordType`。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  id: number
  firstName: string
  lastName: string
  age: number
  address1: string
  address2: string
  address3: string
}

/**
 * 生成虚拟列表数据。对齐 antd virtual-list demo getData 的字段约定。
 * - `id` 直接用 index
 * - `firstName`/`lastName` 用 `toString(16)` 十六进制串（视觉上有变化）
 * - `age` 在 25-34 循环
 * - `address1/2/3` 三个城市 + Lake Park
 */
export function getData(length: number): RecordType[] {
  return Array.from({ length }).map<RecordType>((_, index) => ({
    id: index,
    firstName: `First_${index.toString(16)}`,
    lastName: `Last_${index.toString(16)}`,
    age: 25 + (index % 10),
    address1: `New York No. ${index} Lake Park`,
    address2: `London No. ${index} Lake Park`,
    address3: `Sydney No. ${index} Lake Park`,
  }))
}

/** virtual-list 对照 demo 的共享记录类型和数据生成器。 */

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

/** 生成对齐 antd virtual-list 示例的数据。 */
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

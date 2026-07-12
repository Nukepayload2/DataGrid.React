/** 记录类型。两侧共用。 */
export interface DataType {
  key: string
  name: string
  age: number
  tel: string
  phone: number
  address: string
}

/** 5 行固定数据（antd 官方 demo 同字面量）。两侧共用。 */
export const data: DataType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    tel: '0571-22098909',
    phone: 18889898989,
    address: 'New York No. 1 Lake Park',
  },
  {
    key: '2',
    name: 'Jim Green',
    tel: '0571-22098333',
    phone: 18889898888,
    age: 42,
    address: 'London No. 1 Lake Park',
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    tel: '0575-22098909',
    phone: 18900010002,
    address: 'Sydney No. 1 Lake Park',
  },
  {
    key: '4',
    name: 'Jim Red',
    age: 18,
    tel: '0575-22098909',
    phone: 18900010002,
    address: 'London No. 2 Lake Park',
  },
  {
    key: '5',
    name: 'Jake White',
    age: 18,
    tel: '0575-22098909',
    phone: 18900010002,
    address: 'Dublin No. 2 Lake Park',
  },
]

/**
 * 第 2 行（index===1）Age/Home phone/Phone/Address 列均被 Name 的 colSpan:5 覆盖 → colSpan:0。
 * 两侧共用同一函数（对齐 antd 官方 demo 的 sharedOnCell）。
 */
export function sharedOnCell(_record: DataType, index?: number): { colSpan?: number } {
  if (index === 1) {
    return { colSpan: 0 }
  }
  return {}
}

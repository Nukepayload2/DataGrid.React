/** 记录类型。两侧共用。 */
export interface RecordType {
  key: React.Key
  name: string
  age: string
  address: string
}

/** 初始数据（2 行）。两侧共用初始基准，各自独立编辑。 */
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

/** 初始 count（用于 Add a row 生成新 key，对齐 antd demo 初值 2）。 */
export const defaultCount = 2

/**
 * 生成新行（对齐 antd demo handleAdd 的 newData 模板）。
 */
export function makeNewRow(count: number): RecordType {
  return {
    key: count,
    name: `Edward King ${count}`,
    age: '32',
    address: `London, Park Lane no. ${count}`,
  }
}

// ---------------------------------------------------------------------------
// 示例 1：antd 官方 bordered demo（3 列 + title/footer）
// ---------------------------------------------------------------------------

/** 示例 1 记录类型。两侧共用。 */
export interface RowType {
  key: string
  name: string
  money: string
  address: string
}

/** 示例 1 数据（3 行）。两侧共用。 */
export const data: RowType[] = [
  {
    key: '1',
    name: 'John Brown',
    money: '￥300,000.00',
    address: 'New York No. 1 Lake Park',
  },
  {
    key: '2',
    name: 'Jim Green',
    money: '￥1,256,000.00',
    address: 'London No. 1 Lake Park',
  },
  {
    key: '3',
    name: 'Joe Black',
    money: '￥120,000.00',
    address: 'Sydney No. 1 Lake Park',
  },
]

// ---------------------------------------------------------------------------
// 示例 2：bordered + fixed 组合（本仓库新增对照）
// ---------------------------------------------------------------------------

/** 示例 2 记录类型。两侧共用。 */
export interface FixedRow {
  key: string
  name: string
  age: number
  address: string
}

/** 示例 2 数据（3 行）。两侧共用。 */
export const fixedData: FixedRow[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York Park' },
  { key: '2', name: 'Jim Green', age: 40, address: 'London Park' },
  { key: '3', name: 'Joe Black', age: 28, address: 'Sydney Park' },
]

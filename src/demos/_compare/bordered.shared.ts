/**
 * 决策 9：bordered 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据（两示例）：
 *   - 示例 1：antd 官方 `bordered.tsx`（Name/Cash Assets align end/Address，3 列 + title/footer）。
 *   - 示例 2：bordered + fixed 组合（Full Name+Age 左固定、Column 1..5 中间、Action 右固定），
 *     data-grid S26 新增对照（验证「固定列在 bordered 模式下边框完整」）。
 *
 * 列定义因两侧类型差异（data-grid `fixed:'start'/'end'` + `align:'end'` 逻辑属性 vs antd
 * `fixed:'left'/'right'` + `align:'right'`；render 重载签名不同）保留在各自 demo 文件，
 * 但字段（title/dataIndex/key/width/dataIndex→address）逐字一致。
 *
 * 说明：antd 官方 `bordered.tsx` **仅有示例 1**；示例 2（fixed 组合）为 data-grid S26 新增的对照
 * （验证固定列边框）。两侧均渲染两示例以提供对照（fixed × bordered 边框差异是对照修 bug 价值点）。
 */

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
// 示例 2：bordered + fixed 组合（data-grid S26 新增对照）
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

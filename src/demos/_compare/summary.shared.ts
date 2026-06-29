/**
 * summary 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据：
 *   - `DataType`：antd 官方 summary demo 示例1 的记录类型（Name/Borrow/Repayment）。
 *   - `FixedDataType`：示例2 fixed sticky 的记录类型（Name/Description）。
 *   - `dataSource`：示例1 4 行数据。
 *   - `fixedDataSource`：示例2 20 行数据。
 *
 * 列定义因两侧类型不同（data-grid `ColumnType` 与 antd `TableColumnsType`），
 * 保留在各自 demo 文件，但字段逐字一致。
 *
 * antd summary demo 两个示例：
 *   - 示例1（计算总计）：bordered + pagination:false + 函数 summary 接收 pageData。
 *   - 示例2（fixed sticky bottom）：bordered + scroll:{x:2000, y:500} + pagination:false
 *     + Table.Summary fixed。
 */

/** 示例1（计算总计）记录类型。 */
export interface DataType {
  key: string
  name: string
  borrow: number
  repayment: number
}

/** 示例2（fixed sticky bottom）记录类型。 */
export interface FixedDataType {
  key: React.Key
  name: string
  description: string
}

/** 示例1 demo 数据（4 行）。两侧共用。 */
export const dataSource: DataType[] = [
  { key: '1', name: 'John Brown', borrow: 10, repayment: 33 },
  { key: '2', name: 'Jim Green', borrow: 100, repayment: 0 },
  { key: '3', name: 'Joe Black', borrow: 10, repayment: 10 },
  { key: '4', name: 'Jim Red', borrow: 75, repayment: 45 },
]

/** 示例2 demo 数据（20 行，Light/Bamboo/Little 循环）。两侧共用。 */
export const fixedDataSource: FixedDataType[] = Array.from({ length: 20 }).map(
  (_, i) => ({
    key: i,
    name: ['Light', 'Bamboo', 'Little'][i % 3],
    description: 'Everything that has a beginning, has an end.',
  }),
)

/**
 * 决策 9：tree-table-preserveSelectedRowKeys 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义（Name/Age/Address）为纯文本、两侧一致，
 * 各 demo 文件本地按 ColumnType<T> / TableColumnsType<T> 引用本文件数据。
 *
 * antd demo 数据：15 顶层父行（Edward 0..14），每父含 2 个子行（Brown / Jimmy）。
 * 树形 × 分页（defaultPageSize:5 → 3 页）× checkStrictly × preserveSelectedRowKeys
 * （issue #50621）。
 */

/** antd tree-table-preserveSelectedRowKeys demo 的记录类型（含 children）。两侧共用。 */
export interface RecordType {
  key: React.ReactNode
  name: string
  age: number
  address: string
  children?: RecordType[]
}

/**
 * antd demo 的数据：15 顶层父行（Edward 0..14），每父含 2 子（Brown / Jimmy）。
 * 两侧共用，保证对照基准一致。
 */
export const dataSource: RecordType[] = Array.from({ length: 15 }).map<RecordType>((_, i) => ({
  key: `key${i}`,
  name: `Edward ${i}`,
  age: 32,
  address: `London Park no. ${i}`,
  children: [
    {
      key: `subKey${i}1`,
      name: 'Brown',
      age: 16,
      address: 'New York No. 3 Lake Park',
    },
    {
      key: `subKey${i}2`,
      name: 'Jimmy',
      age: 16,
      address: 'New York No. 3 Lake Park',
    },
  ],
}))

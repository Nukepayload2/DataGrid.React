/**
 * 决策 9：grouping-columns 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据生成函数：
 *   - `DataType`：antd 官方 grouping-columns demo 的记录类型（9 字段）。
 *   - `getData(count)`：生成 count 行 demo 数据（对齐 antd demo 的 Array.from 映射）。
 *
 * 列定义因两侧类型差异（data-grid `ColumnType` 含 `fixed:'start'/'end'` 逻辑属性 +
 * 多级表头 children 任意深度 vs antd `TableColumnsType` 含 `fixed:'left'/'right'`）以及
 * data-grid 引擎不支持原生 filters/sorter 组合的展示意图（S1/S3 自研任务才覆盖），
 * 列定义保留在各自 demo 文件，但字段（title/dataIndex/key/width/children 嵌套结构）逐字一致。
 */

/** antd grouping-columns demo 的记录类型。两侧共用。 */
export interface DataType {
  key: string | number
  name: string
  age: number
  street: string
  building: string
  number: number
  companyAddress: string
  companyName: string
  gender: string
}

/**
 * 生成 grouping-columns 数据。对齐 antd 官方 demo 的 Array.from 映射：
 *   - key = index
 *   - name 恒 'John Brown'、age = i+1
 *   - street/building/number/companyAddress/companyName/gender 全部与 antd demo 同字面量
 *
 * 默认 100 行（对齐 antd 官方）；data-grid 侧可传更小 count 简化展示（避免无滚动撑爆页面）。
 */
export function getData(count = 100): DataType[] {
  return Array.from({ length: count }).map<DataType>((_, i) => ({
    key: i,
    name: 'John Brown',
    age: i + 1,
    street: 'Lake Park',
    building: 'C',
    number: 2035,
    companyAddress: 'Lake Street 42',
    companyName: 'SoftLake Co',
    gender: 'M',
  }))
}

/**
 * reset-filter 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义因两侧类型不同（data-grid `ColumnType` 与
 * antd `TableProps['columns']` 的 sorter/filters 类型归属不同；filter 下拉控件
 * data-grid 引擎自绘 vs antd 原生），保留在各自 demo 文件，但均引用本文件的
 * `RecordType`、`data`、`Filters`、`Sorts`，且列字段逐字一致
 * （Name filters+sorter / Age sorter / Address filters+sorter + 三列 ellipsis）。
 *
 * 与 antd `components/table/demo/reset-filter.tsx` 逐字一致。
 *
 * 注意：reset-filter 与 custom-filter-panel 的 data 第 2/3 行顺序不同
 * （antd 官方两份 demo 各自独立声明），故各自单独建 shared 文件，不复用 head.shared。
 */

/**
 * 记录类型。两侧共用。
 *
 * 除 antd 原版 name/age/address 外，本 demo 额外加 status/tag/empty 三个字段
 * 用于触发 locale 的 3 个 key（filterSearchPlaceholder / filterCheckAll / filterEmptyText）
 * 的运行时验证（见 demo 顶部注释「locale 5 key 运行时验证闭环」）。
 */
export interface RecordType {
  key: string
  name: string
  age: number
  address: string
  /** Status 列：触发 filterSearch（搜索框 placeholder='搜索'）。 */
  status: string
  /** Tag 列：触发 filterMode='tree'（tree 全选 Checkbox 文案='全选'）。 */
  tag: string
  /** Empty 列：filters:[] 空数组（下拉空占位='无筛选'）。本字段仅占位，值不影响行为。 */
  empty: string
}

/** 数据（4 行）。两侧共用，保证对照基准一致。 */
export const data: RecordType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park', status: 'active', tag: 'vip', empty: '' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park', status: 'inactive', tag: 'normal', empty: '' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park', status: 'active', tag: 'vip', empty: '' },
  { key: '4', name: 'Jim Red', age: 32, address: 'London No. 2 Lake Park', status: 'pending', tag: 'normal', empty: '' },
]

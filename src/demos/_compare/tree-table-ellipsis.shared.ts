/**
 * tree-table-ellipsis 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据：
 *   - `RecordType`：antd 官方 tree-table-ellipsis demo 的记录类型（含递归 children）。
 *   - `data`：树形数据（2 顶层行，name 超长重复串验证 ellipsis）。
 *
 * 列定义因两侧类型不同（data-grid `ColumnType` 与 antd `TableColumnsType`）+ `fixed`
 * 受顶部 Switch 共享驱动（columns 在渲染时动态拼装 fixed），保留在各自 demo 文件，
 * 但字段（title/dataIndex/key/width/ellipsis）逐字一致。
 *
 * antd tree-table-ellipsis demo 关键要素：
 *   - children 嵌套（默认 childrenColumnName='children'）+ name 超长（验证 ellipsis）。
 *   - Name 列 `ellipsis:true + width:'30%' + fixed`（Switch 切换）。
 *   - rowSelection columnWidth:100（前置哨兵列）+ expandable.defaultExpandAllRows。
 */

/** 记录类型（含递归 children）。两侧共用。 */
export interface RecordType {
  key: React.ReactNode
  name: string
  age: number
  address: string
  children?: RecordType[]
}

/**
 * antd tree-table-ellipsis demo 的数据（2 顶层行）。
 * - John Brown sr. 含多层嵌套子树（子→孙），name 超长（重复串，验证 ellipsis）。
 * - Joe Black 无 children（顶层独立行）。
 * 两侧共用同一引用。
 */
export const data: RecordType[] = [
  {
    key: 1,
    name: 'John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr.',
    age: 60,
    address: 'New York No. 1 Lake Park',
    children: [
      {
        key: 11,
        name: 'John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr.',
        age: 42,
        address: 'New York No. 2 Lake Park',
      },
      {
        key: 12,
        name: 'John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr.',
        age: 30,
        address: 'New York No. 3 Lake Park',
        children: [
          {
            key: 121,
            name: 'John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr.',
            age: 16,
            address: 'New York No. 3 Lake Park',
          },
        ],
      },
      {
        key: 13,
        name: 'Jim Green sr. Jim Green sr. Jim Green sr. Jim Green sr.',
        age: 72,
        address: 'London No. 1 Lake Park',
        children: [
          {
            key: 131,
            name: 'Jim Green. Jim Green. Jim Green. Jim Green. Jim Green. Jim Green.',
            age: 42,
            address: 'London No. 2 Lake Park',
            children: [
              {
                key: 1311,
                name: 'Jim Green jr. Jim Green jr. Jim Green jr. Jim Green jr.',
                age: 25,
                address: 'London No. 3 Lake Park',
              },
              {
                key: 1312,
                name: 'Jimmy Green sr. Jimmy Green sr. Jimmy Green sr.',
                age: 18,
                address: 'London No. 4 Lake Park',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 2,
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
  },
]

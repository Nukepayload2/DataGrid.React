/**
 * tree-data 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的类型与数据。列定义（Name/Age/Address）为纯文本、两侧一致，
 * 也合并到此（按各 demo 文件本地类型 ColumnType<T> / TableColumnsType<T> 分别 cast 引用）。
 *
 * antd `tree-data` demo 数据：2 个顶层行（John Brown sr. 带多层嵌套子树 / Joe Black 无子），
 * 默认 childrenColumnName='children'。
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
 * antd tree-data demo 的数据（2 顶层行）。
 * John Brown sr. 含 3 层嵌套子树；Joe Black 无子。两侧共用。
 */
export const data: RecordType[] = [
  {
    key: 1,
    name: 'John Brown sr.',
    age: 60,
    address: 'New York No. 1 Lake Park',
    children: [
      {
        key: 11,
        name: 'John Brown',
        age: 42,
        address: 'New York No. 2 Lake Park',
      },
      {
        key: 12,
        name: 'John Brown jr.',
        age: 30,
        address: 'New York No. 3 Lake Park',
        children: [
          {
            key: 121,
            name: 'Jimmy Brown',
            age: 16,
            address: 'New York No. 3 Lake Park',
          },
        ],
      },
      {
        key: 13,
        name: 'Jim Green sr.',
        age: 72,
        address: 'London No. 1 Lake Park',
        children: [
          {
            key: 131,
            name: 'Jim Green',
            age: 42,
            address: 'London No. 2 Lake Park',
            children: [
              {
                key: 1311,
                name: 'Jim Green jr.',
                age: 25,
                address: 'London No. 3 Lake Park',
              },
              {
                key: 1312,
                name: 'Jimmy Green sr.',
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

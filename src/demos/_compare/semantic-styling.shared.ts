/**
 * style-class 左右对比 demo 的共享配置。
 *
 * 提取两侧都复用的数据 + 描述记录类型。列定义因两侧类型不同
 * （data-grid `ColumnType` vs antd `TableProps['columns']`）且 render 实现不同
 * （antd 原生 `<Table>` vs data-grid），保留在各自 demo 文件；但均引用本文件的 `RecordType`。
 *
 * 对照源：`{{AntDesign}}/components/table/demo/style-class.tsx`。
 */

/** 记录类型。两侧共用。 */
export interface RecordType {
  key?: string
  name?: string
  age?: number
  address?: string
  description?: string
}

/** 4 行共享数据（对齐 antd style-class demo 的 dataSource）。两侧复用同一份。 */
export const dataSource: RecordType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    description:
      'My name is John Brown, I am 32 years old, living in New York No. 1 Lake Park.',
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    description:
      'My name is Jim Green, I am 42 years old, living in London No. 1 Lake Park.',
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    description:
      'My name is Joe Black, I am 32 years old, living in Sydney No. 1 Lake Park.',
  },
  {
    key: '4',
    name: 'Disabled User',
    age: 99,
    address: 'Sydney No. 2 Lake Park',
    description: 'This user is disabled.',
  },
]

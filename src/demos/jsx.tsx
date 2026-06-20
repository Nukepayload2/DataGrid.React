/**
 * 复刻 antd `jsx` demo：`G:\Projects\ant-design\components\table\demo\jsx.tsx`。
 *
 * === S31 JSX 风格 API（自研任务）===
 *
 * antd 允许用 `<Table>` 的 JSX 子元素声明列（语法糖），等价于传 `columns` prop：
 *   - `<Table.Column title="..." dataIndex="..." key="..." />`：单列（叶子列）。
 *   - `<Table.ColumnGroup title="..."><Column/>...</ColumnGroup>`：分组列（多级表头，复用 M1）。
 *
 * data-grid 对齐实现（S31）：
 *   - `Table.Column` / `Table.ColumnGroup` 静态属性（+ 命名导出），均为渲染 null 的数据载体组件。
 *   - Table 适配层 `convertChildrenToColumns`（对齐 antd rc-table 同名函数）：当**未传 `columns` prop**
 *     时，用 React.Children 遍历 JSX 子元素，把 Column 的 props 转为 ColumnType、ColumnGroup 转为
 *     `{ title, children: [...] }`（任意深度嵌套，复用 M1 多级表头渲染）。
 *   - **columns 或 children 二选一**：传 columns 走 columns 路径（所有现有 demo，零回归）；
 *     不传 columns 但传 JSX children 走解析路径（本 demo）。
 *
 * === antd demo 要素（逐项复刻）===
 *
 * - `const { Column, ColumnGroup } = Table`：从 Table 静态属性解构（data-grid 同款）。
 * - `<Table<DataType> dataSource={data}>` 子元素结构（3 行数据）：
 *     * `<ColumnGroup title="Name">` 内含 `<Column title="First Name" dataIndex="firstName"/>`
 *       + `<Column title="Last Name" dataIndex="lastName"/>`（多级表头，复用 M1）。
 *     * `<Column title="Age" dataIndex="age" />`。
 *     * `<Column title="Address" dataIndex="address" />`。
 *     * `<Column title="Tags" dataIndex="tags" render={...Tag}/> `：Flex + Tag（antd，决策 6）。
 *     * `<Column title="Action" key="action" render={...links}/>`：Space（antd，决策 6）+ 两个 `<a>`。
 *
 * === 与 antd 的差异 ===
 *
 * - antd demo 的 `<Space size="medium">`：data-grid 用 antd Space 的 `size="middle"`
 *   （antd v6 Space size 类型为 `'small'|'middle'|'large'|number`，无 'medium'；antd jsx demo
 *   写 'medium' 实为 v6 别名兼容，data-grid 显式用规范的 'middle'）。
 */

import { Flex, Space, Tag } from 'antd'
import { Table } from '../table'

interface DataType {
  key: React.Key
  firstName: string
  lastName: string
  age: number
  address: string
  tags: string[]
}

const data: DataType[] = [
  {
    key: '1',
    firstName: 'John',
    lastName: 'Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    tags: ['nice', 'developer'],
  },
  {
    key: '2',
    firstName: 'Jim',
    lastName: 'Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    tags: ['kawaii'],
  },
  {
    key: '3',
    firstName: 'Joe',
    lastName: 'Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    tags: ['cool', 'teacher'],
  },
]

const { Column, ColumnGroup } = Table

export default function JsxDemo() {
  return (
    <Table<DataType> dataSource={data}>
      <ColumnGroup title="Name">
        <Column title="First Name" dataIndex="firstName" key="firstName" />
        <Column title="Last Name" dataIndex="lastName" key="lastName" />
      </ColumnGroup>
      <Column title="Age" dataIndex="age" key="age" />
      <Column title="Address" dataIndex="address" key="address" />
      <Column
        title="Tags"
        dataIndex="tags"
        key="tags"
        render={(tags: string[]) => (
          <Flex gap="small" align="center" wrap>
            {tags.map((tag) => {
              let color = tag.length > 5 ? 'geekblue' : 'green'
              if (tag === 'kawaii') {
                color = 'volcano'
              }
              return (
                <Tag color={color} key={tag}>
                  {tag.toUpperCase()}
                </Tag>
              )
            })}
          </Flex>
        )}
      />
      <Column
        title="Action"
        key="action"
        render={(_: any, record: DataType) => (
          <Space size="middle">
            <a>Invite {record.lastName}</a>
            <a>Delete</a>
          </Space>
        )}
      />
    </Table>
  )
}

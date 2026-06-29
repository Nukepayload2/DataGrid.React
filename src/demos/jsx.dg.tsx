/**
 * jsx demo 的 data-grid 段（左栏），从 jsx.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 jsx.tsx 父组件传）。
 * - 自包含：用 JSX `<Table.Column>`/`<Table.ColumnGroup>` 子元素声明列（S31）+ 本地渲染（Tag/Flex/Space）。
 * - 行为与改造前一致：ColumnGroup 多级表头 + render Tag/Flex/Space 用 antd 控件（jsx demo 改造前已用 antd）。
 *   data-grid 用 antd Space 的 `size="middle"`（antd v6 规范值，无 'medium'）。
 *
 * === S31 JSX 风格 API ===
 *
 * antd 允许用 `<Table>` 的 JSX 子元素声明列（语法糖），等价于传 `columns` prop：
 *   - `<Table.Column title="..." dataIndex="..." key="..." />`：单列（叶子列）。
 *   - `<Table.ColumnGroup title="..."><Column/>...</ColumnGroup>`：分组列（多级表头）。
 *
 * data-grid 对齐实现：`Table.Column` / `Table.ColumnGroup` 静态属性，均为渲染 null 的数据载体组件；
 * Table 适配层 `convertChildrenToColumns`：当未传 `columns` prop 时，用 React.Children 遍历 JSX 子元素，
 * 把 Column 的 props 转为 ColumnType、ColumnGroup 转为 `{ title, children: [...] }`。
 * columns 或 children 二选一：传 columns 走 columns 路径；不传 columns 但传 JSX children 走解析路径（本 demo）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'../table'` / `'./_compare/jsx.shared'`），源码可原样展示无需路径改写。
 */
import { Flex, Space, Tag } from 'antd'
import { Table } from '../table'
import { data, tagColor, type RecordType } from './_compare/jsx.shared'

// 左栏：从 data-grid Table 解构 Column/ColumnGroup（对齐 antd demo 写法）。
const { Column, ColumnGroup } = Table

export default function JsxDg({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      dataSource={data}
      bordered={bordered}
      /* pagination={{}}：对齐 antd 默认分页条（antd 对任意行数都渲染 .ant-pagination，即便行数
         ≤ pageSize 也会渲染 disabled 态分页条；data-grid 不传=不渲染）。 */
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         给的 400px 限高，虚拟窗口才有滚动区）；OFF 时回 undefined，行为与改造前一致。
         virtual/scroll 加在 <Table> 上（JSX 子元素 Column/ColumnGroup 仅声明列，不接虚拟化）。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    >
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
            {tags.map((tag) => (
              <Tag color={tagColor(tag)} key={tag}>
                {tag.toUpperCase()}
              </Tag>
            ))}
          </Flex>
        )}
      />
      <Column
        title="Action"
        key="action"
        render={(_: any, record: RecordType) => (
          <Space size="middle">
            <a>Invite {record.lastName}</a>
            <a>Delete</a>
          </Space>
        )}
      />
    </Table>
  )
}

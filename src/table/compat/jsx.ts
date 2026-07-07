/**
 * JSX 风格 API 列类型（按业务域从 compatTypes.ts 拆出）。
 *
 * `<Table.Column>` / `<Table.ColumnGroup>` 的 props（对齐 antd v6）。
 */

import type { ReactElement } from 'react'
import type { ColumnType } from './column'

/**
 * JSX 风格 API：`<Table.Column>` 单列声明组件的 props（对齐 antd v6 `ColumnProps`）。
 *
 * **语义**：`<Table.Column>` 是 `columns` prop 的语法糖——它本身**不渲染 DOM**（渲染 null），
 * 仅作为 `<Table>` JSX 子元素声明一列。Table 适配层用 React.Children 遍历 JSX 子元素，
 * 把每个 `<Table.Column>` 的 props（除 children）转换为 ColumnType 对象，等价于传 `columns` prop。
 *
 * props = `ColumnType<RecordType>` 全部字段（title/dataIndex/key/render/width/align/fixed/...）。
 * `children` 字段**禁止**（Column 是叶子列；多级表头用 `<Table.ColumnGroup>`）——与 antd v6
 * `ColumnProps` 一致（`children?: null`）。
 *
 * 用法（与 antd jsx demo 一致）：
 * ```tsx
 * <Table dataSource={data}>
 *   <Table.Column title="Name" dataIndex="name" key="name" />
 *   <Table.Column title="Age" dataIndex="age" key="age" />
 * </Table>
 * ```
 *
 * **与 columns prop 关系**（决策：columns 或 children 二选一）：
 *   - 传 `columns` prop：走 columns 路径（所有现有 demo，零回归）。
 *   - 不传 `columns` prop 但传 JSX children：走 children 解析路径。
 *   - 两者都传：`columns` 优先（JSX children 被忽略；与 antd `columns || convertChildrenToColumns` 一致）。
 */
export interface ColumnProps<RecordType = any> extends Omit<ColumnType<RecordType>, 'children'> {
  /** Column 是叶子列，禁止 children（用 ColumnGroup 表达多级表头）。 */
  children?: null
}

/**
 * JSX 风格 API：`<Table.ColumnGroup>` 分组列声明组件的 props（对齐 antd v6 `ColumnGroupProps`）。
 *
 * **语义**：`<Table.ColumnGroup>` 声明一个**多级表头分组列**（`columns[].children` 的 JSX 等价物）。
 * 其 `children` 是一个或多个 `<Table.Column>`（或嵌套 `<Table.ColumnGroup>`，支持任意深度）。
 * Table 适配层把 ColumnGroup 转换为 `{ title, ...rest, children: [...] }`（复用多级表头渲染）。
 *
 * props：
 *   - `title`：分组列表头文案（与 ColumnType.title 同义）。
 *   - `children`：分组内的列声明（Column / ColumnGroup 的 ReactElement 数组）。
 *   - 其余 ColumnType 字段（key/align/fixed/...）按需透传（与 antd 一致：ColumnGroupProps extends
 *     Omit<ColumnType,'children'>，data-grid 同构）。
 *
 * 用法（与 antd jsx demo 一致）：
 * ```tsx
 * <Table dataSource={data}>
 *   <Table.ColumnGroup title="Name">
 *     <Table.Column title="First Name" dataIndex="firstName" key="firstName" />
 *     <Table.Column title="Last Name" dataIndex="lastName" key="lastName" />
 *   </Table.ColumnGroup>
 * </Table>
 * ```
 *
 * **与多级表头复用**：ColumnGroup 转换出的 `{ title, children: [...] }` 结构与
 * `columns[].children` 嵌套完全一致，直接复用多级表头渲染（引擎无需感知 JSX 来源）。
 */
export interface ColumnGroupProps<RecordType = any> extends Omit<ColumnType<RecordType>, 'children'> {
  /** 分组内的列声明（Column / ColumnGroup 的 ReactElement；可单个或数组，支持任意深度嵌套）。 */
  children:
    | ReactElement<ColumnProps<RecordType>>
    | Array<ReactElement<ColumnProps<RecordType>>>
}

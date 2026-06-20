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
 *   - `Table.Column` / `Table.ColumnGroup` 静态属性，均为渲染 null 的数据载体组件。
 *   - Table 适配层 `convertChildrenToColumns`：当**未传 `columns` prop** 时，用 React.Children
 *     遍历 JSX 子元素，把 Column 的 props 转为 ColumnType、ColumnGroup 转为 `{ title, children: [...] }`。
 *   - **columns 或 children 二选一**：传 columns 走 columns 路径；不传 columns 但传 JSX children
 *     走解析路径（本 demo）。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（`const { Column, ColumnGroup } = Table`
 *   从 data-grid Table 静态属性解构；Flex/Tag/Space 用 antd 控件——jsx demo 改造前已用 antd）。
 * - **右栏（antd Table）**：忠实复刻 antd jsx demo（`const { Column, ColumnGroup } = Table`
 *   从 antd Table 解构，antd `<Flex>`/`<Tag>`/`<Space>`）。
 * - **共享控制条**：`Bordered` 开关同时驱动两侧（antd jsx demo 原本无控制条，此处加一个最小
 *   开关便于对照）。
 * - **共享数据**：`RecordType` + `data` + `tagColor` 见 `_compare/jsx.shared.ts`。
 *
 * === 两侧保留的差异 ===
 *
 * - antd demo 的 `<Space size="medium">`：data-grid 用 antd Space 的 `size="middle"`
 *   （antd v6 Space size 类型为 `'small'|'middle'|'large'|number`，无 'medium'；antd jsx demo
 *   写 'medium' 实为 v6 别名兼容，data-grid 显式用规范的 'middle'）。**右栏忠实 antd demo 用
 *   'medium'**（antd 侧 antd 自家兼容别名）。
 */

import { useState } from 'react'
import { Flex, Space, Switch, Table as AntdTable, Tag } from 'antd'
import { Table } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, tagColor, type RecordType } from './_compare/jsx.shared'

// 左栏：从 data-grid Table 解构 Column/ColumnGroup（对齐 antd demo 写法）。
const { Column, ColumnGroup } = Table
// 右栏：从 antd Table 解构 Column/ColumnGroup（忠实 antd demo）。
const {
  Column: AntdColumn,
  ColumnGroup: AntdColumnGroup,
} = AntdTable

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function JsxDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </div>

      {/*
        minPaneWidth=480（窄表，5 列含 Name 分组 → 6 叶子列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType> dataSource={data} bordered={bordered}>
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
        }
        right={
          /* 忠实复刻 antd jsx demo：antd Table + antd Column/ColumnGroup + size="medium" */
          <AntdTable<RecordType> dataSource={data} bordered={bordered}>
            <AntdColumnGroup title="Name">
              <AntdColumn title="First Name" dataIndex="firstName" key="firstName" />
              <AntdColumn title="Last Name" dataIndex="lastName" key="lastName" />
            </AntdColumnGroup>
            <AntdColumn title="Age" dataIndex="age" key="age" />
            <AntdColumn title="Address" dataIndex="address" key="address" />
            <AntdColumn
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
            <AntdColumn
              title="Action"
              key="action"
              render={(_: any, record: RecordType) => (
                <Space size="medium">
                  <a>Invite {record.lastName}</a>
                  <a>Delete</a>
                </Space>
              )}
            />
          </AntdTable>
        }
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd jsx demo，
          两侧均用 JSX <code>&lt;Table.Column&gt;</code>/<code>&lt;Table.ColumnGroup&gt;</code> 子元素声明列。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>ColumnGroup 多级表头</strong>：两侧均支持「Name」分组下含 First/Last Name
              （复用 M1）。
            </li>
            <li>
              <strong>Space size</strong>：左栏 data-grid 用 <code>size="middle"</code>（antd v6
              规范值）；右栏 antd 用 <code>size="medium"</code>（antd demo 原样，v6 别名兼容）。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧边框。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

import { Typography } from 'antd'
import {
  DocsDataGrid,
} from '../components'

const { Text } = Typography

export interface DeprecatedRow {
  key: string
  member: string
  support: string
  behavior: string
  migration: string
}

export const deprecatedRows: DeprecatedRow[] = [
  {
    key: 'rendered-cell',
    member: 'column.render 返回 { children, props }',
    support: '部分兼容',
    behavior: '识别 render 返回的 `{ children, props }` 旧形态，但只渲染 children；props 不会应用到单元格。',
    migration: '返回普通 ReactNode；合并格和单元格 props 改用 column.onCell。',
  },
  {
    key: 'rendered-cell-props',
    member: 'RenderedCell.props',
    support: '保留类型但忽略',
    behavior: 'props 字段仍在类型里，但 data-grid 不会合并到单元格。',
    migration: '不要在 render 返回对象中放 colSpan、rowSpan、className、style 或事件。',
  },
  {
    key: 'on-select-multiple',
    member: 'rowSelection.onSelectMultiple',
    support: '兼容触发',
    behavior: 'antd v6 已标记 deprecated；shift range 多选时仍按 (selected, selectedRows, changeRows) 调用。',
    migration: '新逻辑优先用 rowSelection.onChange，并读取 info.type === "multiple"。',
  },
  {
    key: 'expanded-row-offset',
    member: 'expandable.expandedRowOffset',
    support: '兼容支持',
    behavior: '按数值调整展开内容的起始列；非法值、负数和越界值会自动修正到有效范围。',
    migration: '用 Table.EXPAND_COLUMN 在 columns 中控制展开列位置。',
  },
  {
    key: 'filter-checkall',
    member: 'locale.filterCheckall',
    support: '兼容别名',
    behavior: '读取顺序为 filterCheckall ?? filterCheckAll ?? 默认文案。',
    migration: '改用 locale.filterCheckAll。',
  },
  {
    key: 'fixed-true',
    member: 'column.fixed: true',
    support: '旧写法兼容',
    behavior: '按左固定处理。',
    migration: '明确写 fixed: "left" / "start" 或 fixed: "right" / "end"。',
  },
  {
    key: 'filter-dropdown-open',
    member: 'column.filterDropdownOpen',
    support: '不提供',
    behavior: 'data-grid 不提供这个过时字段。',
    migration: '使用 column.filterDropdownProps.open。',
  },
  {
    key: 'filter-dropdown-open-change',
    member: 'column.onFilterDropdownOpenChange',
    support: '不提供',
    behavior: 'data-grid 不提供这个过时回调字段。',
    migration: '使用 column.filterDropdownProps.onOpenChange。',
  },
]

export function DeprecatedMembersTable() {
  return (
    <DocsDataGrid<DeprecatedRow>
      columns={[
        { title: '成员', dataIndex: 'member', key: 'member', width: 280, render: (value) => <Text code>{value}</Text> },
        { title: '支持', dataIndex: 'support', key: 'support', width: 140 },
        { title: 'data-grid 行为', dataIndex: 'behavior', key: 'behavior', width: 440 },
        { title: '迁移建议', dataIndex: 'migration', key: 'migration', width: 420 },
      ]}
      dataSource={deprecatedRows}
      rowKey="key"
      scrollX={1280}
    />
  )
}

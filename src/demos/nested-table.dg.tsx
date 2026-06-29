/**
 * nested-table demo 的 data-grid 段（左栏），从 nested-table.tsx 拆出。
 *
 * - props 驱动 `{ size, virtual }`（由 nested-table.tsx 父组件传）：
 *   * size：主表 size（'large'/'medium'/'small'，由父控制条 Segmented 切换，同一档同时驱动两侧）。
 *   * virtual：全局虚拟化开关（仅外层主表，内层子表保持非虚拟）。
 * - 自包含：含 `dgColumns`（主表 7 列）+ `dgExpandColumns`（嵌套子表 5 列）+
 *   `dgExpandable`（expandedRowRender 返回**嵌套子 data-grid <Table>** + defaultExpandedRowKeys: ['0']）+
 *   内联 `DownOutlined`（避免依赖 @ant-design/icons）+ `<Table>` JSX。
 * - 行为与改造前一致：嵌套子表是独立 data-grid `<Table>`（独立 grid 上下文，与主表正交），
 *   M9 引擎把 expandedRowRender 返回内容放进 `dg-row-expanded` div（grid-column:1/-1 跨整行）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/nested-table.shared'`），源码可原样展示无需路径改写。
 */
import { Badge, Dropdown, Space } from 'antd'
import { Table } from '../table'
import type { ColumnType, Expandable } from '../table'
import {
  dataSource,
  expandDataSource,
  items,
  type ExpandedDataType,
  type RecordType,
} from './_compare/nested-table.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgExpandColumns: ColumnType<ExpandedDataType>[] = [
  { title: 'Date', dataIndex: 'date', key: 'date' },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  {
    title: 'Status',
    key: 'state',
    render: () => <Badge status="success" text="Finished" />,
  },
  { title: 'Upgrade Status', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  {
    title: 'Action',
    key: 'operation',
    render: () => (
      <Space size="middle">
        <a>Pause</a>
        <a>Stop</a>
        <Dropdown menu={{ items }}>
          <a>
            More <DownOutlined />
          </a>
        </Dropdown>
      </Space>
    ),
  },
]

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Platform', dataIndex: 'platform', key: 'platform' },
  { title: 'Version', dataIndex: 'version', key: 'version' },
  { title: 'Upgraded', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  { title: 'Creator', dataIndex: 'creator', key: 'creator' },
  { title: 'Date', dataIndex: 'createdAt', key: 'createdAt' },
  { title: 'Action', key: 'operation', render: () => <a>Publish</a> },
]

// ---------------------------------------------------------------------------
// expandable（嵌套子 Table + defaultExpandedRowKeys）—— defaultExpandedRowKeys
// 是配置型初值（非受控），随 expandable 派生即可；父控制条不直接操作它，无需提升父。
// ---------------------------------------------------------------------------

const dgExpandable: Expandable<RecordType> = {
  // 嵌套子 Table 是 data-grid <Table>（独立 grid 上下文，与主表正交）。
  expandedRowRender: () => (
    <Table<ExpandedDataType>
      columns={dgExpandColumns}
      dataSource={expandDataSource}
      pagination={false}
    />
  ),
  defaultExpandedRowKeys: ['0'],
}

/**
 * 内联 DownOutlined（More 链接右侧的小箭头）——避免直接依赖 @ant-design/icons
 * （仅 antd 间接依赖，与 custom-filter-panel / drag-sorting-handler 约定一致）。
 * SVG 路径取自 ant-design-icons DownOutlined。
 */
function DownOutlined() {
  return (
    <svg
      viewBox="64 64 896 896"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ verticalAlign: '-0.125em' }}
    >
      <path d="M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z" />
    </svg>
  )
}

// ★ size 默认值用 'large'（配置型 state，父控制条 Segmented 切换；初值 large 对齐改造前与
//   antd demo 默认）。编辑模式 SplitDemoPreview 的 propsFor 超集 {bordered,virtual,size,autoScroll}
//   含 size，会传入；但作为兜底默认值也需合理有效（'large' 合法）。
export default function NestedTableDg({
  size = 'large',
  virtual = false,
}: {
  size: 'large' | 'medium' | 'small'
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      expandable={dgExpandable}
      dataSource={dataSource}
      size={size}
      // 主表 pagination={{}} 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination）。
      // 子表（dgExpandable.expandedRowRender）pagination={false} 与右栏 antd 子表一致。
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         给的限高，虚拟窗口才有滚动区）；OFF 时回 undefined，行为与改造前一致。
         ★ 仅外层主表接入；内层子表（dgExpandable.expandedRowRender 返回的 <Table>）保持非虚拟、不动。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

/**
 * nest-table-border-debug demo 的 antd 段（右栏），从 nest-table-border-debug.tsx 拆出。
 *
 * - props 驱动 `{ rootTableBordered, childTableBordered, virtual }`（与左栏 dg 子组件同款，由父组件传）：
 *   * rootTableBordered：主表 bordered 开关（同一组 state 同时驱动两侧主表）。
 *   * childTableBordered：子 Table bordered 开关（同一组 state 同时驱动两侧子表）。
 *   * virtual：全局虚拟化开关（仅外层主表）。
 * - 自包含：含 `antdExpandedColumns`（嵌套子表 5 列）+ `antdColumns`（主表 7 列）+
 *   `antdExpandable`（expandedRowRender 返回**真实 antd <Table>**，子 Table bordered 由
 *   childTableBordered 驱动）+ 内联 `DgDownOutlined`（与左栏共用同一内联 SVG）+ `<AntdTable>` JSX。
 * - 忠实复刻 antd nest-table-border-debug demo：antd `<Table>` 主表 + antd `<Table>` 子表。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/nest-table-border-debug.shared'`）。
 *
 * ★ DownOutlined 说明：antd demo 原用 `@ant-design/icons` 的 `DownOutlined`，但为两侧共用
 *   同一内联 SVG（与 nested-table / custom-filter-panel 约定一致——避免直接依赖
 *   @ant-design/icons，仅 antd 间接依赖），此处右栏同样用内联 `DgDownOutlined`。
 */
import { Badge, Dropdown, Space, Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import {
  dataSource,
  expandedDataSource,
  items,
  type ExpandedDataType,
  type RecordType,
} from './_compare/nest-table-border-debug.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd nest-table-border-debug demo
// ---------------------------------------------------------------------------

const antdExpandedColumns: TableColumnsType<ExpandedDataType> = [
  { title: 'Date', dataIndex: 'date', key: 'date' },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  {
    title: 'Status',
    key: 'state',
    render: () => (
      <span>
        <Badge status="success" />
        Finished
      </span>
    ),
  },
  { title: 'Upgrade Status', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  {
    title: 'Action',
    dataIndex: 'operation',
    key: 'operation',
    render: () => (
      <Space size="medium">
        <a>Pause</a>
        <a>Stop</a>
        <Dropdown menu={{ items }}>
          <a>
            More <DgDownOutlined />
          </a>
        </Dropdown>
      </Space>
    ),
  },
]

const antdColumns: TableColumnsType<RecordType> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Platform', dataIndex: 'platform', key: 'platform' },
  { title: 'Version', dataIndex: 'version', key: 'version' },
  { title: 'Upgraded', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  { title: 'Creator', dataIndex: 'creator', key: 'creator' },
  { title: 'Date', dataIndex: 'createdAt', key: 'createdAt' },
  { title: 'Action', key: 'operation', render: () => <a>Publish</a> },
]

// ---------------------------------------------------------------------------
// 内联 DownOutlined（More 链接右侧的小箭头）——与左栏共用同一内联 SVG，
// 避免直接依赖 @ant-design/icons（仅 antd 间接依赖）。SVG 路径取自 ant-design-icons。
// ---------------------------------------------------------------------------

function DgDownOutlined() {
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

// ★ props 默认值用 true（配置型 state，父控制条 Switch 直接操作；初值 true 对齐改造前与
//   antd demo 默认）。编辑模式 SplitDemoPreview 的 propsFor 超集 {bordered,virtual,size,autoScroll}
//   含 bordered，会传入；但作为兜底默认值也需合理有效（true 合法、初展开即见父子边框对比）。
export default function NestTableBorderDebugAntd({
  rootTableBordered = true,
  childTableBordered = true,
  virtual = false,
}: {
  rootTableBordered: boolean
  childTableBordered: boolean
  virtual: boolean
}) {
  // 与 antd demo 逐字一致（expandedRowRender 闭包捕获 childTableBordered）。
  const antdExpandable: NonNullable<TableProps<RecordType>['expandable']> = {
    expandedRowRender: () => (
      <AntdTable<ExpandedDataType>
        columns={antdExpandedColumns}
        dataSource={expandedDataSource}
        pagination={false}
        bordered={childTableBordered}
      />
    ),
  }

  return (
    <AntdTable<RecordType>
      title={() => 'cool'}
      footer={() => 'cool'}
      columns={antdColumns}
      expandable={antdExpandable}
      dataSource={dataSource}
      bordered={rootTableBordered}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:300（antd 不认 true，数字像素高度）；
         OFF 时回 undefined，行为与改造前一致。
         ★ 仅外层主表接入；内层子表（expandedRowRender 返回的 <AntdTable>）保持非虚拟、不动。 */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}

/**
 * nested-table demo 的 antd 段（右栏），从 nested-table.tsx 拆出。
 *
 * - props 驱动 `{ size, virtual }`（与左栏 dg 子组件同款，由 nested-table.tsx 父组件传）：
 *   * size：主表 size（'large'/'medium'/'small'，同一档同时驱动两侧）。
 *   * virtual：全局虚拟化开关（仅外层主表）。
 * - 自包含：含 `antdColumns`（主表 7 列）+ `antdExpandColumns`（嵌套子表 5 列）+
 *   `antdExpandable`（expandedRowRender 返回**真实 antd <Table>** + defaultExpandedRowKeys: ['0']）+
 *   `<AntdTable>` JSX。
 * - 忠实复刻 antd nested-table demo：antd `<Table>` 主表 + antd `<Table>` 子表 +
 *   antd `<DownOutlined>`（@ant-design/icons，antd 间接依赖，本就可用）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'@ant-design/icons'` / `'./_compare/nested-table.shared'`）。
 */
import { Badge, Dropdown, Space, Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import {
  dataSource,
  expandDataSource,
  items,
  type ExpandedDataType,
  type RecordType,
} from './_compare/nested-table.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd nested-table demo
// ---------------------------------------------------------------------------

const antdExpandColumns: TableColumnsType<ExpandedDataType> = [
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
      <Space size="medium">
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
// expandable（嵌套子 Table + defaultExpandedRowKeys）—— defaultExpandedRowKeys
// 是配置型初值（非受控），随 expandable 派生即可；父控制条不直接操作它，无需提升父。
// ---------------------------------------------------------------------------

const antdExpandable: NonNullable<TableProps<RecordType>['expandable']> = {
  // 嵌套子 Table 是真实 antd <Table>（与 antd demo 逐字一致）。
  expandedRowRender: () => (
    <AntdTable<ExpandedDataType>
      columns={antdExpandColumns}
      dataSource={expandDataSource}
      pagination={false}
    />
  ),
  defaultExpandedRowKeys: ['0'],
}

// ★ size 默认值用 'large'（配置型 state，父控制条 Segmented 切换；初值 large 对齐改造前与
//   antd demo 默认）。编辑模式 SplitDemoPreview 的 propsFor 超集 {bordered,virtual,size,autoScroll}
//   含 size，会传入；但作为兜底默认值也需合理有效（'large' 合法）。
export default function NestedTableAntd({
  size = 'large',
  virtual = false,
}: {
  size: 'large' | 'medium' | 'small'
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      expandable={antdExpandable}
      dataSource={dataSource}
      size={size}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:300（antd 不认 true，需数字像素高度；
         OFF 时回 undefined，行为与改造前一致）。
         ★ 仅外层主表接入；内层子表（antdExpandable.expandedRowRender 返回的 <AntdTable>）保持非虚拟、不动。 */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}

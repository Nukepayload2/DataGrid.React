/**
 * 复刻 antd `nest-table-border-debug` demo：
 *   `G:\Projects\ant-design\components\table\demo\nest-table-border-debug.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——主表 + expandedRowRender 返回嵌套子
 *   data-grid `<Table>`（独立 grid 上下文，与主表正交）；主表/子表的 `bordered` 各自独立
 *   受共享 state 驱动（M9 expandedRowRender 渲染任意 ReactNode + S26 bordered 是每张 Table
 *   自身 prop，天然隔离）。
 * - **右栏（antd Table）**：忠实复刻 antd nest-table-border-debug demo（antd `<Table>` 主表 +
 *   expandedRowRender 返回真实 antd `<Table>` 子表 + `createExpandedRowRender(bordered)` 闭包）。
 * - **共享状态 + 控制条**：`rootTableBordered` / `childTableBordered` 两个 Switch，
 *   **同一组 state 同时驱动两侧主表 + 子表**（决策 9 双驱动——两侧主表/子表 bordered 同步切换）。
 * - **共享数据**：`RecordType` + `ExpandedDataType` + `dataSource` + `expandedDataSource`
 *   + `items` 见 `_compare/nest-table-border-debug.shared.ts`。
 *
 * === D1 边界/隔离用例：嵌套表格父子 bordered 隔离 ===
 *
 * **目标**：验证 M9 expandedRowRender 嵌套子 Table + S26 bordered 的**父子隔离**——
 * 主表 `bordered` 与子 Table `bordered` **各自独立**（父表开 bordered 不强制子表，反之亦然）。
 *
 * === antd demo 要素 ===
 *
 * - 顶部 Form（inline）含两个 Switch：
 *     * `Root Table Bordered`：主表 bordered 开关。
 *     * `Child Table Bordered`：子 Table bordered 开关。
 * - 主表 7 列：Name / Platform / Version / Upgraded / Creator / Date / Action（Publish 链接），
 *   `title={() => 'cool'}` + `footer={() => 'cool'}`。
 * - `expandable.expandedRowRender`：返回嵌套子 `<Table>`（5 列：Date / Name /
 *   Status(Badge "Finished") / Upgrade Status / Action(Pause/Stop 链接 + More 下拉 Dropdown)），
 *   `pagination={false}`，子 Table 的 `bordered` 由 `childTableBordered` state 驱动。
 * - 3 行主表数据 + 3 行子表数据（固定 mock）。
 *
 * === 两侧保留的差异 ===
 *
 * - **嵌套子表实现**：左栏子表是 data-grid `<Table>`（独立 grid 上下文）；右栏子表是真实 antd `<Table>`。
 * - **DownOutlined**：两侧均使用同一内联 SVG 组件（`@ant-design/icons` 未在 package.json 声明，
 *   仅 antd 间接依赖，与 nested-table / custom-filter-panel 约定一致——两侧共用 inline SVG 替代直接 import）。
 * - **Space size**：antd demo 用 `size="medium"`（antd v6 兼容别名），左栏 data-grid demo 用 `'middle'`。
 *
 * === 验证点（D1 + 决策 9）===
 *
 * 1. 顶部两个 Switch 同时切换两侧主表/子表 bordered。
 * 2. 两侧主表 bordered 开、子表 bordered 关：两侧主表有外边框+竖线、展开后子表无边框（视觉对比明显）。
 * 3. 两侧主表 bordered 关、子表 bordered 开：两侧主表无边框、子表有边框（隔离验证）。
 * 4. 两侧 title 'cool' / footer 'cool' 始终在主表上下（与 antd 一致）。
 */

import { useState } from 'react'
import { Badge, Dropdown, Form, Space, Switch, Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType, Expandable } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
// 全局虚拟化开关接入：开关 ON 时主表叠加 virtual + scroll.y（子表是展开内容，不动）
import { useVirtualization } from './VirtualizationContext'
import {
  dataSource,
  expandedDataSource,
  items,
  type ExpandedDataType,
  type RecordType,
} from './_compare/nest-table-border-debug.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgExpandedColumns: ColumnType<ExpandedDataType>[] = [
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
      <Space size="middle">
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

/**
 * 左栏内联 DownOutlined（More 链接右侧的小箭头）——避免直接依赖 @ant-design/icons
 * （仅 antd 间接依赖，与 nested-table / custom-filter-panel 等约定一致）。
 * SVG 路径取自 ant-design-icons DownOutlined。
 */
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

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function NestTableBorderDebugDemo() {
  // D1 核心：父子 bordered 各自受控（独立 Switch）——两侧共享同一组 state。
  const [rootTableBordered, setRootTableBordered] = useState(true)
  const [childTableBordered, setChildTableBordered] = useState(true)
  // 全局虚拟化开关接入：开关 ON 时主表叠加 virtual=true + scroll.y（子表是展开内容，不动）
  const { virtual } = useVirtualization()

  // 左栏（data-grid）expandable：expandedRowRender 闭包捕获 childTableBordered，
  // 切换 Switch 时主表 columnTree 重建，子 Table 用新 bordered 重新渲染
  // （M9 expandedRowRender 渲染任意 ReactNode 的天然能力）。
  const dgExpandable: Expandable<RecordType> = {
    expandedRowRender: () => (
      <Table<ExpandedDataType>
        columns={dgExpandedColumns}
        dataSource={expandedDataSource}
        pagination={false}
        bordered={childTableBordered}
      />
    ),
  }

  // 右栏（antd）expandable：与 antd demo 逐字一致（createExpandedRowRender(bordered)() 闭包）。
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
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。两个 Switch 同时驱动两侧主表/子表 bordered。 */}
      <Form
        layout="inline"
        className="table-demo-control-bar"
        style={{ marginBottom: 16 }}
      >
        <Form.Item label="Root Table Bordered">
          <Switch
            checked={rootTableBordered}
            onChange={(v) => setRootTableBordered(v)}
          />
        </Form.Item>
        <Form.Item label="Child Table Bordered">
          <Switch
            checked={childTableBordered}
            onChange={(v) => setChildTableBordered(v)}
          />
        </Form.Item>
      </Form>

      {/*
        minPaneWidth=480（嵌套子表内容稍宽，主表 7 列 + 子表 5 列无 scroll.x）→
        横排阈值 ≈ 976。常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            title={() => 'cool'}
            footer={() => 'cool'}
            columns={dgColumns}
            expandable={dgExpandable}
            dataSource={dataSource}
            bordered={rootTableBordered}
            // ★ 对齐右栏 antd 默认分页（校准事实 1：antd 对任意行数都渲染 .ant-pagination
            //   disabled 态分页条；data-grid omit=不渲染）。主表补 pagination={{}} 启用默认分页器。
            //   子表（expandedRowRender 内）两侧均 pagination={false}，不动。
            pagination={{}}
            /* 全局虚拟化开关接入：ON 时主表 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
               给的限高，虚拟窗口才有滚动区）；OFF 时回 undefined，行为与改造前一致。
               ★ 仅主表接入——子表是 expandedRowRender 展开内容，不动。 */
            virtual={virtual}
            scroll={virtual ? { y: true } : undefined}
          />
        }
        right={
          <AntdTable<RecordType>
            title={() => 'cool'}
            footer={() => 'cool'}
            columns={antdColumns}
            expandable={antdExpandable}
            dataSource={dataSource}
            bordered={rootTableBordered}
            /* 全局虚拟化开关接入：ON 时主表 virtual=true + scroll.y:300（antd 不认 true，数字像素高度）；
               OFF 时回 undefined，行为与改造前一致。
               ★ 仅主表接入——子表是 expandedRowRender 展开内容，不动。 */
            virtual={virtual}
            scroll={virtual ? { y: 300 } : undefined}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B20 / D1 嵌套表格父子 bordered 隔离）：</strong>
          左右并排呈现 data-grid 与 antd nest-table-border-debug demo（主表 +
          expandedRowRender 子 Table，父子 bordered 各自独立 Switch）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>父子 bordered 隔离</strong>：主表 <code>bordered</code> 与
              expandedRowRender 内子 Table 的 <code>bordered</code> 各自独立。
              切换 Root Switch 仅影响主表外边框/竖线；切换 Child Switch 仅影响子表边框。
            </li>
            <li>
              <strong>双驱动</strong>：同一组 <code>rootTableBordered</code> /
              <code> childTableBordered</code> state 同时驱动两侧主表 + 子表，
              <strong> 两侧同步切换</strong>（点任一 Switch，两侧主表/子表同时变化）。
            </li>
            <li>
              <strong>嵌套子表实现</strong>：左栏子表是 data-grid
              <code>&lt;Table&gt;</code>（独立 grid 上下文，与主表正交，引擎零改动）；
              右栏子表是真实 antd <code>&lt;Table&gt;</code>。
            </li>
            <li>
              <strong>title/footer</strong>：两侧主表{' '}
              <code>{"title={() => 'cool'}"}</code>
              {' + '}
              <code>{"footer={() => 'cool'}"}</code>（始终在主表上下，与 antd 一致）。
            </li>
            <li>
              <strong>DownOutlined</strong>：两侧均使用同一内联 SVG 组件
              （<code>@ant-design/icons</code> 未在 package.json 声明，仅 antd 间接依赖，
              与 nested-table / custom-filter-panel 约定一致）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

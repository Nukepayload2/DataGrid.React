/**
 * 分页 placement demo（决策 9 双栏对照 / S11 分页集成与位置 / task #28 重做）。
 *
 * === 与 antd 官方 demo 的区别（★ task #28 核心改动）===
 *
 * antd 官方 pagination demo（`components/table/demo/pagination.tsx`）用
 * `placement:[top, bottom]` 双翻页器 + 两个 `Radio.Group`（top / bottom）分别选
 * 顶部/底部位置，纯粹为演示 v6 数组语义同时渲染两个分页器。**这不是正常用法**。
 *
 * **正常用法**：单个翻页器 + 6 种位置互斥选一。本 demo 改为：
 *
 *   - 顶部**一个** `Radio.Group`，6 个 placement 选项互斥选一：
 *     `topStart / topCenter / topEnd / bottomStart / bottomCenter / bottomEnd`
 *     （外加 `none` 关闭分页器）。
 *   - 选中 → `pagination={{ placement: [selected] }}`（数组单元素 = 单翻页器
 *     在该位置渲染）。
 *   - **默认 `bottomEnd`**（antd Table 真实默认：单翻页器右下角）。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：显式传 `pagination` 对象启用分页（data-grid 默认不分页，
 *   §9 已知差异）。placement 单元素数组驱动单翻页器位置。
 * - **右栏（antd Table）**：antd 原生 `<Table>` + 同款 pagination + 同款 placement 单元素数组。
 * - **共享控制条**：顶部一个 `Radio.Group`（6 位置 + none 互斥），**同一组 state
 *   同时驱动两侧**（切换 placement，左右两侧分页器位置同步 diff）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/pagination.shared.ts`，两侧复用。
 *
 * === antd demo 要素（沿用）===
 *
 * - columns：Name（render `<a>`）/ Age / Address / Tags（Tag，颜色按 tag 长度/kawaii 区分）/
 *   Action（Invite/Delete 链接）。
 * - 3 行数据（John Brown / Jim Green / Joe Black）。
 *
 * === antd Table pagination 默认值核对（task #28）===
 *
 * 读 antd 源码确认（`components/table/interface.ts` + `components/pagination/index.*.md`）：
 *   - `TablePaginationConfig extends PaginationProps`，`placement?: TablePaginationPlacement[]`。
 *   - `defaultCurrent` 默认 **1**；`defaultPageSize` 默认 **10**（antd Pagination 文档明确）。
 *   - placement 数组缺省时 antd Table 渲染单翻页器于底部右对齐（即 `['bottomEnd']` 语义）。
 * data-grid 同款默认（`types.ts` 注释一致），demo 显式传 pagination 对象即可，无需覆盖
 * defaultCurrent/defaultPageSize（让两侧贴近 antd 真实默认，对照有意义）。
 *
 * === data-grid placement（v6 数组，单元素 = 单翻页器）===
 *
 *   - 数组元素 ∈ 'topStart'|'topCenter'|'topEnd'|'bottomStart'|'bottomCenter'|'bottomEnd'|'none'。
 *   - 取"含 'top' 的首个元素"→顶部 + 对齐；"含 'bottom' 的首个元素"→底部 + 对齐。
 *   - 单元素数组（如 `['bottomEnd']`）→ 仅一个分页器在该位置。
 *   - 'none'（单独）→ 该侧不显示 → 全表无分页器。
 *   - 对齐映射：含 'center'→居中；含 'start'/'left'→左；否则→右。
 *
 * === 两侧保留的差异 ===
 *
 * - demo 改造为「正常用法」（单翻页器 6 位置互斥），与 antd 官方 demo 的双翻页器数组演示不同。
 *   data-grid `pagination` prop 签名对齐 antd v6 `TablePaginationConfig`；默认不分页是
 *   §9 已知差异（本 demo 显式传 pagination 启用）。
 * - pageSize 默认 10 → 3 行 1 页，分页器仍渲染以演示 placement 位置切换。
 *
 * === 验证点（task #28 / S11 / 决策 9）===
 *
 * 1. 默认 placement=bottomEnd → 两侧底部右对齐各一个分页器（单翻页器，无顶部翻页器）。
 * 2. 切 → topStart → 两侧顶部左对齐单翻页器（顶部位置，无底部翻页器）。
 * 3. 切 → topCenter / topEnd / bottomStart / bottomCenter → 两侧分页器同步移动到对应位置。
 * 4. 切 → none → 两侧均不显示分页器（全表数据仍渲染）。
 * 5. 两侧位置始终同步（同一 state 驱动），diff 仅在实现细节（Tag/Space 等），位置无差异。
 * 6. 回归：basic/head 等未传 pagination 的 demo 仍全显无分页器。
 */

import { useState } from 'react'
import { Flex, Radio, Space, Table as AntdTable, Tag } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type {
  ColumnType,
  TablePaginationPlacement,
} from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { data, type RecordType } from './_compare/pagination.shared'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高）
import { useVirtualization } from './VirtualizationContext'

// ---------------------------------------------------------------------------
// placement 单选选项（6 位置互斥 + none 关闭）
// ---------------------------------------------------------------------------

/**
 * 单翻页器 placement 互斥选项（task #28）。
 *
 * 6 个位置（top/bottom × Start/Center/End）+ none（关闭分页器）。
 * 选中后以 `placement: [selected]` 单元素数组传给两侧表格。
 */
const placementOptions: Array<{ label: string; value: TablePaginationPlacement }> = [
  { label: 'topStart', value: 'topStart' },
  { label: 'topCenter', value: 'topCenter' },
  { label: 'topEnd', value: 'topEnd' },
  { label: 'bottomStart', value: 'bottomStart' },
  { label: 'bottomCenter', value: 'bottomCenter' },
  { label: 'bottomEnd', value: 'bottomEnd' },
  { label: 'none', value: 'none' },
]

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (tags: string[]) => (
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
    ),
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="middle">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    ),
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd pagination demo 列定义
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (tags: string[]) => (
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
    ),
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="medium">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    ),
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function PaginationDemo() {
  // ★ 共享状态：单个 placement 互斥选一（6 位置 + none），同时驱动两侧 pagination。
  // 默认 bottomEnd（antd Table 真实默认：单翻页器右下角）。
  const [placement, setPlacement] = useState<TablePaginationPlacement>('bottomEnd')
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y（分页条在滚动区下方，wrapper
  // 含分页高，SplitDemo 限高让虚拟窗口有滚动区）。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/*
        ★ 顶部全宽控制条：一个 Radio.Group（6 位置 + none 互斥）作为共享控制条全宽置于 SplitDemo 上方。
        同一组 state（placement）同时驱动两侧 pagination.placement（单元素数组 = 单翻页器）。
        DemoToolbar 用 useToken（light≈#fff/#f0f0f0、dark/自定义 token 自适应），替代硬编码底/边色。
      */}
      <DemoToolbar>
        <Radio.Group
          options={placementOptions}
          value={placement}
          onChange={(e) => setPlacement(e.target.value)}
        />
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，5 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            columns={dgColumns}
            pagination={{ placement: [placement] }}
            dataSource={data}
            /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
               限高，分页条在滚动区下方，wrapper 含分页高）；OFF 时回 undefined，行为与改造前一致。 */
            virtual={virtual}
            scroll={virtual ? { y: true } : undefined}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            pagination={{ placement: [placement] }}
            dataSource={data}
            /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 分页条画在 scroll.y 之外，
               需扣除表头~55 与分页条~64 → 约 280 才能塞进 ~400px pane；OFF 时回 undefined）。 */
            virtual={virtual}
            scroll={virtual ? { y: 280 } : undefined}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 task #28 / S11 分页 placement）：</strong>
          左右并排呈现 data-grid 与 antd 分页 demo。本 demo 演示
          <strong> 正常用法</strong>（单翻页器 + 6 种位置互斥选一），区别于 antd 官方 demo 的
          双翻页器数组演示。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>单翻页器 6 位置互斥</strong>：顶部一个 <code>Radio.Group</code>，
              选项 <code>topStart/topCenter/topEnd/bottomStart/bottomCenter/bottomEnd</code>
              互斥选一（外加 <code>none</code> 关闭），<strong>默认 bottomEnd</strong>
              （antd Table 真实默认：单翻页器右下角）。
            </li>
            <li>
              <strong>共享 placement</strong>：选中后以
              <code> pagination={'{'} placement: [selected] {'}'}</code>
              单元素数组传给两侧表格，**左右分页器位置同步**。
            </li>
            <li>
              <strong>★ data-grid 默认不分页</strong>（§9 已知差异）：本 demo 左栏显式传
              <code> pagination</code> 对象启用；其它未传 pagination 的 demo（basic/head/...）仍全显。
            </li>
            <li>
              <strong>antd 默认值核对</strong>：<code>defaultCurrent: 1</code>、
              <code> defaultPageSize: 10</code>（antd Pagination 文档），3 行 1 页，
              分页器仍渲染以演示 placement 位置切换。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

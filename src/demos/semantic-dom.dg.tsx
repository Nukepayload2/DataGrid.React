/**
 * semantic-dom demo 的 data-grid 段（左栏），从 semantic-dom.tsx 拆出。
 *
 * - 自包含：含 `dgColumns`（Personal Info 分组表头 + Name rowScope + Age sorter）/ `<Table>` JSX
 *   + 13 槽位 `dgClassNames` + `dgStyles`（每槽一种霓虹色 outline + data-slot 标注）+
 *   内部 sortOrder 态（点击 Age 表头排序后显示在表格下方）。
 * - 行为与改造前一致：13 槽位染色演示 + Age 列 sorter 演示 aria-sort 同步。
 *
 * === ★ 13 槽位 classNames/styles 染色配置搬入子组件 ===
 * 原父文件的 `dgClassNames` / `dgStyles`（霓虹色 outline）全部搬入本子组件。每槽一种霓虹色：
 *   root=#ff00ff / section=#00ffff / content=#ffff00 / title=#ff5500 / footer=#00ff55 /
 *   header.wrapper=#5500ff（dg 无 thead 容器→不渲染）/ header.row=#ff0055（B-impl 已补，透传到表头行所有 cell）/
 *   header.cell=#ff5555 / body.wrapper=#55ff00（dg 无 tbody 容器→不渲染）/ body.row=#0055ff（透传到表体行所有 cell）/
 *   body.cell=#5555ff / pagination.root=#ffaa00 / pagination.item=#aa00ff。
 * 用 inline style 而非依赖外部 CSS，确保 demo 自包含（无 CSS 文件依赖）。
 *
 * === ★ a11y / aria-sort 配置 ===
 * - Age 列 `sorter: true` + `showSorterTooltip: false`：点击表头时表头 aria-sort 在
 *   ascending ↔ descending ↔ （未设）循环（B-impl 已补，详见 docs/semantic-dom-compat.md）。
 * - Name 列 `rowScope: 'row'`：行表头语义演示（dg 渲染为 `<th scope="row">`，但 aria-rowheader
 *   受 dg 无行容器架构限制，仅 doc 记录天花板）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * 本 demo 父文件无共享控制条（virtualizable={false} 不接全局开关，无 Bordered/Size 等 Switch），
 * 故子组件无需父级 state prop。但仍声明 `{ bordered, virtual }` 兜底（编辑模式 propsFor 超集
 * {bordered,virtual,size,autoScroll} 会下发），默认值均合理有效：
 * - bordered=false（对齐改造前默认，本 demo 表格无边框）。
 * - virtual=false（OFF 回 undefined scroll，本 demo 展示完整 DOM 结构供 devtools 检视，不虚拟化）。
 * sortOrder 瞬时态由子组件内部自管（非受控，无父控制条操作），onChange 回写显示在表格下方。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/semantic-dom.shared'`），源码可原样展示无需路径改写。
 */
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Table } from '../table'
import type {
  ColumnType,
  TableClassNames,
  TableStyles,
} from '../table'
import { semanticData, type SemanticRecord } from './_compare/semantic-dom.shared'

// ---------------------------------------------------------------------------
// 13 槽位染色：每槽一种霓虹色 outline + className（与 antd 子组件逐字同款）。
// ---------------------------------------------------------------------------

// data-grid 侧 classNames（13 槽）。header.wrapper / body.wrapper 在 dg 渲染层无对应 DOM，
// 引擎忽略（不报错，但视觉无变化）——这正是要演示的「架构限制」差异。
const dgClassNames: TableClassNames<SemanticRecord> = {
  root: 'dg-semi-slot-root',
  section: 'dg-semi-slot-section',
  content: 'dg-semi-slot-content',
  title: 'dg-semi-slot-title',
  footer: 'dg-semi-slot-footer',
  header: {
    wrapper: 'dg-semi-slot-header-wrapper', // dg 无 thead 容器 → 不渲染
    row: 'dg-semi-slot-header-row', // B-impl 已补：透传到表头行所有 cell
    cell: 'dg-semi-slot-header-cell',
  },
  body: {
    wrapper: 'dg-semi-slot-body-wrapper', // dg 无 tbody 容器 → 不渲染
    row: 'dg-semi-slot-body-row', // 透传到表体行所有 cell
    cell: 'dg-semi-slot-body-cell',
  },
  pagination: {
    root: 'dg-semi-slot-pagination-root',
    item: 'dg-semi-slot-pagination-item',
  },
}

// styles：每槽补一个 inline outline（视觉冗余，便于 devtools 定位）。
// 用 inline style 而非依赖外部 CSS，确保 demo 自包含（无 CSS 文件依赖）。
const slotOutline = (color: string): CSSProperties => ({
  outline: `2px dashed ${color}`,
  outlineOffset: -2,
})
const dgStyles: TableStyles<SemanticRecord> = {
  root: slotOutline('#ff00ff'),
  section: slotOutline('#00ffff'),
  content: slotOutline('#ffff00'),
  title: slotOutline('#ff5500'),
  footer: slotOutline('#00ff55'),
  header: {
    wrapper: slotOutline('#5500ff'),
    row: slotOutline('#ff0055'),
    cell: slotOutline('#ff5555'),
  },
  body: {
    wrapper: slotOutline('#55ff00'),
    row: slotOutline('#0055ff'),
    cell: slotOutline('#5555ff'),
  },
  pagination: {
    root: slotOutline('#ffaa00'),
    item: slotOutline('#aa00ff'),
  },
}

// ---------------------------------------------------------------------------
// 列定义：Age 可排序（aria-sort 专项）+ Name rowScope（行表头语义演示）。
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<SemanticRecord>[] = [
  {
    title: 'Personal Info',
    children: [
      { title: 'Name', dataIndex: 'name', key: 'name', rowScope: 'row' },
      {
        title: 'Age',
        dataIndex: 'age',
        key: 'age',
        sorter: true,
        showSorterTooltip: false,
      },
    ],
  },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// ★ props 默认值均为合理有效初值（坑5+坑7）：
// - bordered=false（对齐改造前默认，本 demo 表格无边框）。
// - virtual=false（OFF 回 undefined scroll，本 demo 展示完整 DOM 供检视，不虚拟化）。
// sortOrder 瞬时态由子组件内部自管（非受控），onChange 回写显示在表格下方。
export default function SemanticDomDg({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  // 内部 sortOrder 态（点击 Age 表头排序后显示在表格下方，便于 devtools 对照 aria-sort）。
  const [dgSortOrder, setDgSortOrder] = useState<'ascend' | 'descend' | null>(
    null,
  )

  const dgPagination = { pageSize: 3 }

  return (
    <div>
      <Table<SemanticRecord>
        columns={dgColumns}
        dataSource={semanticData}
        classNames={dgClassNames}
        styles={dgStyles}
        title={() => 'data-grid Title'}
        footer={() => 'data-grid Footer'}
        size="small"
        bordered={bordered}
        pagination={dgPagination}
        /* 全局虚拟化开关不接（virtualizable={false}），virtual 默认 false 仅作 props 兜底。
           ON 演示场景由其它 demo 承担；本 demo 展示完整 DOM 结构，虚拟化会隐藏非可视行破坏检视。 */
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
        onChange={(_pag, _filters, sorter) => {
          const order = Array.isArray(sorter)
            ? (sorter[0]?.order ?? null)
            : (sorter?.order ?? null)
          setDgSortOrder(order as 'ascend' | 'descend' | null)
        }}
      />
      <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
        当前 Age 列 sortOrder = <code>{String(dgSortOrder)}</code>
      </div>
    </div>
  )
}

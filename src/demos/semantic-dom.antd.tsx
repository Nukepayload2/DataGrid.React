/**
 * semantic-dom demo 的 antd 段（右栏），从 semantic-dom.tsx 拆出。
 *
 * - 自包含：含 `antdColumns`（Personal Info 分组表头 + Name rowScope + Age sorter）/ `<AntdTable>` JSX
 *   + 13 槽位 `antdClassNames` + `antdStyles`（每槽一种霓虹色 outline + data-slot 标注，与 dg 子组件
 *   逐字同款）+ 内部 sortOrder 态（点击 Age 表头排序后显示在表格下方）。
 * - 忠实复刻改造前 antd 段：13 槽位染色 + Age 列 sorter 演示 aria-sort 同步。
 *   antd 有 thead/tbody/tr 真实容器，故 header.wrapper/body.wrapper/header.row/body.row 全部染色成功
 *   （与 dg 形成对照——dg 侧 header.wrapper/body.wrapper 不渲染，header.row/body.row 分散到行内 cell）。
 *
 * === ★ 13 槽位 classNames/styles 染色配置搬入子组件 ===
 * 原父文件的 `antdClassNames` / `antdStyles` 全部搬入本子组件，与 dg 子组件的 dgClassNames/dgStyles
 * 逐字同款（每槽一种霓虹色 outline）。
 *
 * === ★ a11y / aria-sort 配置 ===
 * - Age 列 `sorter: true` + `showSorterTooltip: false`：点击表头时 `<th>` aria-sort 在
 *   ascending ↔ descending ↔ （未设）循环（antd useSorter.tsx:246-248 显式设）。
 * - Name 列 `rowScope: 'row'`：antd 渲染为 `<th scope="row">`，天然 role=rowheader 语义。
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
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/semantic-dom.shared'`）。
 */
import { useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  TableProps as AntdTableProps,
  TableColumnsType,
} from 'antd'
import { Table as AntdTable } from 'antd'
import { semanticData, type SemanticRecord } from './_compare/semantic-dom.shared'

// ---------------------------------------------------------------------------
// 13 槽位染色：每槽一种霓虹色 outline + className（与 dg 子组件逐字同款）。
// ---------------------------------------------------------------------------

// antd 侧 classNames（13 槽，逐字与 dg 同款）。antd 有 thead/tbody/tr 真实容器，故 header.wrapper/
// body.wrapper/header.row/body.row 全部染色成功（与 dg 形成对照）。
const antdClassNames: NonNullable<AntdTableProps<SemanticRecord>['classNames']> = {
  root: 'dg-semi-slot-root',
  section: 'dg-semi-slot-section',
  content: 'dg-semi-slot-content',
  title: 'dg-semi-slot-title',
  footer: 'dg-semi-slot-footer',
  header: {
    wrapper: 'dg-semi-slot-header-wrapper',
    row: 'dg-semi-slot-header-row',
    cell: 'dg-semi-slot-header-cell',
  },
  body: {
    wrapper: 'dg-semi-slot-body-wrapper',
    row: 'dg-semi-slot-body-row',
    cell: 'dg-semi-slot-body-cell',
  },
  pagination: {
    root: 'dg-semi-slot-pagination-root',
    item: 'dg-semi-slot-pagination-item',
  },
}

// styles：每槽补一个 inline outline（与 dg 子组件逐字同款）。
const slotOutline = (color: string): CSSProperties => ({
  outline: `2px dashed ${color}`,
  outlineOffset: -2,
})
const antdStyles: NonNullable<AntdTableProps<SemanticRecord>['styles']> = {
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

const antdColumns: TableColumnsType<SemanticRecord> = [
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
export default function SemanticDomAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  // 内部 sortOrder 态（点击 Age 表头排序后显示在表格下方，便于 devtools 对照 aria-sort）。
  const [antdSortOrder, setAntdSortOrder] = useState<
    'ascend' | 'descend' | null
  >(null)

  const antdPagination = { pageSize: 3 }

  return (
    <div>
      <AntdTable<SemanticRecord>
        columns={antdColumns}
        dataSource={semanticData}
        classNames={antdClassNames}
        styles={antdStyles}
        title={() => 'antd Title'}
        footer={() => 'antd Footer'}
        size="small"
        bordered={bordered}
        pagination={antdPagination}
        /* 全局虚拟化开关不接（virtualizable={false}），virtual 默认 false 仅作 props 兜底。
           ON 演示场景由其它 demo 承担；本 demo 展示完整 DOM 结构，虚拟化会隐藏非可视行破坏检视。 */
        virtual={virtual}
        scroll={virtual ? { y: 280 } : undefined}
        onChange={(_pag, _filters, sorter) => {
          const order = Array.isArray(sorter)
            ? (sorter[0]?.order ?? null)
            : (sorter?.order ?? null)
          setAntdSortOrder(order as 'ascend' | 'descend' | null)
        }}
      />
      <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
        当前 Age 列 sortOrder = <code>{String(antdSortOrder)}</code>
      </div>
    </div>
  )
}

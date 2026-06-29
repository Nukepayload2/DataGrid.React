/**
 * narrow demo 的 data-grid 段（左栏），从 narrow.tsx 拆出。
 *
 * - props 驱动 `{ paginated, defaultCurrent, virtual }`（由 narrow.tsx 父组件传）：
 *   * paginated：是否分页（父控制条 Pagination 开关，真理源在父——父渲染 Switch）。
 *   * defaultCurrent：分页初值页码（父控制条 Page 1/13/20 Segmented）。
 *   * virtual：全局虚拟化开关。
 * - 自包含：含 `dgColumns` + `<Table>` JSX + 包裹的 300px 窄容器 div（virtual ON 时加 flex 链）。
 * - 行为与改造前一致：300px 窄容器 + 200 行 + size="small" + 分页 defaultCurrent:13。
 *
 * === ★ 已知 gap（§9 列宽策略，登记不修）===
 * data-grid 表格总宽默认 = max-content，窄容器 300px 下表格横向溢出；antd 用 table-layout:fixed
 * + width:100% 让列均分容器宽度。两侧差异对照可见（非回归）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - paginated=true（原 demo 默认开分页，合理初值；编辑模式 propsFor 超集 {bordered,virtual,size,
 *   autoScroll} 不含 paginated/defaultCurrent，靠默认值兜底 → 编辑模式渲染默认开分页第 13 页，有效）。
 * - defaultCurrent=13（对齐原 demo 默认值）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/narrow.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType, TablePaginationConfig } from '../table'
import { dataSource, rawColumns, type RecordType } from './_compare/narrow.shared'

// 左栏 data-grid 列定义。
const dgColumns: ColumnType<RecordType>[] = rawColumns.map((c) => ({ ...c }))

export default function NarrowDg({
  paginated = true,
  defaultCurrent = 13,
  virtual = false,
}: {
  paginated: boolean
  defaultCurrent: number
  virtual: boolean
}) {
  // pagination 配置：开 = { defaultCurrent }，关 = false（全显）。
  const dgPagination: TablePaginationConfig | false = paginated
    ? { defaultCurrent }
    : false

  return (
    /* ★ virtual ON 时内层 div 加 flex 链（flex:1 + minHeight:0 + 自身 flex column），
       让 .dg-compare__body（virtual ON 时 height:400, flex column）的有界高经本 div
       透传给 .dg-wrapper.dg-data-area（height:100%）→ .dg-scroll-wrap flex:1 → 虚拟窗口有界裁剪。
       原因：data-grid scroll.y:true 用 CSS 自适应高度（依赖父链有界），而 narrow 内层 div
       原本只有 width:300 无 height → .dg-wrapper height:100% 退化为 auto → 200 行全渲染（11238px）。
       OFF 时回原状（仅 width:300，无 flex 干预，行为与改造前一致）。 */
    <div
      style={
        virtual
          ? { width: 300, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
          : { width: 300 }
      }
    >
      <Table<RecordType>
        columns={dgColumns}
        dataSource={dataSource}
        size="small"
        pagination={dgPagination}
        /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
           pane 限高，虚拟窗口才有滚动区）；OFF 时回 undefined（原 narrow demo 无 scroll），零回归。 */
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
    </div>
  )
}

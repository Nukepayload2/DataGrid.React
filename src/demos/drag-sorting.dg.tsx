/**
 * drag-sorting demo 的 data-grid 段（左栏），从 drag-sorting.tsx 拆出。
 *
 * === 拖拽 state 自管（子组件内）===
 * drag-sorting demo 的核心交互是行拖拽排序（自研 pointer useRowDragSort + 蓝色指示线 +
 * arrayMove dataSource），这是表格内部交互态（无外部控制条直接操作 dataSource 排序——
 * Bordered/AutoScroll 控制条驱动的是视觉/滚动行为，不直接操作 dataSource）。按 SOP「交互 state
 * （编辑/增删行/选择/展开/分页等）优先留子组件内自管；仅当父控制条需直接操作时才提升父」+ 本 demo
 * 原始决策「两栏独立」（拖拽是局部交互，两栏各自维护 dataSource 便于对照），本子组件内部自管：
 *   - `dataSource`（表格数据，初始 initialData）
 *   + useRowDragSort 的 `dragState`/`indicator`/`containerProps`（拖拽态 + 指示线）
 * 这与改造前 DataGridPane 的行为完全等价（方案 B 自研 pointer 行拖拽 + 蓝色指示线）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - bordered=false（无边框，对齐 antd drag-sorting 默认）。
 * - autoScroll=true（拖到容器边缘自动滚动，对齐改造前默认；此 demo 数据少无 scroll 容器，no-op）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 全覆盖；拖拽 dataSource state 全
 * 在子组件内自管，无需父级 prop 兜底——编辑模式单侧渲染也能完整演示拖拽排序（自管 state）。
 *
 * === 方案 B 自研 pointer 行拖拽（保留，不依赖 @dnd-kit）===
 * `useRowDragSort` 通过外层容器**事件委托**命中任意 body 单元格（整行均可拖，无需改引擎），
 * 蓝色指示线提示插入位置，松手后 arrayMove 重排 dataSource。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'react'` / `'antd'` / `'../table'` / `'./_compare/drag-sorting.shared'`），源码可原样展示无需路径改写。
 */
import { useRef, useState } from 'react'
import { Table, useRowDragSort } from '../table'
import type { ColumnType } from '../table'
import { theme } from 'antd'
import { initialData, type RecordType } from './_compare/drag-sorting.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— Name / Age / Address（对齐 antd demo）
// ---------------------------------------------------------------------------

// ★ 列宽策略（任务 #A/B）：Name/Age 给窄 width（绝对 track，fixed 模式下锁定不参与 fr 分配），
//   Address 不设 width（fixed 模式 → minmax(0,1fr) 填剩余空间，超长文本换行而非撑出横滚条）。
//   与 antd 右栏差异：antd 官方同款数据会横滚（auto 布局 + max-content），此处刻意 fixed 布局让
//   Address 占剩余空间并换行——是本 demo 的目标态（消除横滚 + 自动行高），不是回归。
const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 120 },
  { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// ---------------------------------------------------------------------------
// 子组件（自管拖拽排序 state）
// ---------------------------------------------------------------------------

export default function DragSortingDg({
  bordered = false,
  autoScroll = true,
  virtual = false,
}: {
  bordered: boolean
  autoScroll: boolean
  virtual: boolean
}) {
  // ★ 拖拽 dataSource 各自独立（两栏对照时互不干扰，按原始 demo 决策「两栏独立」）。
  const { token } = theme.useToken()
  const [dataSource, setDataSource] = useState<RecordType[]>(initialData)

  // 外层容器 ref（指示线相对此容器绝对定位；hit-test 遍历容器内 [data-row-index] 单元格）。
  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useRowDragSort<RecordType>({
    dataSource,
    rowKey: 'key',
    onSort: setDataSource,
    containerRef,
    // T9：拖到容器边缘自动滚动（此 demo 数据少无 scroll 容器，auto-scroll 为 no-op；开关用于对照）。
    autoScroll,
  })

  return (
    <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
      <Table<RecordType>
        rowKey="key"
        columns={dgColumns}
        dataSource={dataSource}
        bordered={bordered}
        // 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination，data-grid 不传=无分页条）。
        pagination={{}}
        /* ★ 任务 #B：切到 fixed 布局——无 width 列（Address）变 minmax(0,1fr) 填剩余空间，
           超长文本换行而非撑出横滚条；非虚拟默认 rowHeight='auto'，行随换行内容自动增高。
           fixed 布局与虚拟化正交，virtual ON 时仍生效。 */
        tableLayout="fixed"
        /* ★ 任务 #A：整行 cursor:move——对齐 antd 官方 drag-sorting 在 <tr> 设 cursor:move
           （右栏 antd Row 已复刻）。data-grid 无 tr，用 S29 语义 styles.body.cell 把 cursor:move
           注入到每个 body 单元格（整行悬停显 move 光标，与 antd 整行 cursor:move 一致）。 */
        styles={{ body: { cell: { cursor: 'move' } } }}
        /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
           给的限高，虚拟窗口才有滚动区；拖拽命中区在虚拟窗口内，正常接入——autoScrollOnDrag 已有）；
           OFF 时回 undefined，行为与改造前一致。 */
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
      {/* 拖拽指示线：绝对定位蓝色横线，跨整行（left:0/right:0 相对 container）。
          非 grid item（是 container 子元素），不影响 grid-template-rows 计算。 */}
      {indicator.visible ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: indicator.top,
            left: indicator.left,
            right: indicator.right,
            height: 2,
            background: token.colorPrimary,
            zIndex: 9999,
            pointerEvents: 'none',
            borderRadius: 1,
          }}
        />
      ) : null}
      <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary }}>
        当前拖拽：
        {dragState ? `from #${dragState.fromIndex + 1} → 目标 #${dragState.overIndex + 1}` : '无'}
      </div>
    </div>
  )
}

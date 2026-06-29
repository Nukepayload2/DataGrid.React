/**
 * drag-column-sorting demo 的 data-grid 段（左栏），从 drag-column-sorting.tsx 拆出。
 *
 * === 拖拽 state 自管（子组件内）===
 * drag-column-sorting 的核心交互是列拖拽排序（方案 B 自研 pointer `useColumnDragSort` 命中
 * 叶子表头格 `data-leaf-index` + 垂直指示线 + arrayMoveColumns 重排 columns），这是表格内部交互态
 * （Bordered/AutoScroll/ColumnReorder 控制条驱动的是视觉/滚动/全局开关行为，不直接操作 columns 排序）。
 * 按 SOP「交互 state 优先留子组件内自管；仅当父控制条需直接操作时才提升父」+ 原始决策「两栏独立」
 * （拖拽是局部交互，两栏各自维护 columns 便于对照），本子组件内部自管：
 *   - `columns`（表格列定义，初始由 dgBaseColumns 加 key 派生）
 *   + useColumnDragSort 的 `dragState`/`indicator`/`containerProps`（拖拽态 + 垂直指示线）
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - bordered=false（无边框，对齐 antd drag-column-sorting 默认）。
 * - autoScroll=true（拖到左右边缘横向自动滚动，对齐改造前默认；此 demo 5 列无 scroll.x，no-op）。
 * - columnReorder=true（T10 全局列重排总闸，对齐 S19 总是可拖行为；关 → 所有列头不可拖）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 不含 columnReorder，故用默认 true
 * 兜底（合理有效初值——列头可拖，能完整演示拖拽）；拖拽 columns state 全在子组件内自管，
 * 无需父级 prop 兜底——编辑模式单侧渲染也能完整演示列拖拽排序（自管 state）。
 *
 * === 方案 B 自研 pointer 列拖拽（保留，不依赖 @dnd-kit）===
 * grid 渲染无"列 DOM"，transform 平移会破坏 grid 布局，故自研 pointer（垂直指示线提示插入位置）。
 * ★ T10：列标志——Gender 列 movable:false（不可发起拖，但被动让位）；Email 列 lockPosition:true
 * （自身 index 不变，重排算法跳过；拖它无反应，拖其它列它原地不动）；columnReorder 全局总闸
 * （false → 所有列头不可拖，优先于单列 movable/lockPosition）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'react'` / `'antd'` / `'../table'` / `'./_compare/drag-column-sorting.shared'`），源码可原样展示无需路径改写。
 */
import { useRef, useState } from 'react'
import { theme } from 'antd'
import { Table, useColumnDragSort } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/drag-column-sorting.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）baseColumns —— Name/Gender/Age/Email/Address（对齐 antd demo）
// ---------------------------------------------------------------------------

const dgBaseColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  {
    title: 'Gender',
    dataIndex: 'gender',
    key: 'gender',
    // ★ T10：此列不可发起拖（movable:false）。其它列仍可拖——拖别的列时此列会被被动让位。
    gridColumnOptions: { movable: false },
  },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    // ★ T10：此列锁定位置（lockPosition:true）——自身 index 不变，重排算法跳过此列。
    // 其它列可在其前后重排，但 Email 列自身位置固定（拖它无反应，拖其它列它原地不动）。
    gridColumnOptions: { lockPosition: true },
  },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// ---------------------------------------------------------------------------
// 子组件（自管拖拽排序 state）
// ---------------------------------------------------------------------------

export default function DragColumnSortingDg({
  bordered = false,
  autoScroll = true,
  columnReorder = true,
  virtual = false,
}: {
  bordered: boolean
  autoScroll: boolean
  columnReorder: boolean
  virtual: boolean
}) {
  // ★ 列拖拽各自独立（两栏对照时互不干扰，按原始 demo 决策「两栏独立」）。
  // 稳定 key（列重排时 React diff 用），与 antd demo `${i}` 索引作 key 同款。
  // ★ 注意：保留 gridColumnOptions（movable/lockPosition）—— dgBaseColumns 各列已标注。
  const [columns, setColumns] = useState<ColumnType<RecordType>[]>(() =>
    dgBaseColumns.map((column, i) => ({ ...column, key: `${i}` })),
  )

  const containerRef = useRef<HTMLDivElement>(null)
  // 拖拽状态 hint chrome 文字色 token 化（colorTextTertiary≈rgba(0,0,0,0.45)），暗主题自适应。
  // ★ 仅 chrome 文字色，不动 useColumnDragSort 拖拽逻辑。
  const { token } = theme.useToken()

  const { dragState, indicator, containerProps } = useColumnDragSort<ColumnType<RecordType>>({
    columns,
    onSort: setColumns,
    containerRef,
    // T9：拖到左右边缘横向自动滚动（此 demo 5 列无 scroll.x，auto-scroll 为 no-op；开关用于对照）。
    autoScroll,
    // ★ T10：columnReorder 全局开关（gridOptions.columnReorder 透传；false→所有列头不可拖）。
    reorder: columnReorder,
  })

  return (
    <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
      <Table<RecordType>
        rowKey="key"
        columns={columns}
        dataSource={data}
        bordered={bordered}
        // 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination，data-grid 不传=无分页条）。
        pagination={{}}
        /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
           给的限高，虚拟窗口才有滚动区；列拖拽命中表头，在虚拟窗口内，正常接入）；
           OFF 时回 undefined，行为与改造前一致。 */
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
      {/* 垂直拖拽指示线：绝对定位蓝色竖线，跨表头+表体高度。
          非 grid item（是 container 子元素），不影响 grid-template-columns 计算。 */}
      {indicator.visible ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: indicator.left,
            top: indicator.top,
            height: indicator.height,
            width: 2,
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
        ；当前列顺序：{columns.map((c) => c.title).join(' / ')}
        <br />
        {/* T10：列标志提示——Gender 不可发起拖（movable:false），Email 锁定位置（lockPosition:true，
            拖它无反应、拖别的列它原地不动）。columnReorder 全局关 → 所有列头不可拖。 */}
        <span style={{ color: token.colorPrimary }}>
          [T10] Gender: 不可发起拖(movable:false)；Email: 锁定位置(lockPosition:true)；ColumnReorder
          全局开关：{columnReorder ? '开' : '关（所有列头不可拖）'}
        </span>
      </div>
    </div>
  )
}

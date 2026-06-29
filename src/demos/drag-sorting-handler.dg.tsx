/**
 * drag-sorting-handler demo 的 data-grid 段（左栏），从 drag-sorting-handler.tsx 拆出。
 *
 * === 拖拽 state 自管（子组件内）===
 * drag-sorting-handler 的核心交互是手柄列触发行拖拽排序（复用 S17 useRowDragSort +
 * handleSelector: '.dg-drag-handle' 限定手柄列触发 + 蓝色指示线 + arrayMove dataSource），
 * 这是表格内部交互态（Bordered/AutoScroll 控制条驱动的是视觉/滚动行为，不直接操作 dataSource）。
 * 按 SOP「交互 state 优先留子组件内自管；仅当父控制条需直接操作时才提升父」+ 原始决策「两栏独立」
 * （拖拽是局部交互，两栏各自维护 dataSource 便于对照），本子组件内部自管：
 *   - `dataSource`（表格数据，初始 initialData）
 *   + useRowDragSort 的 `dragState`/`indicator`/`containerProps`（拖拽态 + 指示线）
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - bordered=false（无边框，对齐 antd drag-sorting-handler 默认）。
 * - autoScroll=true（拖到容器边缘自动滚动，对齐改造前默认；此 demo 数据少无 scroll 容器，no-op）。
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 全覆盖；拖拽 dataSource state 全
 * 在子组件内自管，无需父级 prop 兜底——编辑模式单侧渲染也能完整演示手柄拖拽排序（自管 state）。
 *
 * === 手柄触发机制（保留）===
 * DragHandle（antd Button + 内联 HolderOutlined SVG + .dg-drag-handle class）仅作命中标识；
 * 外层容器事件委托 + `handleSelector: '.dg-drag-handle'` 命中，仅手柄触发拖拽（Name/Age/Address 不触发）。
 *
 * === 图标实现（不 import @ant-design/icons）===
 * 与 custom-filter-panel/nested-table 约定一致——项目未直接声明 @ant-design/icons 依赖
 * （仅 antd 间接依赖，pnpm 严格隔离不可访问）。InlineHolderOutlined 的 viewBox + path 取自
 * @ant-design/icons-svg HolderOutlined（7 个圆点），视觉与官方逐字节一致。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'react'` / `'antd'` / `'../table'` / `'./_compare/drag-sorting-handler.shared'`），源码可原样展示无需路径改写。
 */
import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { ReactNode } from 'react'
import { Button, theme } from 'antd'
import { Table, useRowDragSort } from '../table'
import type { ColumnType } from '../table'
import { initialData, type RecordType } from './_compare/drag-sorting-handler.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）内联 HolderOutlined SVG —— 避免 import @ant-design/icons
// ---------------------------------------------------------------------------

/**
 * 内联 HolderOutlined（拖拽手柄"七点"图标）——避免直接依赖 @ant-design/icons（仅 antd 间接依赖）。
 * 与 antd HolderOutlined **逐字节一致**（viewBox + path 取自
 * `@ant-design/icons-svg/es/asn/HolderOutlined.js`：viewBox "64 64 896 896"，
 * 7 个圆点 path）；size 跟随父节点 font-size（1em）。
 */
function InlineHolderOutlined({ style }: { style?: CSSProperties }): ReactNode {
  return (
    <svg
      viewBox="64 64 896 896"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-0.125em', ...style }}
    >
      <path d="M300 276.5a56 56 0 1056-97 56 56 0 00-56 97zm0 284a56 56 0 1056-97 56 56 0 00-56 97zM640 228a56 56 0 10112 0 56 56 0 00-112 0zm0 284a56 56 0 10112 0 56 56 0 00-112 0zM300 844.5a56 56 0 1056-97 56 56 0 00-56 97zM640 796a56 56 0 10112 0 56 56 0 00-112 0z" />
    </svg>
  )
}

/** 左栏 DragHandle：cursor:move + .dg-drag-handle class（供 handleSelector 命中）。 */
function DgDragHandle() {
  return (
    <Button
      type="text"
      size="small"
      className="dg-drag-handle"
      icon={<InlineHolderOutlined />}
      style={{ cursor: 'move' }}
    />
  )
}

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 首列手柄 + Name/Age/Address（对齐 antd demo）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { key: 'sort', align: 'center', width: 80, render: () => <DgDragHandle /> },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// ---------------------------------------------------------------------------
// 子组件（自管拖拽排序 state）
// ---------------------------------------------------------------------------

export default function DragSortingHandlerDg({
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

  // 外层容器 ref（指示线相对此容器绝对定位；hit-test 遍历容器内命中 .dg-drag-handle）。
  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useRowDragSort<RecordType>({
    dataSource,
    rowKey: 'key',
    onSort: setDataSource,
    containerRef,
    // 手柄列限定：仅 .dg-drag-handle 命中才启动拖拽（Name/Age/Address 不触发）。
    handleSelector: '.dg-drag-handle',
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
        /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
           给的限高，虚拟窗口才有滚动区；手柄拖拽命中区在虚拟窗口内，正常接入）；
           OFF 时回 undefined，行为与改造前一致。 */
        virtual={virtual}
        scroll={virtual ? { y: true } : undefined}
      />
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

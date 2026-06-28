/**
 * T9 验收 demo：虚拟列表 + 行拖拽排序 + autoScrollOnDrag（拖到边缘自动滚动）。
 *
 * === 背景（为什么要这个 demo）===
 *
 * 行拖（`useRowDragSort`）的 hit-test 实时遍历**已渲染的** `[data-row-index]` 单元格算
 * over index。虚拟列表（M4）下只渲染可视区行；当用户把行拖到容器底部边缘下方时，可视区外的
 * 行**没有 DOM**，hit-test 会"卡住"在可视区最后一行——drop 目标永远在末行，无法到达远处位置。
 *
 * T9 的 `gridOptions.autoScrollOnDrag`（默认 true）解决此问题：拖拽近边缘 → 渐进加速滚动容器 →
 * 滚动事件触发虚拟引擎（useVirtualList）重算已渲染行 → DOM 行边界变化 → 下一帧 hit-test 自动
 * 跟随到新位置。
 *
 * === demo 设计（让 verifier 能直观验证 auto-scroll）===
 *
 * - **10000 行虚拟列表 + 行拖拽手柄列**：数据量大到必须虚拟，且拖一行需要穿越很远才能到达目标。
 * - **scroll.y=true（数据区域模式）**：表体限高纵向滚动（容器高 440px，每行 40px → 可视 ~10 行）。
 * - **autoScrollOnDrag 开关**（默认 true）：verifier 可对照开/关下的差异：
 *   - 开：拖一行到容器**底部边缘** → 容器自动向下滚动 → 露出更多行 → 蓝色指示线跟随到新位置
 *     （可一路拖到第 10000 行附近再松手，确认 drop 指示线到达正确行）。
 *   - 关：拖到容器底部边缘 → 不滚动 → 指示线"卡住"在可视区最后一行（无法到达远处行）。
 * - **当前拖拽 / 当前 scrollTop 显示**：便于 verifier 观察拖拽中 over index + 滚动位置变化。
 *
 * === 验证步骤（verifier）===
 *
 * 1. 打开 demo（默认 10000 行 + autoScrollOnDrag 开）。
 * 2. 按住某行的**手柄列**（首列 HolderOutlined 图标）开始拖拽。
 * 3. 向下移动指针到表体容器**底部边缘**（距底部 < 100px）→ 确认容器**自动向下滚动**，露出更多行，
 *    蓝色指示线跟随到新位置（不再卡在末行）。
 * 4. 一路拖到接近第 10000 行 → 松手 → 确认该行被重排到目标位置（"当前拖拽"显示 from/over index）。
 * 5. 同样向上拖到**顶部边缘** → 确认向上自动滚动。
 * 6. 关闭 AutoScroll 开关 → 重复 2-3 → 确认拖到底部边缘**不滚动**、指示线卡在末行（对照差异）。
 *
 * === 实现要点 ===
 *
 * - 复用 `useRowDragSort` + `handleSelector: '.dg-drag-handle'`（S18 手柄列拖拽）。
 * - `autoScroll` 从开关传入（对齐 `gridOptions.autoScrollOnDrag` 语义，默认 true）。
 * - 行拖 hit-test + auto-scroll RAF 都通过外层 `containerRef` 定位；auto-scroll 内部用
 *   `containerRef.current.querySelector('.dg-scroll')` 找到真正的滚动容器（GridTable 在
 *   scroll.y=true 时自包一层 `.dg-scroll`）。
 * - 数据：自造 10000 行简单 record（key/name/age/address），用 `crypto.randomUUID` 不必要——
 *   直接用 index 作 key。
 */

import { useEffect, useRef, useState } from 'react'
import { Button, Space, Switch, theme } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import { Table } from '../table'
import { useRowDragSort } from '../table'
import type { ColumnType } from '../table'
import { DemoToolbar } from './_compare/DemoToolbar'

// ---------------------------------------------------------------------------
// 数据生成
// ---------------------------------------------------------------------------

interface VRow {
  key: number
  name: string
  age: number
  address: string
}

function makeData(count: number): VRow[] {
  return Array.from({ length: count }).map<VRow>((_, i) => ({
    key: i,
    name: `User ${i}`,
    age: 20 + (i % 40),
    address: `Address ${i}, Some Park, City ${(i % 7)}`,
  }))
}

// ---------------------------------------------------------------------------
// 内联 HolderOutlined SVG（避免 import @ant-design/icons，与 drag-sorting-handler 约定一致）
// ---------------------------------------------------------------------------

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
// 列定义（首列手柄 + Name/Age/Address）
// ---------------------------------------------------------------------------

const columns: ColumnType<VRow>[] = [
  { key: 'sort', align: 'center', width: 60, render: () => <DgDragHandle /> },
  { title: 'Key', dataIndex: 'key', key: 'key', width: 80 },
  { title: 'Name', dataIndex: 'name', key: 'name', width: 160 },
  { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function DragVirtualListDemo() {
  const { token } = theme.useToken()
  const [autoScroll, setAutoScroll] = useState(true)
  // 重置数据用 key（点"Reset data"后变化 → useMemo 重生成，强制清掉拖拽 state）。
  const [resetTick, setResetTick] = useState(0)
  const [dataSource, setDataSource] = useState<VRow[]>(() => makeData(10000))

  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useRowDragSort<VRow>({
    dataSource,
    rowKey: 'key',
    onSort: setDataSource,
    containerRef,
    handleSelector: '.dg-drag-handle',
    // T9：autoScrollOnDrag 开关（默认 true，对齐 gridOptions.autoScrollOnDrag 默认）。
    autoScroll,
  })

  // 监听滚动容器 scrollTop（仅用于显示，不影响行为）。.dg-scroll 在 first paint 后挂载，
  // 用 useEffect 挂监听（容器 ref 稳定，drag hook 的 pointer capture 不受影响）。
  const [scrollTop, setScrollTop] = useState(0)
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    let cleaned = false
    let target: HTMLElement | null = null
    const onScrollSync = () => {
      if (target) setScrollTop(target.scrollTop)
    }
    const tryAttach = () => {
      if (cleaned) return
      const sc = node.querySelector<HTMLElement>('.dg-scroll')
      if (sc) {
        target = sc
        sc.addEventListener('scroll', onScrollSync, { passive: true })
        setScrollTop(sc.scrollTop)
      } else {
        // .dg-scroll 可能还未挂载（首帧）；下一帧重试。
        requestAnimationFrame(tryAttach)
      }
    }
    tryAttach()
    return () => {
      cleaned = true
      if (target) target.removeEventListener('scroll', onScrollSync)
    }
  }, [resetTick])

  const totalCount = dataSource.length

  return (
    <div style={{ padding: 24 }}>
      {/* 控制条 */}
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={autoScroll}
            onChange={setAutoScroll}
            checkedChildren="AutoScroll"
            unCheckedChildren="AutoScroll"
          />
          <Button onClick={() => { setDataSource(makeData(10000)); setResetTick((t) => t + 1) }}>
            Reset data (10000 rows)
          </Button>
          <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
            scrollTop: {Math.round(scrollTop)} px · 共 {totalCount} 行
          </span>
        </Space>
        <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextSecondary }}>
          <strong>T9 验收步骤：</strong>
          <ol style={{ margin: '4px 0 0', paddingLeft: 20 }}>
            <li>按住首列手柄图标开始拖拽某行。</li>
            <li>
              向下移动指针到表体容器<strong>底部边缘</strong>（距底部 &lt; 100px）→
              确认容器<strong>自动向下滚动</strong>，蓝色指示线跟随到新位置（不卡在末行）。
            </li>
            <li>一路拖到接近末行（第 10000 行）→ 松手 → 确认重排到目标位置。</li>
            <li>同样向上拖到<strong>顶部边缘</strong> → 确认向上自动滚动。</li>
            <li>
              关闭 AutoScroll 开关 → 重复 → 确认拖到底部边缘<strong>不滚动</strong>、指示线卡在末行。
            </li>
          </ol>
        </div>
      </DemoToolbar>

      {/* 表格容器（外层相对定位：指示线作为其子元素绝对定位）。 */}
      <div
        key={resetTick}
        ref={containerRef}
        style={{ position: 'relative', height: 440 }}
        {...containerProps}
      >
        <Table<VRow>
          rowKey="key"
          columns={columns}
          dataSource={dataSource}
          virtual
          scroll={{ y: true }}
          pagination={false}
          gridOptions={{ rowHeight: 40, headerHeight: 40, autoScrollOnDrag: autoScroll }}
        />
        {/* 行拖拽蓝色指示线（绝对定位横线，跨整行）。 */}
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
          {dragState
            ? `from #${dragState.fromIndex} (key=${dataSource[dragState.fromIndex]?.key}) → 目标 #${dragState.overIndex} (key=${dataSource[dragState.overIndex]?.key})`
            : '无'}
        </div>
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { theme as antdTheme, Table as AntdTable } from 'antd'
import type { GetRef, TableProps } from 'antd'
import { getData, type RecordType } from './_compare/virtual-list.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）—— 如实呈现 #46467
//
// antd `ref.scrollTo({ index })` 在**非虚拟**分支的实现走原生 `scrollIntoView()`
// （见 rc-table/es/Table.js L208：`scrollBodyRef.current
//   .querySelector('[data-row-key="..."]').scrollIntoView()`）。
// 原生 `scrollIntoView` 沿 DOM 树逐层滚所有可滚动祖先——所以当外层有滚动条时，
// **外层也会被一起滚**。这是 #46467 报告的行为，antd 团队确认 bug。
//
// 如实呈现，不做任何 hack（不阻止外层滚、不补偿 scrollIntoView 副作用）。
//
// 说明：antd 虚拟分支（VirtualTable → rc-virtual-list → `syncScrollTop` → 直接
// `componentRef.scrollTop = alignedTop`）不使用 scrollIntoView，理论上不复发本 bug；
// 但 #46467 的报告场景就是非虚拟表 + 外层滚动条，本侧按 issue 原貌复现。
// ---------------------------------------------------------------------------

/** antd Table ref type with `scrollTo`. */
type AntdTableRef = GetRef<typeof AntdTable>

const columns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: 'Name', dataIndex: 'lastName', width: 160 },
  { title: 'Age', dataIndex: 'age', width: 80 },
  { title: 'Address', dataIndex: 'address1' },
]

export interface ScrolltoScopedAntdProps {
  /** 父组件持有的 antd Table ref（顶栏按钮触发 scrollTo）。 */
  tableRef?: Ref<AntdTableRef>
}

export default function ScrolltoScopedAntd({
  tableRef,
}: ScrolltoScopedAntdProps) {
  const { token } = antdTheme.useToken()
  const data = useMemo(() => getData(200), [])

  // 与左栏一致的 outer / marker 样式——保证两侧视觉对照公平。
  const outerStyle: CSSProperties = {
    height: 360,
    overflow: 'auto',
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 6,
    padding: 12,
  }
  const markerStyle: CSSProperties = {
    height: 120,
    padding: 12,
    background: token.colorFillAlter,
    borderRadius: 4,
    color: token.colorTextSecondary,
    fontSize: 12,
    lineHeight: 1.6,
  }

  return (
    <div style={outerStyle}>
      <Marker style={markerStyle}>
        ↑ 外层滚动条由这个容器承担。点「Scroll To row N」后，外层会被一起滚
        （<strong>#46467</strong>：rc-table 用原生 <code>scrollIntoView</code>，
        沿 DOM 树逐层滚所有可滚动祖先）。
      </Marker>
      <div style={{ marginTop: 12 }}>
        {/*
          非虚拟模式：scroll.y 必须为数字（rc-table 非虚拟表体高的 max-height 语义）。
          200 ≈ 与左栏表体可视区对齐（左栏外壳 220 - 表头 40 ≈ 180；这里取 200 接近）。
        */}
        <AntdTable<RecordType>
          ref={tableRef}
          columns={columns}
          dataSource={data}
          rowKey="id"
          pagination={false}
          scroll={{ y: 200 }}
        />
      </div>
      <Marker style={{ ...markerStyle, marginTop: 12 }}>
        ↓ 表格下方内容也参与外层滚动条的总高度。点「Scroll To row N」后请留意：
        antd 外层 scrollTop 也跟着变小（被顶上去）。
      </Marker>
    </div>
  )
}

/** 简单的"占位标记"块。 */
function Marker({
  children,
  style,
}: {
  children: ReactNode
  style: CSSProperties
}) {
  return <div style={style}>{children}</div>
}

import { useMemo } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { theme as antdTheme } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableRef } from '../table'
import { getData, type RecordType } from './_compare/virtual-list.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）
//
// 演示 "scrollTo 不污染外层滚动"。
//
// 设计：
// - 外层 `<div>` 故意 `overflow:auto + height:360`，并塞入上下两块 placeholder
//   撑出 360+ px 的可滚动内容 → 产生**外层滚动条**（这是 #46467 触发条件）。
// - 表格放在中间，独立 `scroll={{ y: true }}` 表体滚动区。
// - 点顶栏「Scroll To row N」触发 `ref.scrollTo({ index: N })`：
//     data-grid 引擎直接 `el.scrollTop = finalTop`（见 `src/table/engine/useVirtualList.ts`
//     L420 与 L382），**禁用 `scrollIntoView`**，只改表体滚动条，外层 scrollTop 不动。
//
// 注意：data-grid 的 `ref.scrollTo` 仅在 `virtual` 模式下生效（publicTypes.ts L760），
// 故本侧 `virtual` 永久开启——这正是 data-grid 的"精准定位"实现所在的代码路径。
// ---------------------------------------------------------------------------

const columns: ColumnType<RecordType>[] = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: 'Name', dataIndex: 'lastName', width: 160 },
  { title: 'Age', dataIndex: 'age', width: 80 },
  { title: 'Address', dataIndex: 'address1' },
]

export interface ScrolltoScopedDgProps {
  /** 父组件持有的 data-grid Table ref（顶栏按钮触发 scrollTo）。 */
  tableRef?: Ref<TableRef>
}

export default function ScrolltoScopedDg({ tableRef }: ScrolltoScopedDgProps) {
  const { token } = antdTheme.useToken()
  const data = useMemo(() => getData(200), [])

  // 外层故意 overflow:auto + 固定可视高度 → 外层有滚动条。
  const outerStyle: CSSProperties = {
    height: 360,
    overflow: 'auto',
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 6,
    padding: 12,
  }

  // 上下两块"标记"占位：撑出外层可滚动空间，并提示外层 scrollTop 是否被动。
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
        ↑ 外层滚动条由这个容器承担（外层 scrollTop 应保持不变）。
      </Marker>
      <div style={{ height: 220, marginTop: 12 }}>
        {/*
          height:220 → 表格外壳高；内部 scroll.y=true 由 flex 链 resolve 为表体高
          （表头~40 + 表体~180）。virtual=true 才能触发 ref.scrollTo 实现。
        */}
        <Table<RecordType>
          ref={tableRef}
          virtual
          columns={columns}
          dataSource={data}
          rowKey="id"
          pagination={false}
          scroll={{ y: true }}
          gridOptions={{ rowHeight: 40, headerHeight: 40 }}
        />
      </div>
      <Marker style={{ ...markerStyle, marginTop: 12 }}>
        ↓ 表格下方内容也参与外层滚动条的总高度。点「Scroll To row N」后请留意：
        data-grid 表体动、外层 scrollTop 不变。
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

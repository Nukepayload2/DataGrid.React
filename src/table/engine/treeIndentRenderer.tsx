import type { ReactNode } from 'react'
import { ExpandIcon } from './ExpandIcon'
import { getRowKey } from './recordAccess'
import type { EngineTreeState } from './types'

/**
 * 树形缩进 + 展开/收起图标渲染（在第一列数据单元格内，内容前）。
 *
 * - 缩进：`paddingLeft = level × indentSize`（对齐 antd BodyRow `paddingLeft: ${indentSize * indent}px`）。
 * - 展开图标：仅 `hasChildren` 行渲染；无 children 行渲染等宽占位（保持图标列对齐）。
 *   - 展开：▼（ExpandIcon expanded=true）。
 *   - 收起：▶（ExpandIcon expanded=false）。
 *   - 点击：treeState.toggleExpand(key)。
 *
 * 返回 inline-flex 容器（缩进 + 图标），与原 rendered 内容横向并列。
 */
export function renderTreeIndent<RecordType>({
  record,
  rowKey,
  treeState,
}: {
  record: RecordType
  rowKey: string | ((record: RecordType) => string | number)
  treeState: EngineTreeState
}): ReactNode {
  const key = getRowKey(record, rowKey)
  const info = treeState.rowInfoMap.get(key)
  // rowInfoMap 中应有该 key（扁平化时已写入）；兜底无信息则不渲染。
  if (!info) return null
  const indent = info.level * treeState.indentSize
  const expanded = treeState.isExpanded(key)
  return (
    <span
      className="dg-tree-indent"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        // 缩进：level × indentSize px（对齐 antd BodyRow paddingLeft）。
        paddingLeft: `${indent}px`,
        flexShrink: 0,
      }}
    >
      {info.hasChildren ? (
        <ExpandIcon
          expanded={expanded}
          onExpand={() => treeState.toggleExpand(key)}
        />
      ) : (
        // 无 children 行渲染 disabled ExpandIcon（spaced 态），对齐 antd `.ant-table-row-expand-icon-spaced`
        // （antd BodyRow 对 rowExpandable=false / 无 children 的行也渲染一个 disabled button，加 -spaced 类，
        // visibility:hidden 占位）。antd expand.ts 第 102-110 行：`&-spaced { &::before/::after { display:none;
        // content:none }, background:transparent, border:0, visibility:hidden }`。容器尺寸同展开图标
        // （17×17 + scale(0.9412)），故占位宽度与 collapsed/expanded 态一致，缩进对齐。
        // 用 disabled ExpandIcon 让 DOM 与 antd 同构（disabled button），尺寸/visibility 由
        //   .dg-expand-icon-spaced CSS 接管（table.css 第 714-720 行），与 antd spaced 态一致。
        <ExpandIcon
          expanded={false}
          disabled
          onExpand={() => treeState.toggleExpand(key)}
        />
      )}
      {/* 图标与内容之间的间隔（对齐 antd 默认间距）。 */}
      <span style={{ display: 'inline-block', width: 4, flexShrink: 0 }} aria-hidden="true" />
    </span>
  )
}

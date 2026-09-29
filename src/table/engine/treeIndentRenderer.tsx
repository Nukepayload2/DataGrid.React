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
  if (key === undefined) return null
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
        // 无 children 行渲染 disabled ExpandIcon（spaced 态）占位，与参照的 `.ant-table-row-expand-icon-spaced`
        // **视觉**对齐（`antd 6.4.4` `es/table/style/expand.js:85` 起的 `&-spaced`：`visibility:hidden`、`border:0`
        // 占位）。⚠️ 参照的 `es/table/ExpandIcon.js:15-28` **从不写 `disabled` 属性** —— 它靠纯 CSS 隐藏；
        // 我方这里写 `disabled` 是一处**已登记的机制分叉**（后果：React 不为 disabled button 跑 `onClick`，
        // 故对它派发点击时**冒泡会打到行上的 `onRow.onClick`**、`onExpand` 不回调；参照那颗没有 `disabled`，
        // handler 跑得到 ⇒ `onExpand` 回调、冒泡被参照自己阻断）。容器尺寸同展开图标（17×17 + scale(0.9412)），
        // 占位宽度与 collapsed/expanded 态一致，缩进对齐；`disabled` 与 `-spaced` 的取舍理由见
        // `docs/reference/known-limitations.md`「展开」节。
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

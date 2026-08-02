import type { Key } from 'react'
import { normalizeFixed } from './columnAdapter'
import { ExpandIcon } from './engine/ExpandIcon'
import { getRowKey } from './engine/GridTable'
import type { EngineColumnNode } from './engine/types'
import type { Expandable, TableLocale } from './types'

/** 展开列稳定 key（用作引擎列 key 与 React key）。 */
export const EXPAND_COLUMN_KEY = '__dg_expand__'

/**
 * 构造展开列叶子节点（data-grid 自研——antd/lun 无独立的展开图标列概念）。
 *
 * 把展开列封装为普通 `EngineColumnNode`（无 children → 叶子），引擎无需感知"展开"语义，
 * 与多级表头 / 固定列 / 合并 / 虚拟滚动 / 选择列透明组合：
 *   - 列宽走 `expandable.columnWidth`（缺省 48px，对齐 antd tableExpandColumnWidth 默认）。
 *   - `align` 默认 'center'（与选择列一致：展开图标居中）。
 *   - `title`：表头格空（展开列表头无内容，与 antd 一致）。
 *   - `render(text, record, index)`：表体格内容——展开/收起图标。
 *       * 可展开行（rowExpandable!==false 且 render 非 null）：渲染展开图标；点击 toggleExpand。
 *       * 不可展开行：渲染禁用态图标（antd 行为：图标灰、不响应），或不渲染（这里选禁用态，
 *         保持列宽对齐——与 antd expand demo "Not Expandable" 行视觉一致：图标可见但禁用）。
 *       * expandable.expandIcon 自定义图标优先。
 *
 * 展开图标点击 → expand.toggleExpand(key, record) → useRowExpand 更新展开态 + 触发 onExpand/onExpandedRowsChange。
 *
 * 详见 `docs/design-notes/expand.md`。
 */
export function buildExpandColumnNode<RecordType>(
  expandable: Expandable<RecordType>,
  expand: {
    isExpanded: (key: Key) => boolean
    expandableKeySet: Set<Key>
    toggleExpand: (key: Key, record: RecordType) => void
  },
  rowKeyResolved: string | ((record: RecordType) => string | number),
  locale: TableLocale,
): EngineColumnNode<RecordType> {
  const { columnTitle, columnWidth, expandIcon, fixed } = expandable
  // 列宽默认：antd 展开列默认宽度 48px（token tableExpandColumnWidth）。用户传 columnWidth 覆盖。
  const width = columnWidth ?? 48
  // 展开列固定居中（与 antd 一致：展开图标居中；antd expandable 无 align 字段）。
  const align = 'center' as const
  const customIcon = typeof expandIcon === 'function' ? expandIcon : undefined

  return {
    key: EXPAND_COLUMN_KEY,
    title: columnTitle ?? null,
    align,
    fixed: normalizeFixed(fixed),
    // 叶子列属性：width/render。dataIndex 不设（展开列不取数据字段）。
    width,
    render: (_text: any, record: RecordType, _index: number) => {
      const key = getRowKey(record, rowKeyResolved)
      const expandable_ = key !== undefined && expand.expandableKeySet.has(key)
      const expanded = key !== undefined && expand.isExpanded(key)
      // 不可展开行：渲染禁用图标（视觉占位，与 antd expand demo "Not Expandable" 行一致）。
      // 可展开行：渲染可点击展开图标。
      if (customIcon) {
        return customIcon({
          expanded,
          record,
          onExpand: (_rec, _e) => {
            if (!expandable_ || key === undefined) return
            expand.toggleExpand(key, record)
          },
        })
      }
      return (
        <ExpandIcon
          expanded={expanded}
          disabled={!expandable_}
          aria-label={
            expanded
              ? typeof locale.collapse === 'string'
                ? locale.collapse
                : undefined
              : typeof locale.expand === 'string'
                ? locale.expand
                : undefined
          }
          onExpand={() => {
            if (!expandable_ || key === undefined) return
            expand.toggleExpand(key, record)
          }}
        />
      )
    },
  }
}

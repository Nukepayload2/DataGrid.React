import { Pagination } from 'antd'
import type { UsePaginationResult } from './engine/usePagination'
import type {
  SizeType,
  TablePaginationConfig,
  TableSemanticClassNames,
  TableSemanticStyles,
} from './types'

export type PaginationSize = 'small' | undefined
export type PaginationAlign = 'start' | 'center' | 'end'

export function getPaginationSize(
  tableSize: SizeType | undefined,
  paginationSize: TablePaginationConfig['size'],
): PaginationSize {
  if (paginationSize === 'small') return 'small'
  if (paginationSize === 'default') return undefined
  return tableSize === 'small' ||
    tableSize === 'middle' ||
    tableSize === 'medium' ||
    tableSize === 'compact'
    ? 'small'
    : undefined
}

export interface RenderPaginationNodeArgs {
  align: PaginationAlign
  paginationConfig: TablePaginationConfig
  paginationInfo: UsePaginationResult
  paginationSize: PaginationSize
  classNamesResolved?: TableSemanticClassNames
  stylesResolved?: TableSemanticStyles
}

/**
 * 构造一个分页节点。形状对齐 antd `InternalTable.renderPagination`（`es/table/InternalTable.js:332-347`
 * 把整份 `mergedClassNames.pagination` 交给 `<Pagination classNames>`，由 Pagination 自己分发语义槽），
 * 差异只在 data-grid 多包一层布局 div：
 * - 语义 `pagination.root` → 外层 `.dg-pagination`（承载对齐与 `table.css:133-138` 的 margin）。
 * - 语义 `pagination.item` → `<Pagination classNames/styles>` 的 **item** 槽（rc-pagination 分发给
 *   每个页码/前后翻页项，`@rc-component/pagination/es/Pagination.js:233,377,399`）。
 * - `pagination.className`/`.style`（用户自己的分页器类名）→ `<Pagination>` 根，走 `classNames.root`
 *   /`styles.root`（antd Pagination 把 `classNames.root` 并进 `extendedClassName`、`styles.root` 并进
 *   `mergedStyle`，与直接传 `className`/`style` 落在同一元素上，实测 DOM 无差）。
 * - `onShowSizeChange` **原样透传**用户回调，不进 `onInternalChange`：rc-pagination 一次改页长会
 *   依次调 `onShowSizeChange(current, size)` 与 `onChange(nextCurrent, size)`
 *   （`@rc-component/pagination/es/Pagination.js:134-142`），两者共用 `onInternalChange` 会让
 *   `pagination.onChange`/`onShowSizeChange`/`Table.onChange` 各触发 2 次；antd 侧同样只把
 *   `onChange` 绑到内部处理（`es/table/hooks/usePagination.js:52-59`）。透传同时保留钳制前的
 *   `current`——`onInternalChange` 只能拿到钳制后的页号，语义会丢。
 */
export function renderPaginationNode({
  align,
  paginationConfig,
  paginationInfo,
  paginationSize,
  classNamesResolved,
  stylesResolved,
}: RenderPaginationNodeArgs) {
  const paginationRootClassName = classNamesResolved?.pagination?.root
  const paginationItemClassName = classNamesResolved?.pagination?.item
  const paginationRootStyle = stylesResolved?.pagination?.root
  const paginationItemStyle = stylesResolved?.pagination?.item

  return (
    <div
      className={[
        'dg-pagination',
        `dg-pagination-${align}`,
        paginationRootClassName,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        // Alignment is provided by dg-pagination-${align}; layout spacing lives in table.css.
        ...(paginationRootStyle ?? null),
      }}
    >
      <Pagination
        current={paginationInfo.current}
        pageSize={paginationInfo.pageSize}
        total={paginationInfo.total}
        showSizeChanger={paginationConfig.showSizeChanger}
        pageSizeOptions={paginationConfig.pageSizeOptions}
        showTotal={paginationConfig.showTotal}
        hideOnSinglePage={paginationConfig.hideOnSinglePage}
        size={paginationSize}
        onChange={paginationInfo.onInternalChange}
        onShowSizeChange={paginationConfig.onShowSizeChange}
        classNames={{
          root: paginationConfig.className,
          item: paginationItemClassName,
        }}
        styles={{
          root: paginationConfig.style,
          item: paginationItemStyle,
        }}
      />
    </div>
  )
}

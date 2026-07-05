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

// Builds one pagination node, matching antd InternalTable.renderPagination shape.
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
        onShowSizeChange={paginationInfo.onInternalChange}
        className={[
          paginationConfig.className,
          paginationItemClassName,
        ]
          .filter(Boolean)
          .join(' ') || undefined}
        style={
          paginationItemStyle
            ? { ...(paginationConfig.style ?? null), ...paginationItemStyle }
            : paginationConfig.style
        }
      />
    </div>
  )
}

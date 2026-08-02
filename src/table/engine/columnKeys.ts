import type { Key } from 'react'
import type { ColumnType } from '../types'

/**
 * 解析 column 的排序标识：优先 column.key，否则 dataIndex（数组路径用 "." 连接）。
 * 与 antd sorter.columnKey 取值一致。
 */
export function resolveColumnSortKey<RecordType>(
  column: ColumnType<RecordType>,
): Key | undefined {
  if (column.key !== undefined) return column.key
  if (Array.isArray(column.dataIndex)) return column.dataIndex.join('.')
  if (typeof column.dataIndex === 'string' || typeof column.dataIndex === 'number') {
    return column.dataIndex
  }
  return undefined
}

/** 解析 column 的筛选标识；与 sortKey 同算法，返回字符串以匹配 filters 参数对象 key。 */
export function resolveFilterKey<RecordType>(
  column: ColumnType<RecordType>,
): string | undefined {
  const key = resolveColumnSortKey(column)
  return key !== undefined ? String(key) : undefined
}

import { getRowKey } from './recordAccess'

export function resolveStandardBodyRowKey<RecordType>(
  record: RecordType,
  rowKey: string | ((record: RecordType) => string | number),
  index: number,
): string | number {
  return getRowKey(record, rowKey) ?? index
}

export function resolveStandardBodyCellKey<RecordType>(
  record: RecordType,
  rowKey: string | ((record: RecordType) => string | number),
  columnIndex: number,
  rowIndex: number,
): string {
  return `b-${columnIndex}-${resolveStandardBodyRowKey(record, rowKey, rowIndex)}`
}

/** 取 record 的字段值（支持 dataIndex 为 string/number/(string|number)[]）。 */
export function getValueByDataIndex(
  record: any,
  dataIndex: string | number | Array<string | number> | undefined | null,
): any {
  if (record === null || record === undefined) return undefined
  if (dataIndex === undefined || dataIndex === null) return undefined
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce((acc, key) => {
      if (acc === null || acc === undefined) return undefined
      return acc[key]
    }, record)
  }
  return record[dataIndex]
}

/** 解析 rowKey 为 key 字符串/数字。 */
export function getRowKey<RecordType>(
  record: RecordType,
  rowKey: string | ((record: RecordType) => string | number),
): string | number {
  if (typeof rowKey === 'function') return rowKey(record)
  const v = (record as any)?.[rowKey]
  return v === undefined ? '' : v
}

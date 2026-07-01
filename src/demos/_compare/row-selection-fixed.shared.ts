/** 记录类型。两侧共用。 */
export interface RecordType {
  key: string
  name: string
}

/** 数据（4 行）。两侧共用，保证对照基准一致。 */
export const data: RecordType[] = [
  { key: '1', name: 'Edward King 0' },
  { key: '2', name: 'Edward King 1' },
  { key: '3', name: 'Edward King 2' },
  { key: '4', name: 'Edward King 3' },
]

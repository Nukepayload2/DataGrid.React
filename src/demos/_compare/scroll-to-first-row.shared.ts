export interface RecordType {
  key: string
  name: string
  group: string
  index: number
}

export const data: RecordType[] = Array.from({ length: 48 }, (_, index) => ({
  key: `${index + 1}`,
  name: `Task ${String(index + 1).padStart(2, '0')}`,
  group: ['North', 'South', 'East', 'West'][index % 4],
  index: index + 1,
}))

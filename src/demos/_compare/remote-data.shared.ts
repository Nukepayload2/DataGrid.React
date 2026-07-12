/** 记录类型。两侧共用。 */
export interface RecordType {
  id: number
  name: string
  gender: 'male' | 'female'
  email: string
}

/**
 * 本地 mock 全量数据（100 条，替代 antd demo 的外部 fetch mockapi.io）。
 * gender 按 index 奇偶交替 male/female；name 用 John/Jane Doe N；email 小写拼接。
 */
export const MOCK_DATA: RecordType[] = Array.from({ length: 100 }).map<RecordType>((_, i) => {
  const gender: 'male' | 'female' = i % 2 === 0 ? 'male' : 'female'
  const first = gender === 'male' ? 'John' : 'Jane'
  return {
    id: i + 1,
    name: `${first} Doe ${i + 1}`,
    gender,
    email: `${first.toLowerCase()}.${i + 1}@example.com`,
  }
})

/** onChange 的 filters 参数类型（Record<string, Array<string|number>|null>）。 */
export type FiltersArg = Record<string, Array<string | number> | null>

/** 排序方向（对齐 antd SorterResult.order）。 */
export type SortOrder = 'ascend' | 'descend' | undefined

/**
 * 服务端请求参数（对齐 antd ajax demo 的 TableParams 形状，字段收敛到 demo 实际消费的子集）。
 */
export interface TableParams {
  /** 受控分页（current / pageSize / total）。 */
  pagination: {
    current?: number
    pageSize?: number
    total?: number
  }
  /** 排序字段（'name'）。 */
  sortField?: string
  /** 排序方向。 */
  sortOrder?: SortOrder
  /** 筛选（gender）。 */
  filters?: FiltersArg
}

/**
 * 模拟服务端请求：按 tableParams 对本地全量 mock 排序/筛选/切片，返回当前页 + total。
 * 用 setTimeout(800ms) 模拟网络延迟（与 antd demo 的真实 fetch 机制等价：loading 态 +
 * 异步回填）。左右两栏共用此函数，保证两侧响应一致。
 */
export function queryData(
  params: TableParams,
): Promise<{ data: RecordType[]; total: number }> {
  const { pagination, filters, sortField, sortOrder } = params
  const current = pagination?.current ?? 1
  const pageSize = pagination?.pageSize ?? 10

  let filtered = MOCK_DATA.slice()
  const genderFilter = filters?.gender
  if (genderFilter && genderFilter.length > 0) {
    filtered = filtered.filter((row) => genderFilter.includes(row.gender))
  }

  if (sortField === 'name' && sortOrder) {
    filtered.sort((a, b) => {
      const cmp = a.name < b.name ? -1 : a.name > b.name ? 1 : 0
      return sortOrder === 'ascend' ? cmp : -cmp
    })
  }

  const total = filtered.length
  const start = (current - 1) * pageSize
  const paged = filtered.slice(start, start + pageSize)

  return new Promise((resolve) => {
    setTimeout(() => resolve({ data: paged, total }), 800)
  })
}

export interface DataType {
  key: string
  task: string
  owner: string
  status: '待处理' | '处理中' | '已完成'
  amount: number
  updatedAt: string
}

const owners = ['陈艾文', '朴敏雅', '贝乔恩', '罗索菲', '史诺亚']
const statuses: DataType['status'][] = ['待处理', '处理中', '已完成']

export const dataSource: DataType[] = Array.from({ length: 72 }, (_, index) => ({
  key: `task-${index + 1}`,
  task: `运营工单 ${String(index + 1).padStart(2, '0')}`,
  owner: owners[index % owners.length],
  status: statuses[index % statuses.length],
  amount: 1200 + index * 175,
  updatedAt: `2026-08-${String((index % 28) + 1).padStart(2, '0')}`,
}))

export const selectedCount = 3
export const summaryOffset = 56

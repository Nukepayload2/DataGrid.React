export interface DataType {
  key: string
  initiative: string
  owner: string
  status: '正常' | '有风险' | '受阻'
  impact: string
  target: string
  notes: string
}

const owners = ['陈艾文', '朴敏雅', '贝乔恩', '罗索菲', '史诺亚']
const statuses: DataType['status'][] = ['正常', '有风险', '正常', '受阻']
const impacts = ['收入', '可靠性', '合规', '运营', '客户']

export const dataSource: DataType[] = Array.from({ length: 48 }).map<DataType>(
  (_, i) => ({
    key: `initiative-${i + 1}`,
    initiative: `季度管控评审 ${i + 1}`,
    owner: owners[i % owners.length],
    status: statuses[i % statuses.length],
    impact: impacts[i % impacts.length],
    target: `2026-Q${(i % 4) + 1}`,
    notes:
      i % 4 === 3
        ? '等待依赖团队确认后，证据包才能关闭。'
        : '证据、负责人备注和后续行动都在此评审页中跟踪。',
  }),
)

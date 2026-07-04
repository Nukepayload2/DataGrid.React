export interface DataType {
  key: string
  initiative: string
  owner: string
  status: 'On track' | 'At risk' | 'Blocked'
  impact: string
  target: string
  notes: string
}

const owners = ['Avery Chen', 'Mina Park', 'Jon Bell', 'Sofia Rossi', 'Noah Smith']
const statuses: DataType['status'][] = ['On track', 'At risk', 'On track', 'Blocked']
const impacts = ['Revenue', 'Reliability', 'Compliance', 'Operations', 'Customer']

export const dataSource: DataType[] = Array.from({ length: 48 }).map<DataType>(
  (_, i) => ({
    key: `initiative-${i + 1}`,
    initiative: `Quarterly control review ${i + 1}`,
    owner: owners[i % owners.length],
    status: statuses[i % statuses.length],
    impact: impacts[i % impacts.length],
    target: `2026-Q${(i % 4) + 1}`,
    notes:
      i % 4 === 3
        ? 'Waiting for dependent team sign-off before the evidence packet can close.'
        : 'Evidence, owner notes, and follow-up actions are tracked in this review page.',
  }),
)

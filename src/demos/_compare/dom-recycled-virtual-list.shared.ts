export type RecyclingRow = {
  id: number
  account: string
  status: 'Open' | 'Review' | 'Closed'
  region: string
  owner: string
  priority: 'P0' | 'P1' | 'P2'
  amount: number
  score: number
  updated: string
  city: string
  channel: string
  product: string
  segment: string
  risk: string
  sla: string
  notes: string
  flag: string
}

export type RecyclingRowCountOption = 8000 | 1048576

export const DEFAULT_RECYCLING_ROW_COUNT: RecyclingRowCountOption = 8000
export const LARGE_RECYCLING_ROW_COUNT: RecyclingRowCountOption = 1048576
export const RECYCLING_SCROLL_X = 1800

const regions = ['NA', 'EU', 'APAC', 'LATAM']
const owners = ['Ada', 'Grace', 'Linus', 'Ken', 'Radia', 'Margaret']
const cities = ['Tokyo', 'Berlin', 'Seattle', 'Singapore', 'Paris', 'Shenzhen']
const channels = ['Direct', 'Partner', 'Web', 'Field']
const products = ['Core', 'Edge', 'Vault', 'Flow', 'Pulse']
const segments = ['Enterprise', 'Mid Market', 'Startup']
const statuses: RecyclingRow['status'][] = ['Open', 'Review', 'Closed']
const priorities: RecyclingRow['priority'][] = ['P0', 'P1', 'P2']

export function makeRecyclingRows(count: number): RecyclingRow[] {
  const rows: RecyclingRow[] = Array.from({ length: count })
  for (let index = 0; index < count; index += 1) {
    rows[index] = {
      id: index + 1,
      account: `AC-${String(index + 1).padStart(5, '0')}`,
      status: statuses[index % statuses.length],
      region: regions[index % regions.length],
      owner: owners[index % owners.length],
      priority: priorities[index % priorities.length],
      amount: 5000 + (index * 137) % 90000,
      score: 40 + (index * 7) % 60,
      updated: `2026-07-${String((index % 28) + 1).padStart(2, '0')}`,
      city: cities[index % cities.length],
      channel: channels[index % channels.length],
      product: products[index % products.length],
      segment: segments[index % segments.length],
      risk: index % 9 === 0 ? 'High' : index % 5 === 0 ? 'Medium' : 'Low',
      sla: `${4 + (index % 6)}h`,
      notes: `Batch ${Math.floor(index / 50)} item ${index % 50}`,
      flag: index % 11 === 0 ? 'Watch' : 'Normal',
    }
  }
  return rows
}

export interface RecordType {
  key: string
  name: string
  team: string
  score: number
}

export const data: RecordType[] = [
  { key: '1', name: 'Ada Chen', team: 'Platform', score: 91 },
  { key: '2', name: 'Bo Lin', team: 'Platform', score: 86 },
  { key: '3', name: 'Cara Wu', team: 'Billing', score: 78 },
  { key: '4', name: 'Drew Ma', team: 'Billing', score: 88 },
  { key: '5', name: 'Eli Sun', team: 'Growth', score: 83 },
  { key: '6', name: 'Faye Lu', team: 'Growth', score: 94 },
  { key: '7', name: 'Gina He', team: 'Ops', score: 80 },
  { key: '8', name: 'Hank Qi', team: 'Ops', score: 76 },
]

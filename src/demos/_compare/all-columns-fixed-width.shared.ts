export interface RecordType {
  key: string
  ticket: string
  queue: string
  owner: string
  sla: string
}

export const data: RecordType[] = [
  { key: '1', ticket: 'INC-1042', queue: 'Billing', owner: 'Ada', sla: '2h' },
  { key: '2', ticket: 'INC-1088', queue: 'Identity', owner: 'Ben', sla: '4h' },
  { key: '3', ticket: 'INC-1130', queue: 'Platform', owner: 'Chen', sla: '1d' },
  { key: '4', ticket: 'INC-1186', queue: 'Mobile', owner: 'Dina', sla: '8h' },
]

export const declaredWidthTotal = 360

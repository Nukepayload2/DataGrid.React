import type { ReactNode } from 'react'

export interface DocSectionMeta {
  id: string
  title: string
}

export interface DocsAction {
  label: string
  kind: 'doc' | 'path'
  value: string
}

export interface DocsPageContext {
  goDoc: (slug: string) => void
  onOpen: (action: DocsAction) => void
}

export interface DocEntry {
  slug: string
  group: string
  title: string
  description: string
  appliesTo?: string
  updated?: string
  sections: DocSectionMeta[]
  render: (context: DocsPageContext) => ReactNode
}

export interface DocGroup {
  group: string
  items: DocEntry[]
}

import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'

export interface DemoMeta {
  /** 新主 id，也是主路由片段、demo 文件基名和源码加载 key。 */
  name: string
  /** 旧 id / 旧路由，用于兼容跳转和搜索。 */
  aliases?: string[]
  /** 中文展示标题。 */
  title: string
  /** 关键 API 或配置项，用于菜单副标题和搜索。 */
  subtitle?: string
  /** 一句话说明。 */
  description?: string
  /** 懒加载组件。 */
  element: () => Promise<{ default: ComponentType }>
  /** 是否为左右对比 demo。 */
  compare?: boolean
  /** 首页分组类别。 */
  category: string
}

/** 按类别分组的 demo 集合。 */
export interface CategoryGroup {
  category: string
  items: DemoMeta[]
}

/** 按首次出现顺序分组。 */
export function groupByCategory(list: DemoMeta[]): CategoryGroup[] {
  const order: string[] = []
  const map = new Map<string, DemoMeta[]>()
  for (const d of list) {
    if (!map.has(d.category)) {
      map.set(d.category, [])
      order.push(d.category)
    }
    map.get(d.category)!.push(d)
  }
  return order.map((category) => ({ category, items: map.get(category)! }))
}

/** 解析当前 hash 为路径段数组。 */
function parseHash(): string[] {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0] ?? ''
  if (raw === '') return []
  return raw.split('/').filter(Boolean)
}

function parseHashSearch(): string {
  const raw = window.location.hash
  const queryStart = raw.indexOf('?')
  return queryStart >= 0 ? raw.slice(queryStart + 1) : ''
}

export function useHashRoute(): string[] {
  const [segments, setSegments] = useState<string[]>(() =>
    typeof window === 'undefined' ? [] : parseHash(),
  )
  useEffect(() => {
    const onChange = () => setSegments(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return segments
}

export function useHashSearchParams(): URLSearchParams {
  const [search, setSearch] = useState<string>(() =>
    typeof window === 'undefined' ? '' : parseHashSearch(),
  )
  useEffect(() => {
    const onChange = () => setSearch(parseHashSearch())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return useMemo(() => new URLSearchParams(search), [search])
}

export function normalizeHashPath(path: string): string {
  return path.startsWith('#') ? path : `#${path.startsWith('/') ? '' : '/'}${path}`
}

export function navigate(path: string): void {
  const normalized = normalizeHashPath(path)
  if (window.location.hash !== normalized) {
    window.location.hash = normalized
  }
}

export function replaceHash(path: string): void {
  const normalized = normalizeHashPath(path)
  if (window.location.hash !== normalized) {
    window.location.replace(`${window.location.pathname}${window.location.search}${normalized}`)
  }
}
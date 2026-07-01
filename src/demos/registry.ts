import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'

export interface DemoMeta {
  /** 路由名，如 'basic'。对应访问路径 #/demos/basic。 */
  name: string
  /** 展示标题。 */
  title: string
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
  const raw = window.location.hash.replace(/^#\/?/, '')
  if (raw === '') return []
  return raw.split('/').filter(Boolean)
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

export function navigate(path: string): void {
  const normalized = path.startsWith('#') ? path : `#${path.startsWith('/') ? '' : '/'}${path}`
  if (window.location.hash !== normalized) {
    window.location.hash = normalized
  }
}

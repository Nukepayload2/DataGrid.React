/**
 * data-grid demo 框架：轻量 hash 路由（F4）。
 *
 * 自建极简路由，避免引入 react-router 这类重型依赖（决策：发布形态为项目内组件 + dev demo）。
 *
 * 路由约定：
 *   #/              → demo 列表首页
 *   #/demos/<name>  → 具体 demo
 */

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
  /**
   * 决策 9：是否为左右对比 demo（左 data-grid / 右 antd 同名 demo）。
   * opt-in：未声明时当作 false（其它 demo 不受影响）。列表页会显示「对比」徽章。
   */
  compare?: boolean
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

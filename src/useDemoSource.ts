/**
 * useDemoSource：按 demo 名懒加载源码字符串。
 *
 * 用 Vite 的 import.meta.glob '?raw' + eager:false，与 demo 懒加载机制一致。
 * 模块级 cache Map 跨组件实例复用，避免重复请求模块。
 *
 * @param name demo 名（对应 src/demos/<name>.tsx 文件）；undefined/null/空 → 不加载。
 * @returns { source: string | null, loading: boolean }
 *          - source：源码字符串（加载完成），或 null（未加载 / 加载中 / name 为空）。
 *          - loading：true 表示正在请求模块（cache 未命中）。
 *
 * 注意 cleanup：name 切换时丢弃过期结果（用闭包捕获的 name 比对当前 name）。
 */
import { useEffect, useState } from 'react'

const sources = import.meta.glob('./demos/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: false,
})

const cache = new Map<string, string>()

export function useDemoSource(name?: string): {
  source: string | null
  loading: boolean
} {
  const [source, setSource] = useState<string | null>(() =>
    name && cache.has(name) ? (cache.get(name) as string) : null,
  )
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    if (!name) {
      setSource(null)
      setLoading(false)
      return
    }

    // cache 命中：直接 set（避免异步闪烁）。
    if (cache.has(name)) {
      setSource(cache.get(name) as string)
      setLoading(false)
      return
    }

    setLoading(true)
    let cancelled = false
    const loader = sources[`./demos/${name}.tsx`]
    loader?.()
      .then((s) => {
        // cleanup：name 切换后丢弃过期结果。
        if (cancelled) return
        cache.set(name, s as string)
        setSource(s as string)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setSource(null)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [name])

  return { source, loading }
}

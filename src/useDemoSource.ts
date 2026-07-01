/** 按 demo 名懒加载单文件源码，并复用模块级缓存。 */
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

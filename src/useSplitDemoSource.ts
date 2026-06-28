/**
 * useSplitDemoSource：按 demo 名懒加载 split demo 子文件源码（dg + antd 两段）。
 *
 * 仿 useDemoSource.ts 模式。用两条 `import.meta.glob '?raw'`：
 *   - `'./demos/*.dg.tsx'`   → data-grid 段
 *   - `'./demos/*.antd.tsx'` → antd 段
 *
 * 模块级 cache Map 跨组件实例复用，避免重复请求模块。
 *
 * @param name demo 名（对应 src/demos/<name>.dg.tsx / <name>.antd.tsx）；undefined/空 → 不加载。
 * @returns { dgSource, antdSource, loading }
 *          - dgSource/antdSource：源码字符串（加载完成），或 null（未加载 / 加载中 / name 空）。
 *          - loading：true 表示至少一段仍在请求模块（cache 未命中）。
 *
 * 注意 cleanup：name 切换时丢弃过期结果（用闭包捕获的 cancelled 比对）。
 */
import { useEffect, useState } from 'react'

const dgSources = import.meta.glob('./demos/*.dg.tsx', {
  query: '?raw',
  import: 'default',
  eager: false,
})
const antdSources = import.meta.glob('./demos/*.antd.tsx', {
  query: '?raw',
  import: 'default',
  eager: false,
})

const dgCache = new Map<string, string>()
const antdCache = new Map<string, string>()

export function useSplitDemoSource(name?: string): {
  dgSource: string | null
  antdSource: string | null
  loading: boolean
} {
  const [dgSource, setDgSource] = useState<string | null>(() =>
    name && dgCache.has(name) ? (dgCache.get(name) as string) : null,
  )
  const [antdSource, setAntdSource] = useState<string | null>(() =>
    name && antdCache.has(name) ? (antdCache.get(name) as string) : null,
  )
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    if (!name) {
      setDgSource(null)
      setAntdSource(null)
      setLoading(false)
      return
    }

    const dgCached = dgCache.has(name)
    const antdCached = antdCache.has(name)

    // 全 cache 命中：同步 set，避免异步闪烁。
    if (dgCached && antdCached) {
      setDgSource(dgCache.get(name) as string)
      setAntdSource(antdCache.get(name) as string)
      setLoading(false)
      return
    }

    setLoading(true)
    let cancelled = false

    const dgLoader = dgSources[`./demos/${name}.dg.tsx`]
    const antdLoader = antdSources[`./demos/${name}.antd.tsx`]

    const dgP = dgLoader ? dgLoader() : Promise.resolve(null)
    const antdP = antdLoader ? antdLoader() : Promise.resolve(null)

    Promise.all([dgP, antdP])
      .then(([dg, antd]) => {
        if (cancelled) return
        if (typeof dg === 'string') {
          dgCache.set(name, dg)
          setDgSource(dg)
        } else {
          setDgSource(null)
        }
        if (typeof antd === 'string') {
          antdCache.set(name, antd)
          setAntdSource(antd)
        } else {
          setAntdSource(null)
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setDgSource(null)
        setAntdSource(null)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [name])

  return { dgSource, antdSource, loading }
}

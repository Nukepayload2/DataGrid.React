/** 按 demo 名懒加载 split demo 两段源码，并复用模块级缓存。 */
import { useEffect, useReducer } from 'react'

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

interface SplitDemoState {
  dgSource: string | null
  antdSource: string | null
  loading: boolean
}

// Stage 6 #9: 用 useReducer 合并 3 个 setState 到单一 state（react-doctor
// no-cascading-set-state：连发 setState 触发多次 redraw）。
type SplitDemoAction =
  | { type: 'reset' }
  | { type: 'loaded'; dg: string | null; antd: string | null }
  | { type: 'setLoading'; loading: boolean }

function splitDemoReducer(
  state: SplitDemoState,
  action: SplitDemoAction,
): SplitDemoState {
  switch (action.type) {
    case 'reset':
      return { dgSource: null, antdSource: null, loading: false }
    case 'loaded':
      return { dgSource: action.dg, antdSource: action.antd, loading: false }
    case 'setLoading':
      return action.loading === state.loading
        ? state
        : { ...state, loading: action.loading }
    default:
      return state
  }
}

export function useSplitDemoSource(name?: string): {
  dgSource: string | null
  antdSource: string | null
  loading: boolean
} {
  const [state, dispatch] = useReducer(splitDemoReducer, undefined, () => ({
    dgSource:
      name && dgCache.has(name) ? (dgCache.get(name) as string) : null,
    antdSource:
      name && antdCache.has(name) ? (antdCache.get(name) as string) : null,
    loading: false,
  }))

  useEffect(() => {
    if (!name) {
      dispatch({ type: 'reset' })
      return
    }

    const dgCached = dgCache.has(name)
    const antdCached = antdCache.has(name)

    // 全 cache 命中：同步 set，避免异步闪烁。
    if (dgCached && antdCached) {
      dispatch({
        type: 'loaded',
        dg: dgCache.get(name) as string,
        antd: antdCache.get(name) as string,
      })
      return
    }

    dispatch({ type: 'setLoading', loading: true })
    let cancelled = false

    const dgLoader = dgSources[`./demos/${name}.dg.tsx`]
    const antdLoader = antdSources[`./demos/${name}.antd.tsx`]

    const dgP = dgLoader ? dgLoader() : Promise.resolve(null)
    const antdP = antdLoader ? antdLoader() : Promise.resolve(null)

    Promise.all([dgP, antdP])
      .then(([dg, antd]) => {
        if (cancelled) return
        if (typeof dg === 'string') dgCache.set(name, dg)
        if (typeof antd === 'string') antdCache.set(name, antd)
        dispatch({
          type: 'loaded',
          dg: typeof dg === 'string' ? dg : null,
          antd: typeof antd === 'string' ? antd : null,
        })
      })
      .catch(() => {
        if (cancelled) return
        dispatch({ type: 'loaded', dg: null, antd: null })
      })

    return () => {
      cancelled = true
    }
  }, [name])

  return state
}

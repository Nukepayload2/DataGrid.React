/**
 * data-grid dev demo 框架入口（F4）。
 *
 * 路由：
 *   #/             → demo 列表
 *   #/demos/<name> → 具体 demo
 */

import { lazy, Suspense, useMemo } from 'react'
import { demos } from './demos'
import { navigate, useHashRoute } from './demos/registry'

const lazyDemos = demos.map((d) => ({
  meta: d,
  Comp: lazy(() => d.element().then((m) => ({ default: m.default }))),
}))

function App() {
  const segments = useHashRoute()

  const view = useMemo(() => {
    if (segments.length === 0) return { kind: 'list' as const }
    if (segments[0] === 'demos' && segments[1]) {
      const match = lazyDemos.find((d) => d.meta.name === segments[1])
      if (match) return { kind: 'demo' as const, match }
    }
    return { kind: 'notFound' as const }
  }, [segments])

  return (
    <div className="app">
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>data-grid demos</h1>
        <p style={{ margin: '4px 0 0', color: 'rgba(0,0,0,0.65)' }}>
          CSS Grid based table, antd Table API compatible.
        </p>
      </header>

      {view.kind === 'list' ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {lazyDemos.map(({ meta }) => (
            <li key={meta.name}>
              <a
                href={`#/demos/${meta.name}`}
                onClick={() => navigate(`/demos/${meta.name}`)}
                style={{ display: 'block', padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, background: '#fff', textDecoration: 'none', color: '#1677ff' }}
              >
                <strong>{meta.title}</strong>
                {meta.description ? (
                  <span style={{ display: 'block', color: 'rgba(0,0,0,0.65)', marginTop: 4, fontSize: 13 }}>
                    {meta.description}
                  </span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {view.kind === 'demo' ? (
        <div>
          <div style={{ marginBottom: 12 }}>
            <a href="#/" onClick={() => navigate('/')} style={{ color: '#1677ff' }}>
              ← Back to demo list
            </a>
            <span style={{ marginLeft: 8, color: 'rgba(0,0,0,0.65)' }}>{view.match.meta.title}</span>
          </div>
          <Suspense fallback={<div>Loading demo…</div>}>
            <view.match.Comp />
          </Suspense>
        </div>
      ) : null}

      {view.kind === 'notFound' ? (
        <div>
          <p>Demo not found.</p>
          <a href="#/" onClick={() => navigate('/')} style={{ color: '#1677ff' }}>
            ← Back to demo list
          </a>
        </div>
      ) : null}
    </div>
  )
}

export default App

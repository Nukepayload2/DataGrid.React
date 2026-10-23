/**
 * 契约：`src/demos/**` 里 `import { … } from 'antd'` 的**运行时**名字都必须在 live antd 白名单里。
 *
 * 为什么需要：live 作用域把 `import('antd')` 换成了 `src/live/antdScope.ts` 的显式白名单
 * （命名空间导入会把整包 80+ 组件合并进首屏 chunk，实测 1 638 KB eager）。
 * 代价是新增 demo 一旦用了没登记的组件，**只有 live 编辑会静默失真**（渲染 `[antd.?]` 占位），
 * demo 页面本身照常 —— 这类缺陷最难被发现，所以在测试里钉住。
 */
import { describe, expect, it } from 'vitest'
import { liveAntd } from '../../src/live/antdScope'

const demoSources = import.meta.glob('../../src/demos/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/**
 * 只存在于类型层的导入：sucrase 编译期整条擦除，不需要进运行时白名单。
 * 新增登记时必须给出理由（这是"允许漏出白名单"的唯一通道）。
 */
const TYPE_ONLY = new Set([
  'CheckboxOptionType',
  'GetProp',
  'GetRef',
  'InputRef',
  'RadioChangeEvent',
  'TableColumnType',
  'TableColumnsType',
  'TableProps',
  'type TableProps',
])

function importedAntdNames(source: string): string[] {
  const names: string[] = []
  const pattern = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*['"]antd['"]/g
  for (const match of source.matchAll(pattern)) {
    if (match[0].includes('import type')) continue
    for (const raw of match[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0]?.trim()
      if (name) names.push(name)
    }
  }
  return names
}

describe('live antd 白名单', () => {
  it('覆盖 src/demos 用到的全部运行时具名导入', () => {
    const missing: string[] = []
    for (const [path, source] of Object.entries(demoSources)) {
      for (const name of importedAntdNames(source)) {
        if (TYPE_ONLY.has(name)) continue
        if (!(name in liveAntd)) missing.push(`${path.replace('../../src/demos/', '')} → ${name}`)
      }
    }
    expect([...new Set(missing)], '把缺的组件加到 src/live/antdScope.ts').toEqual([])
  })

  it('白名单里的每一项都是 antd 的真实导出', async () => {
    const antd = await import('antd')
    for (const key of Object.keys(liveAntd)) {
      expect(antd, `antd 没有导出 ${key}`).toHaveProperty(key)
    }
  })
})

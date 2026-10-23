/**
 * 契约：`src/demos/**` 里每个 `@ant-design/icons` 具名导入都必须在 live 图标白名单里。
 *
 * 为什么需要这条：live 作用域把 `@ant-design/icons` 换成了白名单（`src/live/icons.ts`），
 * 这样才不会把 836 个图标全打进 live chunk。代价是"新增 demo 用了新图标"时，
 * 白名单漏登记会让**该 demo 的 live 编辑静默失真**（渲染占位 `?`），而 demo 页面本身
 * 仍然正常（它走真实 import）—— 这种"只在编辑器里坏"的缺陷最难被发现，所以钉在测试里。
 */
import { describe, expect, it } from 'vitest'
import { liveIcons } from '../../src/live/icons'

const demoSources = import.meta.glob('../../src/demos/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** 从一份源码里抽出 `import { A, B as C } from '@ant-design/icons'` 的原始导出名。 */
function importedIconNames(source: string): string[] {
  const names: string[] = []
  const pattern = /import\s*\{([^}]+)\}\s*from\s*['"]@ant-design\/icons['"]/g
  for (const match of source.matchAll(pattern)) {
    for (const part of match[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0]?.trim()
      if (name) names.push(name)
    }
  }
  return names
}

describe('live 图标白名单', () => {
  it('覆盖 src/demos 里用到的全部 @ant-design/icons 具名导入', () => {
    const missing: string[] = []
    for (const [path, source] of Object.entries(demoSources)) {
      for (const name of importedIconNames(source)) {
        if (!(name in liveIcons)) missing.push(`${path.replace('../../src/demos/', '')} → ${name}`)
      }
    }
    expect(missing, '把缺的图标加到 src/live/icons.ts 的白名单').toEqual([])
  })

  it('白名单自身没有重复登记或明显笔误', () => {
    const keys = Object.keys(liveIcons)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.length).toBeGreaterThan(20)
    for (const key of keys) expect(key).toMatch(/^[A-Z][A-Za-z0-9]*$/)
  })
})

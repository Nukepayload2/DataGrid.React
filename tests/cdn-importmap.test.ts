/**
 * CDN 档 import map 的契约测试。
 *
 * 生成表（`src/docs/generated/cdn-importmap.json`）是 import map 的唯一来源，
 * 三种落地策略的差别全在 `scripts/gen-cdn-importmap.mjs` 的 `CDN_ROOTS` 表里。
 * 这里锁的是"表的形状与每条 URL 的落地方式"，构建期守卫（`docs:cdn-guard`）锁
 * "产物里没留下不该留的东西"。两者都不联网 —— esm.sh 的真实行为交给
 * `pnpm check:esmsh` 这个手动探针。
 *
 * 为什么不构建产物来测：构建一次几十秒，且无法验证 esm.sh 侧是否内联。
 */
import { describe, expect, it } from 'vitest'
import antdPkg from 'antd/package.json'
import reactPkg from 'react/package.json'
import reactDomPkg from 'react-dom/package.json'
import cdnMapJson from '../src/docs/generated/cdn-importmap.json'
import { CDN_EXTERNALS, createEsmShImportMap, type CdnImportMap } from '../vite.docs.shared'

const cdnMap = cdnMapJson as CdnImportMap
const importMap = createEsmShImportMap()
const bySpecifier = new Map(cdnMap.entries.map((entry) => [entry.specifier, entry]))
const familyEntries = cdnMap.entries.filter((entry) => entry.strategy === 'family')

describe('cdn import map / 表本身的形状', () => {
  it('每个 external 都恰好有一条映射，反之亦然（不存在写了却没用的键）', () => {
    expect([...CDN_EXTERNALS].sort()).toEqual(cdnMap.entries.map((entry) => entry.specifier).sort())
    expect(Object.keys(importMap).sort()).toEqual([...CDN_EXTERNALS].sort())
  })

  it('策略只有 single / bundle / family 三种', () => {
    for (const entry of cdnMap.entries) {
      expect(['single', 'bundle', 'family']).toContain(entry.strategy)
    }
  })

  it('import map 的值就是表里的 url（配置层不再自己拼 URL）', () => {
    for (const entry of cdnMap.entries) {
      expect(importMap[entry.specifier]).toBe(entry.url)
    }
  })
})

describe('cdn import map / 版本取自各自的 package.json', () => {
  it('react 族三条与 antd 的版本各自对齐本地安装版本', () => {
    expect(bySpecifier.get('react')?.version).toBe(reactPkg.version)
    expect(bySpecifier.get('react/jsx-runtime')?.version).toBe(reactPkg.version)
    expect(bySpecifier.get('antd')?.version).toBe(antdPkg.version)
  })

  it('react-dom 用自己的版本，不许复用 react 的（历史 bug 回归）', () => {
    // react-dom 的 peer 是 react ^19：pnpm 完全可能装出 react 19.3 + react-dom 19.2，
    // 复用的写法会 pin 出一个不存在的版本 ⇒ esm.sh 404。
    expect(bySpecifier.get('react-dom')?.version).toBe(reactDomPkg.version)
    expect(bySpecifier.get('react-dom/client')?.version).toBe(reactDomPkg.version)
  })

  it('每条 URL 里的版本号与表里的 version 一致', () => {
    for (const entry of cdnMap.entries) {
      expect(entry.url, `${entry.specifier} 的 URL 版本与表不一致`).toContain(
        `/${entry.package}@${entry.version}`,
      )
    }
  })
})

describe('cdn import map / single + bundle', () => {
  it('single 组不带 ?bundle，只声明自己的共享集', () => {
    for (const entry of cdnMap.entries.filter((item) => item.strategy === 'single')) {
      expect(entry.url, `${entry.specifier} 不该带 bundle`).not.toMatch(/[?&]bundle\b/)
    }
    expect(bySpecifier.get('react-dom')?.url).toBe(
      `https://esm.sh/react-dom@${reactDomPkg.version}?external=react`,
    )
    expect(bySpecifier.get('react')?.url).toBe(`https://esm.sh/react@${reactPkg.version}`)
  })

  it('antd 必须带 external=react,react-dom 且带 bundle（否则拆成上千个请求）', () => {
    const antd = bySpecifier.get('antd')
    expect(antd?.url).toBe(
      `https://esm.sh/antd@${antdPkg.version}?external=react,react-dom&bundle`,
    )
  })
})

describe('cdn import map / family（引用相等的那一族）', () => {
  it('闭包里每个包各占一条，且每条的 ?external= 都列全整个族', () => {
    expect(familyEntries.length).toBeGreaterThanOrEqual(18)
    const familyPackages = new Set(familyEntries.map((entry) => entry.package))
    for (const entry of familyEntries) {
      const declared = new URL(entry.url).searchParams.get('external')?.split(',') ?? []
      expect(new Set(declared), `${entry.specifier} 的 external 不全`).toEqual(familyPackages)
    }
  })

  it('family 组严禁 ?bundle（会内联私有实例 ⇒ instanceof 断裂）', () => {
    for (const entry of familyEntries) {
      expect(entry.url, `${entry.specifier} 带了 ?bundle`).not.toMatch(/[?&]bundle\b/)
    }
  })

  it('family 组的每个包都在 CDN_EXTERNALS 里（否则会被静默打进本地 chunk）', () => {
    for (const entry of familyEntries) {
      expect(CDN_EXTERNALS).toContain(entry.specifier)
    }
  })
})

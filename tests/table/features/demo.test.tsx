// 黑盒 demo 遍历层（挂载 + registry 一致性），对齐 antd tests/shared/demoTest.tsx 机制：
//   G:\Projects\ant-design\tests\shared\demoTest.tsx
//   - antd demoTest：glob 组件 demo/*.tsx 逐个 renderToString 快照；data-grid 版拆成两层：
//     · 本文件 = mountAll（渲染/卸载不抛）+ registry 一致性；
//     · 快照基线按 registry 类目拆到 demo-snapshot.<slug>.test.tsx（抽片见 tests/shared/demoGroups.ts）。
//   - antd 的 kebab-case 命名一致性检查（demoTest 尾部 'component name is match
//     the kebab-case' 用例）→ 这里重映射为 registry 一致性检查：所有 demos[].name
//     匹配 kebab-case 正则且全局唯一（name 是主 id / 路由片段 / 文件基名，见
//     src/demos/registry.ts DemoMeta.name 注释）。
//
// 覆盖：
//   - mountAll()：全量 66 遍历，无额外 skip（挂载/卸载不抛）。
//   - 抽片完整性：registry 每个类目都已在 DEMO_CATEGORY_SLUGS 登记且片非空
//     （新增 demo 引入新类目时直接失败，而不是悄悄不进任何快照片）。
//
// 为什么 mount 与快照分家：mount 是「不抛」的廉价全量冒烟，断言面与快照无关；
// 快照需按类目切片以便定位回归，两者生命周期与审阅方式不同。
// jsdom 无布局：虚拟 demo 按 rowHeight 兜底渲染，mount 安全，不做尺寸断言。
import { describe, expect, it } from 'vitest'

import { demos } from '../../../src/demos/index'
import { mountAll } from '../../shared/demoHarness'
import { DEMO_CATEGORY_SLUGS, assertDemoCategoriesRegistered, demosForCategory } from '../../shared/demoGroups'

describe('demo', () => {
  mountAll()

  // 对齐 antd demoTest 的 kebab-case 命名检查（重映射为 registry name 检查）。
  it('registry names are kebab-case', () => {
    const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/
    const bad = demos.filter((demo) => !kebab.test(demo.name)).map((demo) => demo.name)
    expect(bad).toEqual([])
  })

  it('registry names are unique', () => {
    const counts = new Map<string, number>()
    for (const demo of demos) {
      counts.set(demo.name, (counts.get(demo.name) ?? 0) + 1)
    }
    const dup = [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name)
    expect(dup).toEqual([])
  })

  // 快照抽片覆盖完整性：每个 demo 恰好进一个片，且片内成员数与 registry 一致。
  it('every demo falls into exactly one snapshot group', () => {
    expect(() => assertDemoCategoriesRegistered()).not.toThrow()

    const grouped = Object.keys(DEMO_CATEGORY_SLUGS).flatMap((category) =>
      demosForCategory(category).map((demo) => demo.name),
    )
    expect(grouped.slice().sort()).toEqual(demos.map((demo) => demo.name).sort())
    expect(new Set(grouped).size).toBe(grouped.length)
  })
})

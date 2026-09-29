/**
 * 23-A 生效排序方向的**合并判据 + 表级接缝**门（步骤 59 / E-156 端到端收尾）。
 *
 * 为什么这一份门落在 `tests/table/engine/**`（白盒接缝层），而箭头节点计数的黑盒门在
 * `tests/table/features/Table.sorter.test.tsx`：
 *   - 判据「列级已配置 ⇒ 用列级；列级未配置 ⇒ 用表级；两者都无 ⇒ 不写值（渲染走缺省分支）」
 *     在本仓**只有一份实现**（`src/table/columnAdapter.ts` 的 `toEngineColumns`），
 *     它的入参是 Table 级 `sortDirections` ⇒ 只能从适配层接缝喂进来（黑盒 `<Table>` 那一跳在
 *     `src/table/Table.tsx:590-598`，步骤 59 禁写该行 ⇒ 表级向量在 `<Table>` 面上仍不裁剪，
 *     判词与一行补法见 `tmp/vortex-logs/fix-real-bugs/59-implementer-23a-wiring.md` §4/§10）。
 *   - 本文件把「hook 选项 → 列树节点 → 两条表头路径 → DOM」这一段用**真渲染**钉住：
 *     `useColumnTreeBuilder` 产树 → `<GridTable columnTree>` 渲染（单层=maxDepth1 ⇒ flat 路径
 *     `engine/FlatColumnCells.tsx`；分组=maxDepth2 ⇒ multi 路径 `engine/HeaderCell.tsx`）。
 *
 * 参照取值式（antd 6.4.4 实读）：
 *   - `es/table/InternalTable.js:223` `sortDirections || ['ascend','descend']`（表级 ∥ 默认序列）
 *   - `es/table/hooks/useSorter.js:75` `newColumn.sortDirections || defaultSortDirections`（列级 ∥ 表级）
 *   - `:89`/`:94` 用该结果决定 caret **节点存在性**；`:98-101` 两枚都在才 `-column-sorter-full`
 * 双侧实测基线：`tmp/59-probe-after-table.txt`（16 向量 × dg/antd）。
 */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// 真结构样式文本：`css:false` 下 `?inline`/`?raw` 都会被 vitest 变成空串（步骤 59 实测）⇒ 只能从磁盘读。
// @ts-expect-error TS2591：本仓无 @types/node，'node:fs' 无类型声明（运行时可用）
import { readFileSync } from 'node:fs'

import { toEngineColumns } from '../../../../src/table/columnAdapter'
import { useColumnTreeBuilder } from '../../../../src/table/useColumnTreeBuilder'
import { GridTable } from '../../../../src/table/engine/GridTable'
import type { EngineColumnNode } from '../../../../src/table/engine/types'

const DATA = [
  { key: 0, name: 'Jack', age: 22 },
  { key: 1, name: 'Lucy', age: 25 },
]

const cmpAge = (a: any, b: any) => a.age - b.age

/** 单层两列（其中 Age 可排序）；`colExtra` 贴到可排序列上。 */
const flatCols = (colExtra: Record<string, unknown> = {}) =>
  [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Age', dataIndex: 'age', key: 'age', sorter: cmpAge, ...colExtra },
  ] as any[]

/** 分组两列（叶子 Age 可排序）⇒ 逼出 GridTable 的 multi 表头路径。 */
const groupCols = (colExtra: Record<string, unknown> = {}) =>
  [
    {
      title: 'Base',
      key: 'base',
      children: [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Age', dataIndex: 'age', key: 'age', sorter: cmpAge, ...colExtra },
      ],
    },
  ] as any[]

/** 箭头形状读数（P-102 防空集：找不到宿主直接 throw，不许把空集读成 0/0 绿灯）。 */
function arrowShape(container: HTMLElement) {
  const hosts = Array.from(container.querySelectorAll<HTMLElement>('.dg-column-sorter'))
  if (hosts.length === 0) throw new Error('arrowShape 空集：找不到 .dg-column-sorter 宿主')
  const inner = hosts[0]!.querySelector('.dg-column-sorter-inner')
  if (!inner) throw new Error('arrowShape 空集：找不到 .dg-column-sorter-inner')
  return {
    up: hosts[0]!.querySelectorAll('.dg-column-sorter-up').length,
    down: hosts[0]!.querySelectorAll('.dg-column-sorter-down').length,
    innerChildren: inner.children.length,
    full: hosts[0]!.classList.contains('dg-column-sorter-full'),
  }
}

/** 参照形状（把生效集合按 `includes` 展开成节点计数与 -full）。 */
const refShape = (directions: Array<'ascend' | 'descend'>) => ({
  up: directions.includes('ascend') ? 1 : 0,
  down: directions.includes('descend') ? 1 : 0,
  innerChildren: directions.length,
  full: directions.includes('ascend') && directions.includes('descend'),
})

/** 深度优先找第一个带 sorter 的叶子节点（分组路径下 Age 是孙子层）。 */
function firstSortableLeaf(
  nodes: Array<EngineColumnNode<any>>,
): EngineColumnNode<any> | undefined {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      const hit = firstSortableLeaf(node.children)
      if (hit) return hit
    } else if (node.sorter) {
      return node
    }
  }
  return undefined
}

/**
 * 接缝 harness：Table 级方向 → useColumnTreeBuilder → GridTable 真渲染。
 * `collect` 把产出的列树交回调用方（钉「flat 与 multi 读到的是同一份合并值」）。
 */
function Seam({
  cols,
  tableDirs,
  collect,
}: {
  cols: any[]
  tableDirs?: Array<'ascend' | 'descend'>
  collect?: (tree: Array<EngineColumnNode<any>>) => void
}) {
  const { columnTreeWithSortAndFilter } = useColumnTreeBuilder<any>({
    visibleColumns: cols,
    selectionNode: null,
    expandNode: null,
    showSorterTooltip: undefined,
    defaultSortDirections: tableDirs,
    sortOrderMap: new Map(),
    sortPriorityMap: new Map(),
    filteredValueMap: new Map(),
  })
  collect?.(columnTreeWithSortAndFilter)
  return (
    <GridTable columnTree={columnTreeWithSortAndFilter} dataSource={DATA} rowKey="key" />
  )
}

describe('columnAdapter / 生效 sortDirections 的合并判据（唯一实现点）', () => {
  const leafOf = (col: any, tableDirs?: Array<'ascend' | 'descend'>) =>
    toEngineColumns<any>([col], { seq: 0 }, undefined, tableDirs)[0]!

  it('列级已配置 ⇒ 用列级（表级给了不同值也不覆盖）', () => {
    const node = leafOf(
      { title: 'Age', dataIndex: 'age', key: 'age', sorter: cmpAge, sortDirections: ['ascend'] },
      ['descend'],
    )
    expect(node.sortDirections).toEqual(['ascend'])
  })

  it('列级未配置 ⇒ 用表级', () => {
    const node = leafOf(
      { title: 'Age', dataIndex: 'age', key: 'age', sorter: cmpAge },
      ['descend'],
    )
    expect(node.sortDirections).toEqual(['descend'])
  })

  it('两者都无 ⇒ 不写值（渲染走缺省分支，点击循环由 engine/useSorter.ts:255 收尾）', () => {
    const node = leafOf({ title: 'Age', dataIndex: 'age', key: 'age', sorter: cmpAge })
    expect(node.sortDirections).toBeUndefined()
  })

  // K5：参照是 `||`（falsy），`[]` 是 truthy ⇒ 两级都**不**回落默认序列；参照实测该档画 0 枚 caret
  // （`tmp/59-probe-after-table.txt` 的 `C-empty-arr` dg/antd 均 u=0 d=0 ic=0）。
  it('空数组 [] 不回落（与参照 `||` 等价）', () => {
    expect(
      leafOf({ title: 'Age', dataIndex: 'age', key: 'age', sorter: cmpAge, sortDirections: [] })
        .sortDirections,
    ).toEqual([])
    expect(
      leafOf(
        { title: 'Age', dataIndex: 'age', key: 'age', sorter: cmpAge, sortDirections: [] },
        ['ascend', 'descend'],
      ).sortDirections,
    ).toEqual([])
    expect(
      leafOf({ title: 'Age', dataIndex: 'age', key: 'age', sorter: cmpAge }, []).sortDirections,
    ).toEqual([])
  })

  it('分组列里的嵌套叶子同样吃到表级值（合并发生在每层 build）', () => {
    const tree = toEngineColumns<any>(groupCols(), { seq: 0 }, undefined, ['descend'])
    expect(firstSortableLeaf(tree)?.sortDirections).toEqual(['descend'])
    const treeCol = toEngineColumns<any>(groupCols({ sortDirections: ['ascend'] }), { seq: 0 }, undefined, ['descend'])
    expect(firstSortableLeaf(treeCol)?.sortDirections).toEqual(['ascend'])
  })

  it('不可排序列不被判据污染（无 sorter ⇒ 无 sortDirections 值面）', () => {
    const node = leafOf({ title: 'Name', dataIndex: 'name', key: 'name' }, ['descend'])
    expect(node.sorter).toBeUndefined()
  })
})

describe('useColumnTreeBuilder + GridTable / 表级方向的接缝真渲染', () => {
  it('表级单方向 descend 经 flat 路径只画 down', () => {
    const { container } = render(<Seam cols={flatCols()} tableDirs={['descend']} />)
    expect(arrowShape(container)).toEqual(refShape(['descend']))
  })

  it('表级方向经 multi（分组）路径同样只画 down——成对站点', () => {
    const { container } = render(<Seam cols={groupCols()} tableDirs={['descend']} />)
    expect(arrowShape(container)).toEqual(refShape(['descend']))
  })

  it('表级双向 ⇒ 两枚都在且带 -full（参照 `:98-101`）', () => {
    const { container } = render(<Seam cols={flatCols()} tableDirs={['descend', 'ascend']} />)
    expect(arrowShape(container)).toEqual(refShape(['descend', 'ascend']))
  })

  it('表级 [] ⇒ 一枚都不画（与参照同形）', () => {
    const { container } = render(<Seam cols={flatCols()} tableDirs={[]} />)
    expect(arrowShape(container)).toEqual(refShape([]))
  })

  it('表级未配 ⇒ 两枚都在、不带 -full（K4 已知类名差的活门）', () => {
    const { container } = render(<Seam cols={flatCols()} />)
    expect(arrowShape(container)).toEqual({
      up: 1,
      down: 1,
      innerChildren: 2,
      full: false,
    })
  })

  it('列级优先于表级（同一接缝、两条路径同结果）', () => {
    for (const cols of [flatCols({ sortDirections: ['ascend'] }), groupCols({ sortDirections: ['ascend'] })]) {
      const { container } = render(<Seam cols={cols} tableDirs={['descend']} />)
      expect(arrowShape(container)).toEqual(refShape(['ascend']))
    }
  })

  // 「判据只许有一份实现」的反爬门：flat 侧读 `EngineLeafColumn.sortDirections`
  // （engine/columnTree.ts:92 collectLeaves 透传），multi 侧读 `EngineHeaderCell.sortDirections`
  // （该字段与它的生产点在 `flattenHeaderCells` 里，两侧拿的是**同一个合并值**）⇒ 这条门钉住"不许各写一份回退"，
  // 否则将来有人在其中一侧再写一遍回落就成两处特例。
  it('两条表头路径拿到的是同一个合并值引用（不许各写一份回退）', () => {
    let flatTree: Array<EngineColumnNode<any>> = []
    let groupTree: Array<EngineColumnNode<any>> = []
    const flat = render(
      <Seam cols={flatCols()} tableDirs={['descend']} collect={(t) => (flatTree = t)} />,
    )
    const group = render(
      <Seam cols={groupCols()} tableDirs={['descend']} collect={(t) => (groupTree = t)} />,
    )
    const flatLeaf = firstSortableLeaf(flatTree)
    const groupLeaf = firstSortableLeaf(groupTree)
    expect(flatLeaf?.sortDirections).toEqual(['descend'])
    expect(groupLeaf?.sortDirections).toEqual(['descend'])
    // 同值同形（两条路径的 DOM 形状也必须一致 ⇒ 与黑盒成对站点门互为交叉验证）。
    expect(arrowShape(flat.container)).toEqual(arrowShape(group.container))
  })

  it('CSS 连带复核（真 table.css）：单枚 caret 时相邻兄弟规则不命中', () => {
    const css = readFileSync('src/table/style/table.css', 'utf8')
    expect(css).toMatch(/\.dg-column-sorter-up \+ \.dg-column-sorter-down\s*\{\s*margin-top: -3\.6px/)
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    try {
      const pair = render(<Seam cols={flatCols()} tableDirs={['ascend', 'descend']} />)
      const pairHost = pair.container.querySelector<HTMLElement>('.dg-column-sorter')!
      const pairDown = pairHost.querySelector<HTMLElement>('.dg-column-sorter-down')!
      expect(getComputedStyle(pairDown).marginTop).toBe('-3.6px')
      const single = render(<Seam cols={flatCols()} tableDirs={['descend']} />)
      const singleHost = single.container.querySelector<HTMLElement>('.dg-column-sorter')!
      const singleDown = singleHost.querySelector<HTMLElement>('.dg-column-sorter-down')!
      expect(singleHost.querySelector('.dg-column-sorter-up')).toBeNull()
      expect(getComputedStyle(singleDown).marginTop).toBe('0')
    } finally {
      document.head.removeChild(style)
    }
  })
})

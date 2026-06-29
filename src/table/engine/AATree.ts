/**
 * AATree — AA 平衡树（Anderson-Andersson tree）。
 *
 * 用于构建按行索引（key）→ 行高（value）的前缀和结构，支持 O(log n) 插入/删除/范围查询。
 * 详细机制（skew/split/adjust 不变量、与 sizeTree/offsetTree 的关系）见
 * docs/design-notes/virtualization.md。
 *
 * 本文件零依赖，可独立测试。
 */

export interface NilNode {
  lvl: 0
}

const NIL_NODE: NilNode = { lvl: 0 }

export type AANode<T> = NilNode | NonNilAANode<T>

export interface NodeData<T> {
  k: number
  v: T
}

export interface Range<T> {
  end: number
  start: number
  value: T
}

interface NonNilAANode<T> {
  k: number
  l: NilNode | NonNilAANode<T>
  lvl: number
  r: NilNode | NonNilAANode<T>
  v: T
}

/**
 * 将扁平数组（按 index 排序的项）转换为相邻段 Range 列表。
 * 每个 Range 一直延续到「下一个 index - 1」为止，最后一个 Range 的 end 为 Infinity。
 *
 * parser 从每个 item 取出 { index, value }。
 */
export function arrayToRanges<T, V>(
  items: T[],
  parser: (item: T) => { index: number; value: V }
): { end: number; start: number; value: V }[] {
  const length = items.length
  if (length === 0) {
    return []
  }

  let { index: start, value } = parser(items[0]!)

  const result = []

  for (let i = 1; i < length; i++) {
    const { index: nextIndex, value: nextValue } = parser(items[i]!)
    result.push({ end: nextIndex - 1, start, value })

    start = nextIndex
    value = nextValue
  }

  result.push({ end: Infinity, start, value })
  return result
}

export function empty(node: AANode<any>): node is NilNode {
  return node === NIL_NODE
}

export function find<T>(node: AANode<T>, key: number): T | undefined {
  if (empty(node)) {
    return
  }

  if (key === node.k) {
    return node.v
  }
  if (key < node.k) {
    return find(node.l, key)
  }
  return find(node.r, key)
}

/**
 * 在 tree 中查找 field（默认 'k'）值「小于等于 value」的最大节点。
 * 返回 [该节点的 k, 该节点的 v]。树为空或全大于 value 时返回 [-Infinity, undefined]。
 *
 * 用于：行高查询（找行所在的高度段的 key）。
 */
export function findMaxKeyValue<T>(node: AANode<T>, value: number, field: 'k' | 'v' = 'k'): [number, T | undefined] {
  if (empty(node)) {
    return [-Infinity, undefined]
  }

  if (Number(node[field]) === value) {
    return [node.k, node.v]
  }

  if (Number(node[field]) < value) {
    const r = findMaxKeyValue(node.r, value, field)
    if (r[0] === -Infinity) {
      return [node.k, node.v]
    }
    return r
  }

  return findMaxKeyValue(node.l, value, field)
}

/**
 * 向 tree 插入 (k, v)。k 已存在则覆盖 v。
 * 返回新根节点（不可变更新：路径复制 + rebalance）。
 */
export function insert<T>(node: AANode<T>, k: number, v: T): NonNilAANode<T> {
  if (empty(node)) {
    return newAANode(k, v, 1)
  }
  if (k === node.k) {
    return clone(node, { k, v })
  }
  if (k < node.k) {
    return rebalance(clone(node, { l: insert(node.l, k, v) }))
  }
  return rebalance(clone(node, { r: insert(node.r, k, v) }))
}

export function keys(node: AANode<any>): number[] {
  if (empty(node)) {
    return []
  }
  return [...keys(node.l), node.k, ...keys(node.r)]
}

export function newTree<T>(): AANode<T> {
  return NIL_NODE
}

export function ranges<T>(node: AANode<T>): Range<T>[] {
  return toRanges(walk(node))
}

/**
 * 返回 tree 中与 [startIndex, endIndex] 相交的所有 Range。
 * adjustedStart 用 findMaxKeyValue 把 startIndex 对齐到「段起始 key」，
 * 然后 walkWithin 收集落在 [adjustedStart, endIndex] 内的节点，再 toRanges。
 */
export function rangesWithin<T>(node: AANode<T>, startIndex: number, endIndex: number): Range<T>[] {
  if (empty(node)) {
    return []
  }
  const adjustedStart = findMaxKeyValue(node, startIndex)[0]
  return toRanges(walkWithin(node, adjustedStart, endIndex))
}

/**
 * 从 tree 删除 key。返回新根（可能是 NilNode）。
 * 删除内部节点时用左子树的最大节点替换，再 adjust 修复不变量。
 */
export function remove<T>(node: AANode<T>, key: number): AANode<T> {
  if (empty(node)) {
    return NIL_NODE
  }

  const { k, l, r } = node

  if (key === k) {
    if (empty(l)) {
      return r
    }
    if (empty(r)) {
      return l
    }
    const [lastKey, lastValue] = last(l)
    return adjust(clone(node, { k: lastKey, l: deleteLast(l), v: lastValue }))
  }
  if (key < k) {
    return adjust(clone(node, { l: remove(l, key) }))
  }
  return adjust(clone(node, { r: remove(r, key) }))
}

/** 中序遍历收集所有 {k, v} 节点。 */
export function walk<T>(node: AANode<T>): NodeData<T>[] {
  if (empty(node)) {
    return []
  }

  return [...walk(node.l), { k: node.k, v: node.v }, ...walk(node.r)]
}

/** 中序遍历收集 key 落在 [start, end] 内的所有 {k, v} 节点。 */
function walkWithin<T>(node: AANode<T>, start: number, end: number): NodeData<T>[] {
  if (empty(node)) {
    return []
  }

  const { k, l, r, v } = node
  let result: NodeData<T>[] = []
  if (k > start) {
    result = result.concat(walkWithin(l, start, end))
  }

  if (k >= start && k <= end) {
    result.push({ k, v })
  }

  if (k <= end) {
    result = result.concat(walkWithin(r, start, end))
  }

  return result
}

/**
 * 删除/插入后修复 AA 不变量。处理「层失衡」三种情况：
 *  1) 左层比当前低 ≥ 2：单 skew 降层 或 旋转（双层级）
 *  2) 右链单层失衡：单 split 降层
 *  3) 右链双层级失衡：旋转 + split
 */
export function adjust<T>(node: NonNilAANode<T>): NonNilAANode<T> {
  const { l, lvl, r } = node
  if (r.lvl >= lvl - 1 && l.lvl >= lvl - 1) {
    return node
  }
  if (lvl > r.lvl + 1) {
    if (isSingle(l)) {
      return skew(clone(node, { lvl: lvl - 1 }))
    }
    if (!empty(l) && !empty(l.r)) {
      return clone(l.r, {
        l: clone(l, { r: l.r.l }),
        lvl,
        r: clone(node, {
          l: l.r.r,
          lvl: lvl - 1,
        }),
      })
    }
    throw new Error('Unexpected empty nodes')
  }

  if (isSingle(node)) {
    return split(clone(node, { lvl: lvl - 1 }))
  }
  if (!empty(r) && !empty(r.l)) {
    const rl = r.l
    const rlvl = isSingle(rl) ? r.lvl - 1 : r.lvl

    return clone(rl, {
      l: clone(node, {
        lvl: lvl - 1,
        r: rl.l,
      }),
      lvl: rl.lvl + 1,
      r: split(clone(r, { l: rl.r, lvl: rlvl })),
    })
  }
  throw new Error('Unexpected empty nodes')
}

function clone<T>(node: NonNilAANode<T>, args: Partial<NonNilAANode<T>>): NonNilAANode<T> {
  return newAANode(
    args.k === undefined ? node.k : args.k,
    args.v === undefined ? node.v : args.v,
    args.lvl === undefined ? node.lvl : args.lvl,
    args.l === undefined ? node.l : args.l,
    args.r === undefined ? node.r : args.r
  )
}

function deleteLast<T>(node: NonNilAANode<T>): AANode<T> {
  return empty(node.r) ? node.l : adjust(clone(node, { r: deleteLast(node.r) }))
}

function isSingle(node: AANode<any>) {
  return empty(node) || node.lvl > node.r.lvl
}

function last<T>(node: NonNilAANode<T>): [number, T] {
  return empty(node.r) ? [node.k, node.v] : last(node.r)
}

function newAANode<T>(k: number, v: T, lvl: number, l: AANode<T> = NIL_NODE, r: AANode<T> = NIL_NODE): NonNilAANode<T> {
  return { k, l, lvl, r, v }
}

function rebalance<T>(node: NonNilAANode<T>): NonNilAANode<T> {
  return split(skew(node))
}

/** AA skew：修复左水平链（左子同层 → 右旋）。 */
export function skew<T>(node: NonNilAANode<T>): NonNilAANode<T> {
  const { l } = node

  return !empty(l) && l.lvl === node.lvl ? clone(l, { r: clone(node, { l: l.r }) }) : node
}

/** AA split：修复连续右水平链（右子及右子的右子同层 → 左旋 + 升层）。 */
export function split<T>(node: NonNilAANode<T>): NonNilAANode<T> {
  const { lvl, r } = node

  return !empty(r) && !empty(r.r) && r.lvl === lvl && r.r.lvl === lvl ? clone(r, { l: clone(node, { r: r.l }), lvl: lvl + 1 }) : node
}

function toRanges<T>(nodes: NodeData<T>[]): Range<T>[] {
  return arrayToRanges(nodes, ({ k: index, v: value }) => ({ index, value }))
}

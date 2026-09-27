// 快照基线辅助：剥离 CSS 自定义属性（`--ant-*` 主题张量）。
//
// 为什么需要：data-grid 把整份主题张量内联在包裹元素上（`tokenBridge.ts` 生成，
// 450 个 token / 含全色阶与全部阴影字体变量，单块约 14.8KB）。任何 `toMatchSnapshot()`
// 打在整个渲染树上都会把这 14.8KB 原样写进基线 —— 实测 `Table.pagination.test.tsx.snap`
// 4 条快照 78.5KB、`Table.filter.test.tsx.snap` 10 条 83KB，其中绝大部分是这份张量。
//
// 剥掉它是**有意的断言边界**，不是遗漏：
//   - 张量取值由主题层决定（antd token + `tokenBridge`），改动主题会让所有快照同时失败，
//     那是噪声而不是定位信息；它有自己的白盒用例与 demo 结构摘要的 `themeOverrides` 字段。
//   - 剥掉后基线只剩「这个用例关心的结构与类名」，diff 才指向真正变化的那一处。
//
// 只删自定义属性（`--*`），其余内联样式（`text-align` / `grid-column` / `position` 等
// 断言真正关心的布局信号）一律保留；删空后连 `style=""` 属性一起去掉。
import { expect } from 'vitest'

/** 返回 element 的深拷贝，其中所有 `--*` 自定义属性声明被移除。 */
export function stripThemeTokens<T extends Element>(element: T): T {
  const clone = element.cloneNode(true) as T
  const nodes: Element[] = [clone, ...Array.from(clone.querySelectorAll('*'))]

  for (const node of nodes) {
    const style = (node as HTMLElement).style
    if (!style || style.length === 0) continue

    const customProperties: string[] = []
    for (let index = 0; index < style.length; index += 1) {
      const name = style.item(index)
      if (name.startsWith('--')) customProperties.push(name)
    }
    for (const name of customProperties) style.removeProperty(name)
    if (style.length === 0) node.removeAttribute('style')
  }

  return clone
}

/**
 * 快照断言入口：剥主题张量后快照。
 *
 * 参数类型放宽到 `Node`（而非 `Element`）：调用方常传 `container.firstChild` /
 * `asFragment().firstChild`，其静态类型是 `ChildNode | null`，但运行时必然是元素。
 * `target` 为 null/undefined 时先失败，避免把「元素没渲染出来」悄悄记成一条 `null` 基线上。
 */
export function expectSnapshot(target: Node | null | undefined): void {
  expect(target, '快照目标元素不存在（container.firstChild 为 null）').not.toBeNull()
  expect(stripThemeTokens(target as Element)).toMatchSnapshot()
}

/**
 * 回归测试：EditableDocsCode 的 setComp 必须用 updater 形式。
 *
 * 历史 bug：`setComp(evaluated.Comp)` 把组件函数直接传给 useState 的 setter，
 * React 把它当 state updater 调用 `Comp(prev)`，存进 state 的是返回的 React 元素
 * 而非组件，于是 `<Comp/>` 渲染报
 *   "Element type is invalid: expected a string ... but got: <ForwardRef(TableInner) />"
 * 修复：`setComp(() => evaluated.Comp)` 与 `setComp(() => c)`。
 *
 * 本测试走 docs 区真实链路：compile + evalModule + 实际 Table 渲染，挂载后应能
 * 在容器里找到 `.dg-wrapper`（data-grid 表格外层节点），证明组件被正确装载。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

// jsdom 无布局，CodeMirror 在挂载时会读尺寸/Range 等崩，必须 mock 成空组件。
// EditableDocsCode lazy 加载 LiveEditor → LiveEditor 内部 import CodeMirrorEditor。
vi.mock('../src/code/CodeMirrorEditor', () => ({
  default: () => null,
}))

import { DocsCode } from '../src/docs/components'
import { ThemeProvider } from '../src/theme/ThemeContext'

function withTheme(node: ReactNode) {
  return <ThemeProvider>{node}</ThemeProvider>
}

const SAMPLE_CODE = `import { Table } from '@nukepayload2/data-grid'
const data = [{ key: '1', name: 'Alice', age: 28 }]
const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
]
export default function Demo() {
  return <Table columns={columns} dataSource={data} rowKey="key" />
}
`

describe('EditableDocsCode seed → setComp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it(
    'mounts the seeded component without "Element type is invalid"',
    async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { container } = render(
        withTheme(
          <DocsCode
            code={SAMPLE_CODE}
            editable
            ariaLabel="quick-start"
          />,
        ),
      )

      // seed 是异步动态 import(compile + evalModule) + 渲染 Table，给足时间。
      await waitFor(
        () => {
          expect(container.querySelector('.dg-wrapper')).not.toBeNull()
        },
        { timeout: 8000 },
      )

      // 关键回归断言：渲染期间 React 不能抛 "Element type is invalid"。
      const elementInvalidLogged = errorSpy.mock.calls.some((call) =>
        String(call.find((arg) => typeof arg === 'string') ?? '').includes(
          'Element type is invalid',
        ),
      )
      expect(elementInvalidLogged).toBe(false)

      errorSpy.mockRestore()
    },
    15000,
  )
})

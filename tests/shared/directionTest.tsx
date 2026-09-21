// RTL 占位用例（antd 式 directionTest 的 skip 版本）。
import { it } from 'vitest'

export function directionTest(_Component: unknown): void {
  // RTL 未系统处理（known-limitations: rtl，src/docs/pages/known-limitations.tsx:16）
  it.skip('renders with direction="rtl"', () => {
    // 占位：data-grid 未系统处理 direction="rtl"，保留 case 与 antd 用例清单对齐
  })
}

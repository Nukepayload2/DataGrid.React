// 黑盒测试层渲染入口（antd tests/utils.tsx customRender 的 vitest 等价）。
import { StrictMode, type ReactElement } from 'react'
import { ConfigProvider, type ConfigProviderProps } from 'antd'
import type { RenderOptions, RenderResult } from '@testing-library/react'
import { render } from '@testing-library/react'

import './polyfill'

/** 默认包 React.StrictMode 的 render（对齐 antd customRender）。 */
export function customRender(ui: ReactElement, options?: Partial<RenderOptions>): RenderResult {
  return render(ui, { wrapper: StrictMode, ...options })
}

/**
 * 额外包 antd ConfigProvider（locale/theme 等参数透传）。
 * 不默认包 app 壳 ThemeProvider——src/theme/ThemeContext.tsx 是带 state 的壳层 store，
 * 不属于黑盒层职责。
 */
export function renderWithConfig(
  ui: ReactElement,
  configOptions: Partial<ConfigProviderProps> = {},
  options?: Partial<RenderOptions>,
): RenderResult {
  return render(
    <ConfigProvider {...configOptions}>
      <StrictMode>{ui}</StrictMode>
    </ConfigProvider>,
    options,
  )
}

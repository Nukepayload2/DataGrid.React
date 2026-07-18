import { describe, expect, it } from 'vitest'
import {
  deriveTableComponentTokenDefaults,
  tableTokenToCssVars,
} from '../../../src/table/tokenBridge'

const cssVar = { prefix: 'ant', key: 'css-var-root' }

function makeToken(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    colorFillAlter: 'rgba(0, 0, 0, 0.02)',
    colorBgContainer: '#ffffff',
    colorTextHeading: 'rgba(0, 0, 0, 0.88)',
    colorFillSecondary: 'rgba(0, 0, 0, 0.06)',
    colorFillContent: 'rgba(0, 0, 0, 0.06)',
    controlItemBgActive: '#e6f4ff',
    controlItemBgActiveHover: '#bae0ff',
    padding: 16,
    paddingSM: 12,
    paddingXS: 8,
    colorBorderSecondary: '#f0f0f0',
    borderRadiusLG: 8,
    controlHeight: 32,
    colorTextPlaceholder: 'rgba(0, 0, 0, 0.25)',
    fontSize: 14,
    fontSizeSM: 12,
    lineHeight: 1.5715,
    lineWidth: 1,
    colorIcon: 'rgba(0, 0, 0, 0.45)',
    colorIconHover: 'rgba(0, 0, 0, 0.88)',
    opacityLoading: 0.65,
    controlInteractiveSize: 16,
    colorSplit: 'rgba(5, 5, 5, 0.06)',
    ...overrides,
  }
}

describe('tokenBridge', () => {
  it('exposes Table component token defaults without requiring antd internal imports', () => {
    const defaults = deriveTableComponentTokenDefaults(makeToken())

    expect(defaults.headerBg).toBeDefined()
    expect(defaults.rowHoverBg).toBeDefined()
    expect(defaults.cellPaddingBlock).toBe(16)
  })

  it('prefixes Table component tokens as --ant-table-*', () => {
    const vars = tableTokenToCssVars(makeToken(), cssVar)

    expect(vars['--ant-table-header-bg']).toBeDefined()
    expect(vars['--ant-table-cell-padding-block']).toBe('16px')
    expect(vars['--ant-table-cell-padding-inline-md']).toBe('8px')
    expect(vars['--ant-table-header-border-radius']).toBe('8px')
  })

  it('writes Table colorBgContainer override back to alias var', () => {
    const vars = tableTokenToCssVars(
      makeToken({
        Table: {
          colorBgContainer: '#e6f4ff',
        },
      }),
      cssVar,
    )

    expect(vars['--ant-color-bg-container']).toBe('#e6f4ff')
    expect(vars['--ant-table-color-bg-container']).toBeUndefined()
  })

  it('keeps data-grid scrollbar source on antd table scroll vars', () => {
    const vars = tableTokenToCssVars(makeToken(), cssVar)

    expect(vars['--ant-table-scroll-thumb-bg']).toBeDefined()
    expect(vars['--ant-table-scroll-thumb-bg-hover']).toBe('rgba(0, 0, 0, 0.88)')
    expect(vars['--ant-table-scroll-bg']).toBe('rgba(5, 5, 5, 0.06)')
    expect(vars['--ant-table-scroll-thumb-size']).toBe('8px')
  })
})

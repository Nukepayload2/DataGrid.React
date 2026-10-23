/**
 * 契约：live 注入表按源码里真实出现的 specifier 构造。
 *
 * 这三条钉住的是 P1 的核心机制（`src/live/scope.ts`）：
 * 1. 从 sucrase 编译产物里抓 `require("x")`；
 * 2. 从原始 TSX 源码里抓 `from "x"`（docs 代码块在编译前也可能被扫）；
 * 3. 未知模块要在**加载任何东西之前**就报错，并且报错文案里带可用名单。
 */
import { describe, expect, it } from 'vitest'
import {
  LIVE_SCOPE_KEYS,
  isLiveSpecifier,
  loadLiveScope,
  scanLiveSpecifiers,
} from '../../src/live/scope'

describe('scanLiveSpecifiers', () => {
  it('抓编译产物里的 require(...)', () => {
    const js = [
      '"use strict";',
      'var _react = require("react");',
      'var _antd = require("antd");',
      'var _dg = require("@nukepayload2/data-grid");',
    ].join('\n')
    expect(scanLiveSpecifiers(js)).toEqual(['react', 'antd', '@nukepayload2/data-grid'])
  })

  it('抓原始 ESM 源码里的 from ...', () => {
    const tsx = [
      "import { useState } from 'react'",
      "import { Table } from '../table'",
      "import { data } from './_compare/basic-table.shared'",
    ].join('\n')
    expect(scanLiveSpecifiers(tsx)).toEqual(['react', '../table', './_compare/basic-table.shared'])
  })

  it('去重且保序', () => {
    const js = 'require("react");require("antd");require("react");'
    expect(scanLiveSpecifiers(js)).toEqual(['react', 'antd'])
  })
})

describe('loadLiveScope', () => {
  it('未知模块在加载前就报错，并列出可注入项', async () => {
    await expect(loadLiveScope(['react', './not-exist'])).rejects.toThrow(/模块未注入到 live scope/)
    await expect(loadLiveScope(['react', './not-exist'])).rejects.toThrow(/可注入：react/)
  })

  it('固定表包含 demo 源码里会用到的全部 specifier', () => {
    for (const specifier of [
      'react',
      'react-dom',
      'antd',
      '@ant-design/icons',
      'react-highlight-words',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/modifiers',
      '@dnd-kit/utilities',
      '@nukepayload2/data-grid',
      '../table',
    ]) {
      expect(LIVE_SCOPE_KEYS).toContain(specifier)
      expect(isLiveSpecifier(specifier)).toBe(true)
    }
  })

  it('每份 demo 的 ./_compare/<name>.shared 都可注入', () => {
    expect(isLiveSpecifier('./_compare/basic-table.shared')).toBe(true)
    expect(isLiveSpecifier('./_compare/does-not-exist.shared')).toBe(false)
  })
})

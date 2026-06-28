/**
 * scope：live 编辑的 require 注入表。
 *
 * === 核心机制 ===
 * demo 子文件被 sucrase 编译后，`import X from 'mod'` 变成 `require('mod')`。
 * evalModule 用 `new Function` 执行时把本对象当 require 表：`require(key) → scope[key]`。
 *
 * === ★ key 字面对齐子文件 import specifier（零改写） ===
 * 子文件里写 `import { Table } from '../table'`，这里 key 就是 `'../table'`；
 * 写 `import { data } from './_compare/basic.shared'`，key 就是 `'./_compare/basic.shared'`。
 * 因此**子文件源码可以原样展示+编译，不需要任何路径改写**——这是 live 编辑可行性的关键。
 *
 * === 迁移增量 ===
 * 试点只接入 basic / fixed-columns 两个 demo，所以只静态 import 这两个 shared。
 * 批量迁移其它 demo 时：(1) 顶部追加 `import * as xxxShared from '../demos/_compare/xxx.shared'`；
 * (2) 在 scopeForDemo 的 if 链里追加 `if (name === 'xxx') extra['./_compare/xxx.shared'] = xxxShared`。
 *
 * === 路径相对 src/live/ ===
 * `'../table'` → src/table（data-grid 入口）；`'../demos/_compare/*.shared'` → 对应 shared 文件。
 */
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as antd from 'antd'
import * as antdIcons from '@ant-design/icons'
import * as dataGrid from '../table'
import * as basicShared from '../demos/_compare/basic.shared'
import * as fixedColumnsShared from '../demos/_compare/fixed-columns.shared'

/** 所有 demo 共享的基础依赖（key 字面对齐子文件 import specifier）。 */
const baseScope: Record<string, unknown> = {
  react: React,
  'react-dom': ReactDOM,
  antd,
  '@ant-design/icons': antdIcons,
  '../table': dataGrid,
}

/**
 * 按 demo 名构造 require 注入表。
 * @param name demo 名（与 src/demos/_compare/<name>.shared 的 <name> 一致）
 * @returns baseScope 的副本叠加该 demo 对应的 shared 模块
 */
export function scopeForDemo(name: string): Record<string, unknown> {
  const extra: Record<string, unknown> = {}
  // key 字面对齐子文件 import 的 './_compare/<name>.shared'
  if (name === 'basic') extra['./_compare/basic.shared'] = basicShared
  if (name === 'fixed-columns')
    extra['./_compare/fixed-columns.shared'] = fixedColumnsShared
  return { ...baseScope, ...extra }
}

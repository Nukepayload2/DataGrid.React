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
 * === ★ shared 自动发现（glob）===
 * 用 `import.meta.glob('../demos/_compare/*.shared.ts', { eager:true })` 扫描所有 shared 模块，
 * 把 glob key（形如 `'../demos/_compare/basic.shared.ts'`）提取 name 后重写为子文件 require 的字面 key
 * （`'./_compare/basic.shared'`，不带 .ts），登记到 `sharedByName`。
 * **新增 demo 只需把 <name>.shared.ts 文件放进 src/demos/_compare/ 即自动接入，无需改本文件。**
 *
 * === 路径相对 src/live/ ===
 * `'../table'` → src/table（data-grid 入口）；`'../demos/_compare/*.shared.ts'` → 对应 shared 文件。
 */
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as antd from 'antd'
import * as antdIcons from '@ant-design/icons'
import * as Highlighter from 'react-highlight-words'
import * as dndCore from '@dnd-kit/core'
import * as dndSortable from '@dnd-kit/sortable'
import * as dndModifiers from '@dnd-kit/modifiers'
import * as dndUtilities from '@dnd-kit/utilities'
import * as dataGrid from '../table'

/** 所有 demo 共享的基础依赖（key 字面对齐子文件 import specifier）。 */
const baseScope: Record<string, unknown> = {
  react: React,
  'react-dom': ReactDOM,
  antd,
  '@ant-design/icons': antdIcons,
  // react-highlight-words：custom-filter-panel 子文件 `import Highlighter from 'react-highlight-words'`
  // 用于命中单元格文本高亮。已声明依赖（package.json ^0.21.0），live 编辑 require 表需注入才能解析。
  'react-highlight-words': Highlighter,
  // @dnd-kit/*：drag-sorting.antd 子文件 `import { DndContext, ... } from '@dnd-kit/core'` 等
  // 复刻官方 drag-sorting demo（DndContext/PointerSensor/restrictToVerticalAxis/SortableContext/
  // useSortable/arrayMove/verticalListSortingStrategy/CSS）。4 个包已声明依赖（package.json）。
  // 仅注入 value（namespace），type import（如 DragEndEvent）被 sucrase 剥离无需注入。
  '@dnd-kit/core': dndCore,
  '@dnd-kit/sortable': dndSortable,
  '@dnd-kit/modifiers': dndModifiers,
  '@dnd-kit/utilities': dndUtilities,
  '../table': dataGrid,
}

// shared 模块 glob 自动发现（模块顶层字面量调用；相对路径 '../demos/_compare/*.shared.ts'）。
// eager（无 import 选项）→ 模块命名空间对象 { '../demos/_compare/basic.shared.ts': {data, ...} }。
const sharedModules = import.meta.glob('../demos/_compare/*.shared.ts', { eager: true })

/** name → 子文件 require 字面 key 的反查表（'./_compare/<name>.shared' → 模块命名空间）。 */
const sharedByName: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(sharedModules)) {
  const name = path.match(/([^/]+)\.shared\.ts$/)?.[1]
  if (name) sharedByName[`./_compare/${name}.shared`] = mod
}

/**
 * 按 demo 名构造 require 注入表。
 * @param name demo 名（与 src/demos/_compare/<name>.shared 的 <name> 一致）
 * @returns baseScope 的副本叠加该 demo 对应的 shared 模块（无匹配则只返回 baseScope）
 */
export function scopeForDemo(name: string): Record<string, unknown> {
  const key = `./_compare/${name}.shared`
  return key in sharedByName
    ? { ...baseScope, [key]: sharedByName[key] }
    : { ...baseScope }
}

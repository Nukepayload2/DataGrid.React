/** live 编辑 require 注入表；key 与 demo 子文件 import specifier 保持一致。 */
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
  'react-highlight-words': Highlighter,
  '@dnd-kit/core': dndCore,
  '@dnd-kit/sortable': dndSortable,
  '@dnd-kit/modifiers': dndModifiers,
  '@dnd-kit/utilities': dndUtilities,
  '../table': dataGrid,
}

const sharedModules = import.meta.glob('../demos/_compare/*.shared.ts', { eager: true })

/** `./_compare/<name>.shared` -> 模块命名空间。 */
const sharedByName: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(sharedModules)) {
  const name = path.match(/([^/]+)\.shared\.ts$/)?.[1]
  if (name) sharedByName[`./_compare/${name}.shared`] = mod
}

/** 按 demo 名构造 require 注入表。 */
export function scopeForDemo(name: string): Record<string, unknown> {
  const key = `./_compare/${name}.shared`
  return key in sharedByName
    ? { ...baseScope, [key]: sharedByName[key] }
    : { ...baseScope }
}

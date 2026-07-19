/**
 * data-grid public API extractor.
 *
 * Uses the TypeScript Compiler API (TS 7 "unstable" sync surface — the new
 * native-compiler-backed API that replaces the legacy in-process compiler).
 * Reads the public type source files, extracts structured member metadata,
 * strips `@internal` JSDoc blocks from summaries, and writes
 * `src/docs/generated/api.json` for the docs reference pages (#14).
 *
 * Run: `pnpm docs:api` (or `node scripts/extract-api.mjs`).
 *
 * Design notes:
 * - Source of truth = author-written JSDoc on public type declarations.
 * - `@internal <text>` paragraph markers (non-standard JSDoc tag used as a
 *   leading-`* @internal` block) are stripped from `summary` so the docs never
 *   leak internal mechanism (DOM class names, adapter module names, etc.).
 * - `defaultValue` is intentionally omitted: runtime defaults are documented
 *   in prose inside `summary` (e.g. "默认 56") and are not part of the type.
 *   See handoff note in #13 report.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { API } from 'typescript/unstable/sync'
import * as ast from 'typescript/unstable/ast'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// --- Configuration -------------------------------------------------------

const TS_CONFIG = resolve(ROOT, 'tsconfig.lib.json')

const SOURCE_FILES = {
  publicTypes: resolve(ROOT, 'src/table/publicTypes.ts'),
  index: resolve(ROOT, 'src/table/index.ts'),
  nativeOptions: resolve(ROOT, 'src/table/nativeOptions.ts'),
  recyclingCellTypes: resolve(ROOT, 'src/table/engine/recyclingCellTypes.ts'),
  column: resolve(ROOT, 'src/table/compat/column.ts'),
}

const OUTPUT_FILE = resolve(ROOT, 'src/docs/generated/api.json')

// Escape-hatch / low-level hooks surfaced under `gridColumnOptions`. These get
// `advanced: true` so #14 can render them in a separate partition.
const ADVANCED_FIELDS = new Set([
  'renderCellElement',
  'renderCellReact',
  'disposeCellElement',
])

// --- JSDoc @internal stripping ------------------------------------------

/**
 * Strip `* @internal <text>` paragraphs from a raw JSDoc block comment,
 * then unwrap `/**` / `*\/` and per-line `*` prefixes to produce plain text.
 *
 * The `@internal` marker in this project is a *paragraph marker*, not a
 * standard JSDoc tag — its body extends from the `* @internal` line until
 * the next `* @tag` line or the closing `*\/`. Everything in that span is
 * internal commentary and must not reach the docs.
 */
function stripInternalAndUnwrap(rawJsDoc) {
  const lines = rawJsDoc.split(/\r?\n/)
  const kept = []
  let skippingInternal = false

  for (const line of lines) {
    if (skippingInternal) {
      // End the skip when we hit either another (non-internal) tag line or
      // the comment close. Internal blocks never contain code fences or
      // nested tags, so this is a sufficient terminator set.
      if (/^\s*\*\s*@[A-Za-z]/.test(line) && !/^\s*\*\s*@internal\b/.test(line)) {
        skippingInternal = false
        kept.push(line)
      } else if (/\*\/\s*$/.test(line)) {
        skippingInternal = false
        kept.push(line)
      }
      // otherwise: drop this line (part of the @internal block).
    } else if (/^\s*\*\s*@internal\b/.test(line)) {
      skippingInternal = true
    } else {
      kept.push(line)
    }
  }

  return kept
    .join('\n')
    .replace(/^\/\*\*/, '')
    .replace(/\*\/\s*$/, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim()
}

// --- Node helpers --------------------------------------------------------

/**
 * Find the first top-level interface declaration with the given name in
 * `sourceFile`.
 */
function findInterface(sourceFile, name) {
  for (const stmt of sourceFile.statements) {
    if (ast.isInterfaceDeclaration(stmt) && stmt.name && stmt.name.text === name) {
      return stmt
    }
  }
  return undefined
}

function findTypeAlias(sourceFile, name) {
  for (const stmt of sourceFile.statements) {
    if (ast.isTypeAliasDeclaration(stmt) && stmt.name.text === name) {
      return stmt
    }
  }
  return undefined
}

/**
 * Find a property/method member on an interface or type literal by name.
 */
function findMember(parent, name) {
  for (const member of parent.members) {
    if (
      (ast.isPropertySignatureDeclaration(member) || ast.isMethodSignatureDeclaration(member)) &&
      member.name &&
      ast.isIdentifier(member.name) &&
      member.name.text === name
    ) {
      return member
    }
  }
  return undefined
}

function getJsDocRaw(node) {
  const docs = node.jsDoc
  if (!docs || docs.length === 0) return ''
  // A member usually has a single JSDoc block; if multiple, take the first.
  return docs[0].getText()
}

function getSummary(node) {
  const raw = getJsDocRaw(node)
  if (!raw) return ''
  return stripInternalAndUnwrap(raw)
}

function getTagComment(node, tagName) {
  const docs = node.jsDoc
  if (!docs || docs.length === 0) return undefined
  for (const doc of docs) {
    // Each JSDoc node's text contains `@tag comment` lines; extract them.
    const text = doc.getText()
    const lines = text.split(/\r?\n/)
    let capturing = false
    const captured = []
    for (const line of lines) {
      const tagMatch = /^\s*\*\s*@([A-Za-z][A-Za-z0-9_-]*)\b(.*)$/.exec(line)
      if (tagMatch) {
        if (capturing) break // hit next tag, stop
        if (tagMatch[1] === tagName) {
          capturing = true
          const inline = tagMatch[2].trim()
          if (inline) captured.push(inline)
        }
      } else if (capturing) {
        // Continuation lines of the tag's comment (drop `*` prefix).
        const content = line.replace(/^\s*\*\s?/, '').trimEnd()
        if (content) captured.push(content)
        else if (captured.length > 0) captured.push('')
      }
    }
    if (captured.length > 0) {
      return captured.join('\n').replace(/\s+$/, '').trim()
    }
  }
  return undefined
}

function detectKind(member) {
  if (ast.isMethodSignatureDeclaration(member)) return 'method'
  // Property whose type is a function type → treat as method (e.g. `scrollTo: (...) => void`).
  if (ast.isPropertySignatureDeclaration(member) && member.type && ast.isFunctionTypeNode(member.type)) {
    return 'method'
  }
  return 'prop'
}

/**
 * Build the signature text for a member without its leading JSDoc.
 * Starts from the member's name (skipping leading trivia + JSDoc).
 */
function getSignatureText(member) {
  const sourceFile = member.getSourceFile()
  const fullText = sourceFile.text
  const startPos = member.name.getStart()
  const endPos = member.getEnd()
  return fullText.slice(startPos, endPos).trim()
}

/**
 * Clean a type-string by stripping TS `import('...').` wrappers so we render
 * `TableRowSelection` rather than `import('./compatTypes').TableRowSelection`.
 */
function cleanTypeText(raw) {
  if (!raw) return ''
  return raw.replace(/import\(['"][^'"]+['"]\)\./g, '').trim()
}

function getTypeText(member) {
  const typeNode = member.type
  if (!typeNode) return ''
  return cleanTypeText(typeNode.getText())
}

// --- Per-namespace extractors -------------------------------------------

function extractMember(member) {
  const name = member.name && ast.isIdentifier(member.name) ? member.name.text : member.name.getText()
  const kind = detectKind(member)
  // TS7 AST exposes the optional `?` token as `postfixToken` (typed
  // QuestionToken | ExclamationToken) on NamedMemberBase. An interface member
  // is required iff no postfix token is present.
  const required = !member.postfixToken
  const signature = getSignatureText(member)
  const type = getTypeText(member)
  const summary = getSummary(member)
  const deprecated = getTagComment(member, 'deprecated')
  const since = getTagComment(member, 'since')
  const advanced = ADVANCED_FIELDS.has(name)

  const entry = { name, kind, signature, type, required }
  if (deprecated) entry.deprecated = deprecated
  if (since) entry.since = since
  entry.advanced = advanced
  entry.summary = summary
  return entry
}

function extractInterfaceMembers(parent) {
  const out = []
  for (const member of parent.members) {
    if (!ast.isPropertySignatureDeclaration(member) && !ast.isMethodSignatureDeclaration(member)) continue
    out.push(extractMember(member))
  }
  return out
}

function extractTypeAliasSummary(sourceFile, name) {
  const alias = findTypeAlias(sourceFile, name)
  if (!alias) return ''
  return getSummary(alias)
}

function extractVirtualizationMode(sourceFile) {
  const alias = findTypeAlias(sourceFile, 'VirtualizationMode')
  if (!alias) {
    throw new Error('VirtualizationMode type alias not found')
  }
  const summary = getSummary(alias)
  const signature = cleanTypeText(alias.type.getText())
  // TypeScript doesn't reliably attach JSDoc to individual LiteralTypeNode
  // members of a string union, so we derive per-value summaries by parsing
  // the type alias's own summary for `- \`<value>\`: <description>` bullets.
  // This keeps the source as a clean one-line union and still surfaces a
  // per-enum-value description in api.json.
  const valueSummaries = {}
  const bulletRe = /^-\s*`([^`]+)`\s*[：:]\s*(.+)$/gm
  let m
  while ((m = bulletRe.exec(summary)) !== null) {
    valueSummaries[m[1]] = m[2].trim()
  }
  const out = [
    {
      name: 'VirtualizationMode',
      kind: 'type',
      signature: `type VirtualizationMode = ${signature}`,
      type: signature,
      required: true,
      advanced: false,
      summary,
    },
  ]
  // Union of string literals.
  if (ast.isUnionTypeNode(alias.type)) {
    for (const t of alias.type.types) {
      if (ast.isLiteralTypeNode(t) && ast.isStringLiteral(t.literal)) {
        out.push({
          name: t.literal.text,
          kind: 'enumValue',
          signature: `'${t.literal.text}'`,
          type: `'${t.literal.text}'`,
          required: true,
          advanced: false,
          summary: valueSummaries[t.literal.text] || '',
        })
      }
    }
  }
  return out
}

function extractExports(sourceFile) {
  const out = []
  const seen = new Set()
  for (const stmt of sourceFile.statements) {
    if (!ast.isExportDeclaration(stmt)) continue
    const exportClause = stmt.exportClause
    if (!exportClause || !ast.isNamedExports(exportClause)) continue
    const moduleSpecifier = stmt.moduleSpecifier
    const from = moduleSpecifier ? moduleSpecifier.getText().slice(1, -1) : ''
    for (const el of exportClause.elements) {
      const exportedName = el.name.text
      const localName = el.propertyName ? el.propertyName.text : el.name.text
      if (seen.has(exportedName)) continue
      seen.add(exportedName)
      const isTypeOnly = Boolean(stmt.isTypeOnly) || Boolean(el.isTypeOnly)
      out.push({
        name: exportedName,
        kind: isTypeOnly ? 'type' : 'export',
        signature: isTypeOnly ? `type ${exportedName}` : exportedName,
        type: localName === exportedName ? exportedName : `${localName} as ${exportedName}`,
        required: true,
        advanced: false,
        from,
        isTypeOnly,
        summary: '',
      })
    }
  }
  return out
}

// --- Main ----------------------------------------------------------------

function main() {
  const api = new API({ cwd: ROOT })
  try {
    const snapshot = api.updateSnapshot({ openProjects: [TS_CONFIG] })
    const projects = snapshot.getProjects()
    const project = projects.find((p) => p.configFileName === TS_CONFIG) ?? projects[0]
    if (!project) {
      throw new Error(`No project loaded from ${TS_CONFIG}`)
    }

    const program = project.program

    const sfPublic = program.getSourceFile(SOURCE_FILES.publicTypes)
    const sfIndex = program.getSourceFile(SOURCE_FILES.index)
    const sfNative = program.getSourceFile(SOURCE_FILES.nativeOptions)
    const sfRecycling = program.getSourceFile(SOURCE_FILES.recyclingCellTypes)
    const sfColumn = program.getSourceFile(SOURCE_FILES.column)

    if (!sfPublic || !sfIndex || !sfNative || !sfRecycling || !sfColumn) {
      const loaded = program.getSourceFileNames()
      throw new Error(`Missing source file. Loaded: ${loaded.join(', ')}`)
    }

    // table: TableProps full fields
    const tableProps = findInterface(sfPublic, 'TableProps')
    if (!tableProps) throw new Error('TableProps not found')
    const table = extractInterfaceMembers(tableProps)

    // tableRef: TableRef methods
    const tableRefIface = findInterface(sfPublic, 'TableRef')
    if (!tableRefIface) throw new Error('TableRef not found')
    const tableRef = extractInterfaceMembers(tableRefIface)

    // gridOptions: inline type literal on TableProps.gridOptions
    const gridOptionsMember = findMember(tableProps, 'gridOptions')
    if (!gridOptionsMember || !gridOptionsMember.type || !ast.isTypeLiteralNode(gridOptionsMember.type)) {
      throw new Error('TableProps.gridOptions inline type not found')
    }
    const gridOptions = extractInterfaceMembers(gridOptionsMember.type)

    // column: ColumnType full fields (compat/column.ts)
    const columnType = findInterface(sfColumn, 'ColumnType')
    if (!columnType) throw new Error('ColumnType not found')
    const column = extractInterfaceMembers(columnType)

    // gridColumnOptions: GridColumnOptions (recyclingCellTypes.ts)
    const gridColumnOptionsIface = findInterface(sfRecycling, 'GridColumnOptions')
    if (!gridColumnOptionsIface) throw new Error('GridColumnOptions not found')
    const gridColumnOptions = extractInterfaceMembers(gridColumnOptionsIface)

    // selection: GridSelectionOptions (nativeOptions.ts)
    const selectionIface = findInterface(sfNative, 'GridSelectionOptions')
    if (!selectionIface) throw new Error('GridSelectionOptions not found')
    const selection = extractInterfaceMembers(selectionIface)

    // virtualizationMode: VirtualizationMode union (recyclingCellTypes.ts)
    const virtualizationMode = extractVirtualizationMode(sfRecycling)

    // exports: main entry (src/table/index.ts)
    const exports = extractExports(sfIndex)

    const payload = {
      table,
      tableRef,
      gridOptions,
      column,
      gridColumnOptions,
      selection,
      virtualizationMode,
      exports,
    }

    mkdirSync(dirname(OUTPUT_FILE), { recursive: true })
    writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8')

    const counts = Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]),
    )
    console.log(`api.json written to ${OUTPUT_FILE}`)
    console.log('Member counts:', counts)
  } finally {
    api.close()
  }
}

main()

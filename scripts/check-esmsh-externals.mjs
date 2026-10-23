/**
 * esm.sh 外置自检（需要网络，不进 `pnpm test`）。
 *
 * 构建期守卫（`docs:cdn-guard`）只能证明"我的产物里没有把外置包就地打包"，
 * 证明不了"esm.sh 吐出来的那几个模块之间没有偷偷内联一份私有实例"。
 * 后者不会让构建变红，只会在浏览器里变成
 * `multiple instances of @codemirror/state ... breaking instanceof checks`
 * （family 组）或双 React（React error #527）。
 *
 * 用法：
 * - `pnpm check:esmsh`         只查 `family` 组（`instanceof` 风险所在，快）
 * - `pnpm check:esmsh --all`   连 single / bundle 组一起查（antd 那条 ~1.5 MB）
 *
 * 每条 URL 断言三件事：
 * 1. body 里没有 `https://esm.sh/` 绝对 URL（绝对 URL 会绕过 import map）；
 * 2. body 里出现的裸 specifier 必须都在生成表的 `externals` 里；
 * 3. shim re-export 的 inner 模块同样满足 1、2（真正干活的是 inner）。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const checkAll = process.argv.includes('--all')

const cdnMap = JSON.parse(readFileSync(join(repoRoot, 'src/docs/generated/cdn-importmap.json'), 'utf8'))
const allowed = new Set(cdnMap.externals)
const targets = checkAll
  ? cdnMap.entries
  : cdnMap.entries.filter((entry) => entry.strategy === 'family')

if (targets.length === 0) {
  console.error('[check-esmsh] 生成表里没有可查的条目（先跑 `pnpm docs:cdn-map`）')
  process.exit(1)
}

/** 只看模块顶部的 import/export 前缀，避开正文里的字符串字面量。 */
const IMPORT_PREFIX =
  /^(?:\s*(?:import|export)\s*(?:\{[^{}]*\}|\*(?:\s*as\s*[\w$]+)?|[\w$]+)?\s*(?:from\s*)?["'][^"']+["'];?)+/
const ALL_SPECIFIERS_RE = /from\s*"([^"]+)"|import\s*\("([^"]+)"\)|import\s*"([^"]+)"/g

function bareSpecifiersOf(code) {
  const prefix = code.match(IMPORT_PREFIX)?.[0] ?? ''
  return [...new Set([...prefix.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]))].filter(
    (spec) => !spec.startsWith('.') && !spec.startsWith('/'),
  )
}

/** 查出 shim 指向的 inner 模块（`export * from "/pkg@ver/X-…/…"`）。 */
function innerPathOf(code) {
  for (const match of code.matchAll(ALL_SPECIFIERS_RE)) {
    const spec = match[1] ?? match[2] ?? match[3]
    if (spec.startsWith('/')) return spec
  }
  return null
}

async function fetchText(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

function problemsOf(code) {
  const problems = []
  if (code.includes('https://esm.sh/')) problems.push('body 里出现 esm.sh 绝对 URL（会绕过 import map）')
  const leaked = bareSpecifiersOf(code).filter((spec) => !allowed.has(spec))
  if (leaked.length > 0) problems.push(`出现 externals 之外的裸 specifier：${leaked.join(', ')}`)
  return problems
}

let failures = 0
const report = []

for (const entry of targets) {
  let body
  try {
    body = await fetchText(entry.url)
  } catch (error) {
    failures += 1
    report.push(`✗ ${entry.specifier}: 请求失败 ${error instanceof Error ? error.message : String(error)}`)
    continue
  }

  const problems = problemsOf(body)
  let innerNote = ''
  const innerPath = innerPathOf(body)
  if (innerPath) {
    const innerUrl = new URL(innerPath, 'https://esm.sh').href
    try {
      const innerBody = await fetchText(innerUrl)
      innerNote = ` inner=${(innerBody.length / 1024).toFixed(0)}KB`
      problems.push(...problemsOf(innerBody).map((problem) => `inner ${problem}`))
    } catch (error) {
      problems.push(`inner 请求失败 ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (problems.length > 0) {
    failures += 1
    report.push(`✗ ${entry.specifier}: ${problems.join('；')}`)
  } else {
    report.push(
      `✓ ${entry.specifier.padEnd(36)} ${entry.strategy.padEnd(6)} shim=${(body.length / 1024).toFixed(1)}KB${innerNote}`,
    )
  }
}

for (const line of report) console.log(line)
console.log(
  failures === 0
    ? `\nOK: ${targets.length} 条 esm.sh 外置全部自洽（无绝对 URL、无 externals 外的裸 specifier）`
    : `\nFAIL: ${failures}/${targets.length} 条有问题`,
)
process.exit(failures === 0 ? 0 : 1)

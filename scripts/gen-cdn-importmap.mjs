/**
 * 生成 CDN 档的 import map 落地表：`src/docs/generated/cdn-importmap.json`。
 *
 * 三个档位里只有 CDN 档需要这张表；默认档与单文件档都自托管，不碰 esm.sh。
 *
 * ## 为什么需要脚本（而不是在 `vite.docs.shared.ts` 里手写五条字面量）
 * `tsconfig.node.json` 刻意不引 `@types/node`（vite 配置不碰 Node 类型面），
 * 所以配置里读不到 `node_modules`。版本与依赖闭包只能在 Node 侧解析，产物 JSON 由
 * TS 静态导入 —— 与 `scripts/extract-api.mjs` → `src/docs/generated/api.json` 同一套路。
 *
 * ## 三种落地策略（判据只有一条：这个包族是否跨模块做引用相等 / `instanceof`）
 *
 * | strategy | 谁 | 怎么落地 | 依赖谁解析 |
 * | --- | --- | --- | --- |
 * | `single` | react 族（4 条裸 specifier） | 一条 URL | esm.sh 自己解析 |
 * | `bundle` | antd | 一条 URL + `&bundle`（否则 1163 个模块请求） | esm.sh 内联进同一个文件 |
 * | `family` | CodeMirror 闭包（18 个包） | **每个包各占一条**，每条的 `?external=` 列全闭包 | 页面上的 import map |
 *
 * `family` 的存在理由：CodeMirror 跨模块做 `instanceof @codemirror/state`，
 * 一旦让 esm.sh 内联（`?bundle`）就是两份 state ⇒
 * "multiple instances ... breaking instanceof checks"。
 * 反过来只列 `@codemirror/state` 也不够：其余依赖会被编成 root-relative 的**版本区间**
 * （`/crelt@^1.0.6`），import map 拦不住 ⇒ 版本漂到 CDN 侧当时的最新版。
 * 所以 family 必须"全量 external + 每条都列全 + 禁 bundle"。
 *
 * ## 版本来源
 * 每个包都从**它自己的** package.json 取版本。不要把一个包的版本复用到另一个包上
 * （曾经的 bug：`react-dom` 的 URL 用了 `react` 的版本号；`react-dom` 的 peer 是 `^19`，
 * pnpm 完全可能装出 react 19.3 + react-dom 19.2，那天就会 pin 出一个不存在的版本 → 404）。
 *
 * 用法：
 * - `node scripts/gen-cdn-importmap.mjs`          生成/覆盖 JSON
 * - `node scripts/gen-cdn-importmap.mjs --check`   只比对，不一致则非零退出（进 `pnpm test`）
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const outFile = join(repoRoot, 'src/docs/generated/cdn-importmap.json')
const checkOnly = process.argv.includes('--check')

/**
 * CDN 档外置的"根"。新增一组外置只动这张表。
 *
 * 选策略只问一句：**这个包的家族会不会跨模块做 `instanceof` / 引用相等？**
 * - 会 ⇒ `family`（贵：N 条请求，但保证单实例）
 * - 不会 ⇒ 先试 `bundle`（省请求），不行再退 `single`
 */
const CDN_ROOTS = [
  { strategy: 'single', specifier: 'react' },
  { strategy: 'single', specifier: 'react/jsx-runtime' },
  { strategy: 'single', specifier: 'react-dom', external: ['react'] },
  { strategy: 'single', specifier: 'react-dom/client', external: ['react'] },
  { strategy: 'bundle', specifier: 'antd', external: ['react', 'react-dom'] },
  {
    strategy: 'family',
    // 只列 `src/` 真正 import 的入口；闭包由脚本展开。
    roots: [
      'codemirror',
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/lang-javascript',
      '@codemirror/theme-one-dark',
    ],
  },
]

/** `@scope/pkg/sub` → `{ pkg: '@scope/pkg', subpath: 'sub' }`；`pkg/sub` → `{ pkg, subpath: 'sub' }`。 */
function splitSpecifier(specifier) {
  const parts = specifier.split('/')
  const isScoped = specifier.startsWith('@')
  const pkg = isScoped ? parts.slice(0, 2).join('/') : parts[0]
  const subpath = parts.slice(isScoped ? 2 : 1).join('/')
  return { pkg, subpath }
}

/** 解析某个包名在 `fromDir` 视角下的包目录。 */
function resolvePkgDir(name, fromDir) {
  const req = createRequire(pathToFileURL(join(fromDir, 'noop.js')).href)
  let entry
  try {
    // 优先解析 main：`exports` 常常不允许 './package.json'。
    entry = req.resolve(name)
  } catch {
    return dirname(req.resolve(`${name}/package.json`))
  }
  let dir = dirname(entry)
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(dir, 'package.json')
    try {
      const pkg = JSON.parse(readFileSync(candidate, 'utf8'))
      if (pkg.name === name) return dir
    } catch {
      // 继续往上
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error(`[cdn-importmap] 找不到 ${name} 的 package.json（from ${fromDir}）`)
}

/** 读一个已安装包的 package.json（失败即 fail-fast：少一条外置项等于运行期 404）。 */
function readPkg(name, fromDir) {
  let dir
  try {
    dir = resolvePkgDir(name, fromDir)
  } catch (error) {
    console.error(String(error instanceof Error ? error.message : error))
    process.exit(1)
  }
  return { dir, pkg: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) }
}

/** 广度优先求依赖闭包：包名 → { name, version, dir }。 */
function collectClosure(roots) {
  const seen = new Map()
  const queue = roots.map((name) => ({ name, fromDir: repoRoot }))
  while (queue.length > 0) {
    const { name, fromDir } = queue.shift()
    if (seen.has(name)) continue
    const { dir, pkg } = readPkg(name, fromDir)
    seen.set(name, { name, version: pkg.version, dir })
    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      if (!seen.has(dep)) queue.push({ name: dep, fromDir: dir })
    }
  }
  return seen
}

function esmUrl({ pkg, version, subpath, external, bundle }) {
  const query = []
  if (external?.length) query.push(`external=${external.join(',')}`)
  if (bundle) query.push('bundle')
  return (
    `https://esm.sh/${pkg}@${version}` +
    (subpath ? `/${subpath}` : '') +
    (query.length ? `?${query.join('&')}` : '')
  )
}

const entries = []
const externals = new Set()

for (const root of CDN_ROOTS) {
  if (root.strategy === 'family') {
    const closure = collectClosure(root.roots)
    const family = [...closure.keys()].sort()
    for (const name of family) {
      const { version } = closure.get(name)
      entries.push({
        specifier: name,
        strategy: 'family',
        package: name,
        version,
        url: esmUrl({ pkg: name, version, external: family }),
      })
      // 闭包里每个包都进 external：以后有人在 `src/` 里直接 import 其中一个，
      // 也不会被静默打进本地 chunk（那会造成第二份实例）。
      externals.add(name)
    }
    continue
  }

  const { pkg, subpath } = splitSpecifier(root.specifier)
  const { pkg: manifest } = readPkg(pkg, repoRoot)
  entries.push({
    specifier: root.specifier,
    strategy: root.strategy,
    package: pkg,
    version: manifest.version,
    url: esmUrl({
      pkg,
      version: manifest.version,
      subpath,
      external: root.external,
      bundle: root.strategy === 'bundle',
    }),
  })
  externals.add(root.specifier)
}

const payload = {
  $comment:
    '由 scripts/gen-cdn-importmap.mjs 生成，不要手改。策略判据见该脚本顶部：single / bundle / family。',
  externals: [...externals],
  entries,
}

const serialized = `${JSON.stringify(payload, null, 2)}\n`

if (checkOnly) {
  let current = ''
  try {
    current = readFileSync(outFile, 'utf8')
  } catch {
    console.error(
      '[cdn-importmap] 缺少 src/docs/generated/cdn-importmap.json，请运行 `pnpm docs:cdn-map`',
    )
    process.exit(1)
  }
  if (current !== serialized) {
    console.error(
      '[cdn-importmap] 生成表与本地安装树不一致（外置根或依赖版本变了？），' +
        '请运行 `pnpm docs:cdn-map` 并提交产物。',
    )
    process.exit(1)
  }
  console.log(`[cdn-importmap] OK：${entries.length} 条映射与安装树一致`)
} else {
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, serialized)
  const rel = outFile.replace(repoRoot, '').replace(/^[\\/]/, '')
  console.log(`[cdn-importmap] 写入 ${rel}（${entries.length} 条映射，${externals.size} 个 external）`)
}

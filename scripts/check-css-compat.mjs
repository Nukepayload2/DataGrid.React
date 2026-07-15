import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const targetBrowsers = 'Chrome >= 105'
const doiuseIgnoredFeatures = [
  // Progressive enhancement: the grid layout still updates without animation.
  'css-grid-animation',
  // Chrome 105 uses the WebKit scrollbar rules below this Firefox-oriented rule.
  'css-scrollbar',
]

const doiuseResult = spawnSync(
  process.execPath,
  [
    'node_modules/doiuse/bin/cli.js',
    '--browsers',
    targetBrowsers,
    '--ignore',
    doiuseIgnoredFeatures.join(','),
    '--json',
    'dist/style.css',
  ],
  { encoding: 'utf8' },
)

if (doiuseResult.error) {
  console.error(doiuseResult.error.message)
  process.exit(1)
}

if (doiuseResult.status !== 0) {
  process.stdout.write(doiuseResult.stdout)
  process.stderr.write(doiuseResult.stderr)
  process.exit(doiuseResult.status ?? 1)
}

const doiuseFindings = doiuseResult.stdout
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith('{'))
  .map((line) => JSON.parse(line))

if (doiuseFindings.length > 0) {
  console.error(`CSS compatibility check failed for ${targetBrowsers}:`)
  for (const finding of doiuseFindings) {
    console.error(`- ${finding.message}`)
  }
  process.exit(1)
}

const cssFiles = []

function collectCssFiles(dir) {
  if (!existsSync(dir)) return

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectCssFiles(path)
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      cssFiles.push(path)
    }
  }
}

collectCssFiles('src')
if (existsSync('dist/style.css')) {
  cssFiles.push('dist/style.css')
}

const forbiddenFunctionPattern = /color-mix\s*\(/i
const colorMixFiles = cssFiles.filter((file) => forbiddenFunctionPattern.test(readFileSync(file, 'utf8')))

if (colorMixFiles.length > 0) {
  console.error(`CSS compatibility check failed for ${targetBrowsers}: color-mix() requires Chrome 111.`)
  for (const file of colorMixFiles) {
    console.error(`- ${file}`)
  }
  process.exit(1)
}

console.log(`CSS compatibility check passed for ${targetBrowsers}.`)

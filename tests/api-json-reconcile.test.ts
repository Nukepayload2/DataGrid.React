/**
 * api.json 双向对账门（BAT-0 0-D）。
 *
 * 背景：`tests/api-json.test.ts` 是**单向**门——只查 api.json 的 summary 非空。
 * 两类漂移它抓不到：
 *   ① 公共类型（TableProps / ColumnType / …）新增成员（带 JSDoc）但忘了 `pnpm docs:api`
 *      ⇒ 文档缺新成员（单向门对「多出来的」不敏感）；
 *   ② 成员被删 / 改名但忘了重新生成 ⇒ 文档残留僵尸成员。
 *
 * 本门把 `scripts/extract-api.mjs` 导出的 `extractPayload()`（与 `pnpm docs:api`
 * **同一份解析代码**，BAT-0 0-D 小重构）在内存中跑一遍，与提交的
 * `src/docs/generated/api.json` 双向对账：namespace 集、成员名集、全量 payload
 * 三层对账，任一方向漂移即红，失败信息列出具体 namespace / 成员。
 *
 * 自证（BAT-0 0-D，读数见 96 报告 §6）：临时给 `TableProps` 加一个假 JSDoc prop
 *   ⇒ 本门红（①方向）⇒ 还原（cp 备份 + sha1 校验，P-084）。
 *
 * 无副作用：不写文件（`extractPayload()` 只读 AST）；唯一耗时是打开
 *   `tsconfig.lib.json` 项目（实测 ~1s，故单测超时放宽到 60s 防重负载 flake）。
 */
// @ts-expect-error TS2591：本仓无 @types/node，'node:fs' 无类型声明（运行时可用）
import { readFileSync } from 'node:fs'
// @ts-expect-error TS2591：本仓无 @types/node，'node:path' 无类型声明（运行时可用）
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// @ts-expect-error TS7016：scripts/extract-api.mjs 为 .mjs 无类型声明（运行时可用；自校验：日后补声明则因「抑制未被使用」TS2578 翻红）
import { extractPayload } from '../scripts/extract-api.mjs'

const committedRaw = readFileSync(
  // @ts-expect-error TS2591：本仓无 @types/node，'process' 无类型声明（运行时可用）
  join(process.cwd(), 'src/docs/generated/api.json'),
  'utf8',
)
const committed = JSON.parse(committedRaw) as Record<string, Array<{ name: string }>>

describe('api.json 双向对账（BAT-0 0-D）', () => {
  it(
    '提交的 api.json 与公共类型源完全同步（双向）',
    { timeout: 60_000 },
    () => {
      const fresh = extractPayload() as Record<string, Array<{ name: string }>>

      // ① namespace 集双向相等（防整段 namespace 静默消失 / 凭空多出来）。
      const freshNs = Object.keys(fresh).sort()
      const committedNs = Object.keys(committed).sort()
      expect(
        freshNs,
        `namespace 集漂移：源侧=[${freshNs}] 提交侧=[${committedNs}]`,
      ).toEqual(committedNs)

      // ② 成员名集双向相等（防 ① 新增未生成 / ② 删除未清理）。
      const memberDiffs: string[] = []
      for (const ns of freshNs) {
        const freshNames = (fresh[ns] ?? []).map((m) => m.name)
        const committedNames = (committed[ns] ?? []).map((m) => m.name)
        for (const name of committedNames) {
          if (!freshNames.includes(name)) {
            memberDiffs.push(`[${ns}] 提交侧有 "${name}" 但源侧没有（僵尸成员，源已删/改名）`)
          }
        }
        for (const name of freshNames) {
          if (!committedNames.includes(name)) {
            memberDiffs.push(`[${ns}] 源侧有 "${name}" 但提交侧没有（新增未重新生成）`)
          }
        }
      }
      expect(memberDiffs, memberDiffs.join('\n')).toEqual([])

      // ③ 全量 payload 深比较（signature / type / required / summary / deprecated / since 全对齐）。
      expect(
        fresh,
        '全量 payload 漂移——跑 `pnpm docs:api` 重新生成后提交',
      ).toEqual(committed)
    },
  )
})

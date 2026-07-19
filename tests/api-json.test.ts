/**
 * docs api.json summary 防回退测试。
 *
 * 纯读 `src/docs/generated/api.json`，遍历 `table` 与 `column` 两个 namespace，
 * 断言每个成员的 `summary` 非空且非纯空白。失败信息带出具体 namespace + 成员 name，
 * 便于定位是哪个字段缺 JSDoc。
 *
 * 无副作用：不写文件、不发请求、不启动进程。
 */
import { describe, expect, it } from 'vitest'
import apiJson from '../src/docs/generated/api.json'

/** 单个 API 成员的运行时形态（与 docs:api 生成器输出对齐）。 */
interface ApiMember {
  name: string
  kind: string
  signature?: string
  type?: string
  required?: boolean
  advanced?: boolean
  summary?: string
}

/** namespace 名 → 成员数组。 */
type ApiDoc = Record<string, ApiMember[]>

const doc = apiJson as unknown as ApiDoc

/** 必须覆盖的 namespace 名——若 api.json 结构变更导致缺失，应立即失败（防静默通过）。 */
const REQUIRED_NAMESPACES = ['table', 'column'] as const

/**
 * 判定 summary 是否"有效非空"：
 *   - undefined / null / 空串 → 无效
 *   - 仅含空白（空格 / 制表 / 换行）→ 无效
 *   - 否则有效
 */
function hasNonBlankSummary(member: ApiMember): boolean {
  return typeof member.summary === 'string' && member.summary.trim().length > 0
}

describe('docs api.json summary 防回退', () => {
  it('api.json 顶层包含必填 namespace（table / column）', () => {
    for (const ns of REQUIRED_NAMESPACES) {
      expect(
        Array.isArray(doc[ns]),
        `api.json 缺少 namespace[${ns}] 或其值不是数组`,
      ).toBe(true)
    }
  })

  it.each(REQUIRED_NAMESPACES)(
    'namespace[%s] 的每个成员都有非空、非纯空白的 summary',
    (ns) => {
      const members = doc[ns] ?? []
      // 防止 namespace 退化为空数组后整段测试静默通过。
      expect(
        members.length,
        `namespace[${ns}] 成员数组为空，无法证伪 summary 防回退`,
      ).toBeGreaterThan(0)

      const offenders = members
        .filter((m) => !hasNonBlankSummary(m))
        .map((m) => m.name)

      expect(
        offenders,
        `namespace[${ns}] 存在 summary 为空 / 纯空白的成员: ${offenders.join(', ')}`,
      ).toEqual([])
    },
  )
})

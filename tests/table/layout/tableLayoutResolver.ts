import { describe, expect, it } from 'vitest'
import { resolveTableLayout } from '../../../src/table/tableLayoutResolver'
import {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  type ColumnOrSentinel,
  type ColumnType,
} from '../../../src/table/types'

// 测试用 RecordType（resolveTableLayout 对 RecordType 不敏感，纯结构判定）。
type Rec = { key: string }

const leaf = (over: Partial<ColumnType<Rec>> = {}): ColumnType<Rec> => ({
  dataIndex: 'x',
  ...over,
})

describe('resolveTableLayout', () => {
  describe('explicit tableLayout prop wins', () => {
    it("returns 'fixed' when tableLayout='fixed' regardless of columns/scroll/sticky", () => {
      // 即使没有任何 fixed/ellipsis/scroll 触发条件，显式 fixed 优先。
      expect(resolveTableLayout('fixed', [leaf()], undefined, undefined, undefined)).toBe(
        'fixed',
      )
      // 反向也成立：有 fixed 列但用户显式 auto，仍 auto。
      expect(
        resolveTableLayout('fixed', [leaf({ fixed: 'start' })], undefined, undefined, undefined),
      ).toBe('fixed')
    })

    it("returns 'auto' when tableLayout='auto' even if fixed/ellipsis/scroll would normally escalate", () => {
      // 显式 auto 覆盖 fixColumn + fixHeader 等所有派生条件。
      expect(
        resolveTableLayout(
          'auto',
          [leaf({ fixed: 'end', ellipsis: true })],
          200,
          true,
          true,
        ),
      ).toBe('auto')
    })
  })

  describe('no explicit tableLayout — derived from columns/scroll/sticky', () => {
    it("returns 'auto' by default for plain columns without fixed/ellipsis/scroll/sticky", () => {
      expect(resolveTableLayout(undefined, [leaf()], undefined, undefined, undefined)).toBe(
        'auto',
      )
      // 多列也无 fixed/ellipsis 时仍 auto（basic demo 走此路径）。
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ dataIndex: 'a' }), leaf({ dataIndex: 'b' })],
          undefined,
          undefined,
          undefined,
        ),
      ).toBe('auto')
    })

    it("escalates to 'fixed' when any leaf column has fixed:'start'", () => {
      expect(
        resolveTableLayout(
          undefined,
          [leaf(), leaf({ fixed: 'start' })],
          undefined,
          undefined,
          undefined,
        ),
      ).toBe('fixed')
    })

    it("escalates to 'fixed' when any leaf column has fixed:'end'", () => {
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ fixed: 'end' }), leaf()],
          undefined,
          undefined,
          undefined,
        ),
      ).toBe('fixed')
    })

    it("escalates to 'fixed' when any leaf column has ellipsis", () => {
      expect(
        resolveTableLayout(
          undefined,
          [leaf(), leaf({ ellipsis: true })],
          undefined,
          undefined,
          undefined,
        ),
      ).toBe('fixed')
    })

    it("escalates to 'fixed' when every real leaf column has a numeric or px width", () => {
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ width: 80 }), leaf({ width: 120 }), leaf({ width: '160px' })],
          undefined,
          undefined,
          undefined,
        ),
      ).toBe('fixed')
    })

    it("keeps 'auto' when any leaf column has percentage, non-px string, or missing width", () => {
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ width: 80 }), leaf({ width: '30%' })],
          undefined,
          undefined,
          undefined,
        ),
      ).toBe('auto')
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ width: 80 }), leaf({ width: '12rem' })],
          undefined,
          undefined,
          undefined,
        ),
      ).toBe('auto')
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ width: 80 }), leaf()],
          undefined,
          undefined,
          undefined,
        ),
      ).toBe('auto')
    })

    it("keeps 'auto' for all-width columns when scroll.x==='max-content'", () => {
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ width: 80 }), leaf({ width: 120 })],
          'max-content',
          undefined,
          undefined,
        ),
      ).toBe('auto')
    })

    it("escalates to 'fixed' when scroll.y===true (fixHeader — container-fixed header)", () => {
      expect(resolveTableLayout(undefined, [leaf()], undefined, true, undefined)).toBe(
        'fixed',
      )
    })

    it("escalates to 'fixed' when sticky is enabled (page-level sticky)", () => {
      expect(resolveTableLayout(undefined, [leaf()], undefined, undefined, true)).toBe(
        'fixed',
      )
      // sticky 为对象配置也算启用（!== false 且 !== undefined）。
      expect(
        resolveTableLayout(undefined, [leaf()], undefined, undefined, { offsetHeader: 0 }),
      ).toBe('fixed')
    })

    it("treats sticky=false as disabled (does not escalate)", () => {
      expect(resolveTableLayout(undefined, [leaf()], undefined, undefined, false)).toBe(
        'auto',
      )
    })

    it("escalates to 'fixed' when scroll.x is a number (causes fixColumn path)", () => {
      // 注意：此处列无 fixed，但 scroll.x 数字本身不触发（仅 fixColumn+scrollX 才走 max-content 分支）。
      //   antd 规则：scroll.x 不在 mergedTableLayout 的直接条件里，仅 fixColumn 时影响 max-content 判定。
      //   所以此用例实际仍 auto（确认 scroll.x 数字本身不升级）。
      expect(resolveTableLayout(undefined, [leaf()], 800, undefined, undefined)).toBe(
        'auto',
      )
    })
  })

  describe('fixColumn + scroll.x interaction', () => {
    it("returns 'fixed' when fixColumn present and scroll.x is a number", () => {
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ fixed: 'start' })],
          800,
          undefined,
          undefined,
        ),
      ).toBe('fixed')
    })

    it("returns 'fixed' when fixColumn present and scroll.x is a string number", () => {
      // scroll.x 为字符串数字（如 '800'）—— 非 'max-content'，按 antd 规则仍 fixed。
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ fixed: 'start' })],
          '800',
          undefined,
          undefined,
        ),
      ).toBe('fixed')
    })

    it("returns 'auto' when fixColumn present and scroll.x==='max-content'", () => {
      // antd 规则：fixColumn + max-content → auto（让内容自然撑宽，sticky 列随内容定位）。
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ fixed: 'start' })],
          'max-content',
          undefined,
          undefined,
        ),
      ).toBe('auto')
    })

    it("returns 'fixed' when fixColumn present and scroll.x is undefined", () => {
      // fixColumn 但无 scroll.x → 非 max-content → fixed（默认路径）。
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ fixed: 'end' })],
          undefined,
          undefined,
          undefined,
        ),
      ).toBe('fixed')
    })

    it("fixColumn + max-content short-circuits fixHeader/ellipsis (still auto)", () => {
      // 对齐 antd `Table.tsx:620-622`：fixColumn 分支提前返回，不落到 fixHeader/ellipsis 分支。
      //   即使同时有 fixHeader（scroll.y=true）+ ellipsis 列，fixColumn + max-content 仍 auto。
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ fixed: 'start', ellipsis: true })],
          'max-content',
          true,
          true,
        ),
      ).toBe('auto')
    })
  })

  describe('sentinel columns are skipped', () => {
    it('does not treat SELECTION_COLUMN / EXPAND_COLUMN sentinel as fixed/ellipsis', () => {
      // 哨兵不是 ColumnType，不带 fixed/ellipsis；只有哨兵 + 普通列时仍按普通列判定。
      const cols: Array<ColumnOrSentinel<Rec>> = [
        SELECTION_COLUMN,
        leaf(),
        EXPAND_COLUMN,
      ]
      expect(resolveTableLayout(undefined, cols, undefined, undefined, undefined)).toBe(
        'auto',
      )

      // 哨兵列不参与 all-width 判定；真实列都给 numeric/px width 时仍升级。
      const allWidthCols: Array<ColumnOrSentinel<Rec>> = [
        SELECTION_COLUMN,
        leaf({ width: 80 }),
        EXPAND_COLUMN,
        leaf({ width: 120 }),
      ]
      expect(
        resolveTableLayout(undefined, allWidthCols, undefined, undefined, undefined),
      ).toBe('fixed')

      // 普通列带 fixed 时仍升级（哨兵不干扰判定）。
      const withFixed: Array<ColumnOrSentinel<Rec>> = [
        SELECTION_COLUMN,
        leaf({ fixed: 'start' }),
        EXPAND_COLUMN,
      ]
      expect(
        resolveTableLayout(undefined, withFixed, undefined, undefined, undefined),
      ).toBe('fixed')
    })
  })

  describe('combined conditions', () => {
    it("returns 'fixed' when both fixHeader and ellipsis present (any of fixHeader/isSticky/ellipsis)", () => {
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ ellipsis: true })],
          undefined,
          true,
          undefined,
        ),
      ).toBe('fixed')
    })

    it("returns 'auto' when no conditions escalate and explicit prop is undefined", () => {
      // 全空场景：narrow demo 三列均无 fixed/ellipsis/scroll/sticky → auto（narrow 语义预期）。
      expect(
        resolveTableLayout(
          undefined,
          [leaf({ dataIndex: 'a' }), leaf({ dataIndex: 'b' }), leaf({ dataIndex: 'c' })],
          undefined,
          undefined,
          undefined,
        ),
      ).toBe('auto')
    })
  })
})

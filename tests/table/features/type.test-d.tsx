// 黑盒 feature-slice 类型测试：data-grid 自有类型面（**不是** antd type.test.tsx 的移植）。
//
// 对齐来源（antd 侧只作对照参考，字段/字段名以 data-grid 为准）:
//   G:\Projects\ant-design\components\table\__tests__\ 内无与本文件逐条对齐的源；
//   本文件按 data-grid 公共类型实际形状撰写，逐条列出 src 依据：
//     - TableProps / TableRef        src/table/publicTypes.ts:33-778
//     - ColumnOrSentinel / 哨兵       src/table/compat/expand.ts:154-171
//     - ColumnSorter / CompareFn      src/table/compat/sort.ts:16-59
//     - TableSemantic* / TableClassNames / TableStyles
//                                    src/table/compat/semantic.ts:78-142
//     - TablePaginationState          src/table/compat/pagination.ts:101-105
//     - TableCurrentDataSource        src/table/compat/onChange.ts:12-15
//     - scrollTo 的 key→index 适配与「非虚拟 no-op」  src/table/buildTableRefHandle.ts:39-86
//
// 六条（expectTypeOf）：
//   1) TableProps<T> 泛型：dataSource / rowKey / columns 的记录类型联动
//   2) ColumnOrSentinel：Table.EXPAND_COLUMN / Table.SELECTION_COLUMN 可入 columns
//   3) 排序字段签名：函数形态是 compare（无 antd 的 `sorter: { sorter: fn }` sugar）、`sorter: true` 合法
//   4) classNames / styles 函数形态（回调参数类型）
//   5) TableRef.scrollTo 的参数类型
//   6) onChange 的四参元组签名（pagination / filters / sorter / extra）
//
// 双消费约定：本文件被 `pnpm test`（普通运行时）当普通测试收集，故断言写在 it() 内
// （expectTypeOf 运行时是 no-op）；`pnpm test:types`（vitest --typecheck --run）按 *.test-d.* 做类型检查。
// 「不该通过」的断言用 `// @ts-expect-error`（错误应报在该指令的下一行，故相关语句保持单行）。
import { describe, expectTypeOf, it } from 'vitest'
import type { HTMLAttributes, Key } from 'react'

import {
  Table,
  type ColumnOrSentinel,
  type ColumnSorter,
  type ColumnType,
  type CompareFn,
  type RowKeyType,
  type SizeType,
  type SortOrder,
  type SorterResult,
  type TableClassNames,
  type TableCurrentDataSource,
  type TablePaginationConfig,
  type TablePaginationState,
  type TableProps,
  type TableRef,
  type TableSemanticClassNames,
  type TableSemanticInfo,
  type TableSemanticStyles,
  type TableStyles,
} from '../../../src/table/index'
import type { FilterValue } from '../../../src/table/types'

interface Row {
  id: number
  name: string
  age: number
}

const rows: Array<Row> = [{ id: 1, name: 'alpha', age: 20 }]

describe('data-grid type surface', () => {
  it('links TableProps record type through dataSource / rowKey / columns', () => {
    expectTypeOf<TableProps<Row>['dataSource']>().toEqualTypeOf<Array<Row> | undefined>()
    expectTypeOf<TableProps<Row>['rowKey']>().toEqualTypeOf<RowKeyType | undefined>()
    expectTypeOf<TableProps<Row>['columns']>().toEqualTypeOf<
      Array<ColumnOrSentinel<Row>> | undefined
    >()
    expectTypeOf<NonNullable<TableProps<Row>['columns']>[number]>().toEqualTypeOf<
      ColumnOrSentinel<Row>
    >()
    // onRow 的 record 参数跟随泛型（src/table/publicTypes.ts:666-669）。
    expectTypeOf<TableProps<Row>['onRow']>().toEqualTypeOf<
      ((record: Row, index: number) => HTMLAttributes<HTMLElement> | undefined) | undefined
    >()

    // 具体字面量可赋值（记录类型联动生效）。
    const props: TableProps<Row> = {
      dataSource: rows,
      rowKey: 'id',
      columns: [{ title: 'Name', dataIndex: 'name', sorter: true }],
    }
    expectTypeOf(props.dataSource).toEqualTypeOf<Array<Row> | undefined>()

    // RowKeyType 的定义（src/table/publicTypes.ts:31）：字段名或 (record: any) => string | number。
    expectTypeOf<RowKeyType>().toEqualTypeOf<string | ((record: any) => string | number)>()
    // rowKey 函数形态接受带类型参数的取值器（RowKeyType 的参数为 any，可被 Row 收窄）。
    const propsWithRowKeyFn: TableProps<Row> = { dataSource: rows, rowKey: (record: Row) => record.id }
    expectTypeOf(propsWithRowKeyFn.rowKey).toEqualTypeOf<RowKeyType | undefined>()

    // 负例：dataSource 元素必须满足 RecordType。
    // @ts-expect-error id 是 number、且缺 name/age —— 不满足 Row
    const badDataSource: TableProps<Row> = { dataSource: [{ id: 'not-a-number' }] }
    expectTypeOf(badDataSource).toEqualTypeOf<TableProps<Row>>()

    // 负例：rowKey 只接受字段名或取值函数。
    // @ts-expect-error rowKey 不接受数字
    const badRowKey: TableProps<Row> = { rowKey: 42 }
    expectTypeOf(badRowKey).toEqualTypeOf<TableProps<Row>>()
  })

  it('accepts ColumnOrSentinel sentinels in columns', () => {
    // 正例：哨兵与普通列定义混排。
    const columns: Array<ColumnOrSentinel<Row>> = [
      Table.EXPAND_COLUMN,
      Table.SELECTION_COLUMN,
      { title: 'Name', dataIndex: 'name' },
    ]
    expectTypeOf(columns).toEqualTypeOf<Array<ColumnOrSentinel<Row>>>()

    // 静态哨兵与 types barrel 导出的常量同一类型（src/table/Table.tsx:197-199）。
    expectTypeOf<typeof Table.EXPAND_COLUMN>().toEqualTypeOf<typeof Table.SELECTION_COLUMN>()

    const columnsProp: TableProps<Row>['columns'] = [Table.SELECTION_COLUMN, { dataIndex: 'age' }]
    expectTypeOf(columnsProp).toMatchTypeOf<Array<ColumnOrSentinel<Row>> | undefined>()

    // 结构性事实（src/table/compat/expand.ts:154,165）：两个哨兵都是 `{} as const`，类型层无
    // 判别标识（keyof 为 never），故 union 里还含一个空对象类型——任何非 null 对象都能通过元素检查。
    expectTypeOf<keyof typeof Table.EXPAND_COLUMN>().toEqualTypeOf<never>()
    const sentinelOnly: ColumnOrSentinel<Row> = Table.SELECTION_COLUMN
    expectTypeOf(sentinelOnly).toEqualTypeOf<ColumnOrSentinel<Row>>()

    // 负例：null 不是合法列元素。
    // @ts-expect-error null 不满足 ColumnOrSentinel<Row>
    const badColumn: ColumnOrSentinel<Row> = null
    expectTypeOf(badColumn).toEqualTypeOf<ColumnOrSentinel<Row>>()
  })

  it('types sorter as compare-based ColumnSorter without antd sorter sugar', () => {
    expectTypeOf<ColumnSorter<Row>>().toEqualTypeOf<
      boolean | CompareFn<Row> | { compare?: CompareFn<Row>; multiple?: number }
    >()
    expectTypeOf<NonNullable<ColumnType<Row>['sorter']>>().toEqualTypeOf<ColumnSorter<Row>>()
    expectTypeOf<Parameters<CompareFn<Row>>>().toEqualTypeOf<[a: Row, b: Row, sortOrder?: SortOrder]>()
    expectTypeOf<ReturnType<CompareFn<Row>>>().toEqualTypeOf<number>()

    // `sorter: true` 合法（默认按 dataIndex 比较）。
    const sortableTrue: ColumnType<Row> = { title: 'Age', dataIndex: 'age', sorter: true }
    expectTypeOf(sortableTrue.sorter).toEqualTypeOf<ColumnSorter<Row> | undefined>()

    // 函数形态（compare）合法。
    const compareFn: ColumnSorter<Row> = (a, b, sortOrder) =>
      sortOrder === 'descend' ? b.age - a.age : a.age - b.age
    expectTypeOf(compareFn).toMatchTypeOf<ColumnSorter<Row>>()

    // 对象形态的字段名是 compare（+ multiple），不是 antd 的 sorter。
    const multiSorter: ColumnSorter<Row> = { compare: (a, b) => a.age - b.age, multiple: 2 }
    expectTypeOf(multiSorter).toMatchTypeOf<ColumnSorter<Row>>()

    // 负例：antd 的 `sorter: { sorter: fn }` sugar 在 data-grid 不存在 → 应报错。
    // @ts-expect-error 对象形态字段名是 compare，没有 sorter 字段
    const antdSugar: ColumnSorter<Row> = { sorter: () => 0 }
    expectTypeOf(antdSugar).toEqualTypeOf<ColumnSorter<Row>>()
  })

  it('types function classNames / styles callbacks with TableSemanticInfo', () => {
    type ClassNamesFn = Extract<
      NonNullable<TableProps<Row>['classNames']>,
      (...args: Array<any>) => any
    >
    type StylesFn = Extract<NonNullable<TableProps<Row>['styles']>, (...args: Array<any>) => any>

    // 回调参数是 TableSemanticInfo<RecordType>（src/table/compat/semantic.ts:113-126）。
    expectTypeOf<Parameters<ClassNamesFn>[0]>().toEqualTypeOf<TableSemanticInfo<Row>>()
    expectTypeOf<Parameters<StylesFn>[0]>().toEqualTypeOf<TableSemanticInfo<Row>>()
    // 返回类型是语义结构（对象，非 undefined）。
    expectTypeOf<ReturnType<ClassNamesFn>>().toEqualTypeOf<TableSemanticClassNames>()
    expectTypeOf<ReturnType<StylesFn>>().toEqualTypeOf<TableSemanticStyles>()
    // 泛型穿透到 info（仅类型签名占位）。
    expectTypeOf<TableSemanticInfo<Row>['_recordType']>().toEqualTypeOf<Row | undefined>()

    // info.props 子集（src/table/useSemanticClassNames.ts:59-67）。
    expectTypeOf<TableSemanticInfo<Row>['props']['size']>().toEqualTypeOf<SizeType | undefined>()
    expectTypeOf<TableSemanticInfo<Row>['props']['bordered']>().toEqualTypeOf<boolean | undefined>()
    expectTypeOf<TableSemanticInfo<Row>['props']['virtual']>().toEqualTypeOf<boolean | undefined>()
    expectTypeOf<TableSemanticInfo<Row>['props']['scroll']>().toEqualTypeOf<
      { x?: true | number | string; y?: true; scrollToFirstRowOnChange?: boolean } | undefined
    >()
    expectTypeOf<TableSemanticInfo<Row>['props']['pagination']>().toEqualTypeOf<
      false | TablePaginationConfig | undefined
    >()

    // 对象形态合法（含嵌套 header/body/pagination 三层）。
    const staticClassNames: TableClassNames<Row> = {
      root: 'r',
      section: 's',
      title: 't',
      footer: 'f',
      content: 'c',
      header: { wrapper: 'hw', row: 'hr', cell: 'hc' },
      body: { wrapper: 'bw', row: 'br', cell: 'bc' },
      pagination: { root: 'pr', item: 'pi' },
    }
    const staticStyles: TableStyles<Row> = {
      root: { color: 'red' },
      header: { cell: { color: 'blue' } },
      pagination: { item: { borderTopWidth: 1 } },
    }
    expectTypeOf(staticClassNames).toMatchTypeOf<TableClassNames<Row>>()
    expectTypeOf(staticStyles).toMatchTypeOf<TableStyles<Row>>()

    // 函数形态在 props 位置直接可用，回调参数被推断为 TableSemanticInfo<Row>。
    const props: TableProps<Row> = {
      dataSource: rows,
      classNames: (info) => ({
        root: info.props.size === 'small' ? 'sm-root' : 'lg-root',
        header: { cell: info.props.bordered ? 'bordered-cell' : 'plain-cell' },
      }),
      styles: (info) => ({ root: { opacity: info.props.virtual ? 1 : 0.5 } }),
    }
    expectTypeOf(props.classNames).toEqualTypeOf<TableClassNames<Row> | undefined>()

    // 负例：字段集固定——header 下只有 wrapper/row/cell，没有任意 slot。
    // @ts-expect-error header 无 sorter 这个 slot
    const badSemantic: TableSemanticClassNames = { header: { sorter: 'x' } }
    expectTypeOf(badSemantic).toEqualTypeOf<TableSemanticClassNames>()

    // 负例：styles 的值必须是 CSSProperties，不能是字符串。
    // @ts-expect-error styles.root 必须是对象
    const badStyles: TableSemanticStyles = { root: 'red' }
    expectTypeOf(badStyles).toEqualTypeOf<TableSemanticStyles>()
  })

  it('types TableRef.scrollTo config', () => {
    type ScrollToConfig = Parameters<TableRef['scrollTo']>[0]

    expectTypeOf<ScrollToConfig['index']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<ScrollToConfig['key']>().toEqualTypeOf<Key | undefined>()
    // data-grid 同时提供 scrollTop 与 antd 同名别名 top（src/table/publicTypes.ts:765-771）。
    expectTypeOf<ScrollToConfig['scrollTop']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<ScrollToConfig['top']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<ScrollToConfig['offset']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<ScrollToConfig['align']>().toEqualTypeOf<
      'start' | 'center' | 'end' | 'nearest' | undefined
    >()
    // data-grid 专属扩展（antd 无此字段，src/table/publicTypes.ts:773-774）。
    expectTypeOf<ScrollToConfig['behavior']>().toEqualTypeOf<'auto' | 'smooth' | undefined>()
    expectTypeOf<TableRef['nativeElement']>().toEqualTypeOf<HTMLDivElement | null | undefined>()
    expectTypeOf<ReturnType<TableRef['scrollTo']>>().toEqualTypeOf<void>()

    const config: ScrollToConfig = { key: 'r1', align: 'nearest', behavior: 'smooth', offset: 4 }
    expectTypeOf(config).toMatchTypeOf<ScrollToConfig>()

    // 负例：align 只接受四个字面量。
    // @ts-expect-error 'middle' 不是合法 align
    const badAlign: ScrollToConfig = { align: 'middle' }
    expectTypeOf(badAlign).toEqualTypeOf<ScrollToConfig>()

    // 负例：behavior 只接受 auto / smooth。
    // @ts-expect-error 'instant' 不是合法 behavior
    const badBehavior: ScrollToConfig = { behavior: 'instant' }
    expectTypeOf(badBehavior).toEqualTypeOf<ScrollToConfig>()
  })

  it('types onChange as a four-argument tuple', () => {
    type OnChange = NonNullable<TableProps<Row>['onChange']>

    expectTypeOf<Parameters<OnChange>['length']>().toEqualTypeOf<4>()
    expectTypeOf<Parameters<OnChange>>().toEqualTypeOf<
      [
        TablePaginationState,
        Record<string, Array<FilterValue> | null>,
        SorterResult<Row> | Array<SorterResult<Row>>,
        TableCurrentDataSource<Row>,
      ]
    >()

    // 各参数内部字段（第一参恒为实际分页状态，三个字段必填）。
    expectTypeOf<TablePaginationState>().toEqualTypeOf<{
      current: number
      pageSize: number
      total: number
    }>()
    expectTypeOf<Parameters<OnChange>[2]>().toEqualTypeOf<
      SorterResult<Row> | Array<SorterResult<Row>>
    >()
    expectTypeOf<TableCurrentDataSource<Row>['action']>().toEqualTypeOf<
      'sort' | 'filter' | 'paginate'
    >()
    expectTypeOf<TableCurrentDataSource<Row>['currentDataSource']>().toEqualTypeOf<Array<Row>>()

    // 四参回调可赋值并可用（extra.action 收窄为三字面量联合）。
    const handler: OnChange = (pagination, filters, sorter, extra) => {
      expectTypeOf(pagination).toEqualTypeOf<TablePaginationState>()
      expectTypeOf(filters).toEqualTypeOf<Record<string, Array<FilterValue> | null>>()
      expectTypeOf(sorter).toEqualTypeOf<SorterResult<Row> | Array<SorterResult<Row>>>()
      expectTypeOf(extra).toEqualTypeOf<TableCurrentDataSource<Row>>()
    }
    expectTypeOf(handler).toMatchTypeOf<OnChange>()

    // 负例：action 只允许 sort / filter / paginate。
    // @ts-expect-error 'resize' 不是合法 action
    const badAction: TableCurrentDataSource<Row>['action'] = 'resize'
    expectTypeOf(badAction).toEqualTypeOf<TableCurrentDataSource<Row>['action']>()
  })
})

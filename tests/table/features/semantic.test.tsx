// 黑盒 feature-slice 测试：语义化 classNames / styles 域。
//
// 对齐来源: G:\Projects\ant-design\components\table\__tests__\semantic.test.tsx
//   antd 源 3 个 it：
//     1) 'test classNames and styles'
//     2) 'should work with function classNames and styles'
//     3) 'should follow root style priority'
//   本文件把 antd 第 1 条（同时断言 classNames + styles + 次数）拆成 3 条，便于缺字段时定位：
//     → 直测 'applies each classNames slot'（classNames 逐字段）
//     → 直测 'applies each styles slot'（styles 逐字段）
//     → 直测 'counts each classNames slot occurrence'（slot 出现次数）
//   antd 第 2 条 → 直测 'supports function classNames and styles'（函数式形态）
//   antd 第 3 条 → it.skip（ConfigProvider 语义 styles 不消费，依据见该用例注释）
//   对账：antd 3 条用例展开后共 5 条入口 = 直测 4 + skip 1。
//
// 断言面（data-grid 自有字段集，非 antd 字段名）：
//   - 字段全集来自 src/table/compat/semantic.ts:78-102
//     （TableSemanticClassNames / TableSemanticStyles：root / section / title / footer / content /
//      header.{wrapper,row,cell} / body.{wrapper,row,cell} / pagination.{root,item}）。
//   - 函数式 info 结构的 props 子集来自 src/table/useSemanticClassNames.ts:59-67
//     （{ size, bordered, virtual, scroll, pagination }）。
//
// 选择器重映射 + 注入点（逐条读 src 确认，不猜）：
//   root            → .dg-wrapper        src/table/Table.tsx:578（className）、
//                                        src/table/useTableThemeVars.ts:126-134（style）
//   section         → .dg-scroll-wrap    src/table/engine/ScrollContainer.tsx:341（mergeSectionClass /
//                                        mergeSectionStyle）、src/table/engine/FloatingScrollBar.tsx:901
//   title / footer  → .dg-title / .dg-footer   src/table/Table.tsx:812-819 / 912-919
//   content         → .dg-grid           src/table/engine/GridTable.tsx:591（class）、583-585（style）
//   header.cell     → 每个 .dg-cell-header    src/table/engine/HeaderCell.tsx:247 / 309
//   header.row      → 同 header.cell 元素（grid 无 tr，row 级 class/style 分发到该行每个表头格）
//                                        src/table/engine/HeaderCell.tsx:250 / 311
//   body.cell       → 每个 .dg-cell-body      src/table/engine/BodyGrid.tsx:188 / 222
//   body.row        → 同 body.cell 元素        src/table/engine/BodyGrid.tsx:186 / 220
//   pagination.root → .dg-pagination     src/table/paginationAdapter.tsx:52-62
//   pagination.item → .ant-pagination（antd Pagination 的 className 落在其 ul 根，不是每个页码项）
//                                        src/table/paginationAdapter.tsx:75-85
//   header.wrapper / body.wrapper → **无注入点**：全仓无 `semanticHeader?.className?.wrapper` /
//                                        `semanticBody?.className?.wrapper` 消费（src/table/engine/*
//                                        仅消费 .cell / .row）。故这两字段不进 toHaveClass/toHaveStyle 断言，
//                                        改由断言「0 次出现」覆盖。
//   另注：同一元素会同时收到 cell 与 row 两个 slot 的 class/style（header 格 = header.cell + header.row；
//         body 格 = body.row + body.cell），冲突属性上 header 侧 row 覆盖 cell、body 侧 cell 覆盖 row
//         （HeaderCell.tsx:308-311 vs BodyGrid.tsx:219-222），故 styles 表对这两个 slot 用不同 CSS 属性。
//
// 直测 4 条 / skip 1 条。
import { describe, expect, it } from 'vitest'

import { Table } from '../../../src/table/index'
import { customRender } from '../../shared/render'

const columns = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
]

const data = Array.from({ length: 6 }, (_, i) => ({
  key: String(i + 1),
  name: `name-${i + 1}`,
  age: 20 + i,
  address: `address-${i + 1}`,
}))

/** data-grid 字段全集（src/table/compat/semantic.ts:78-87）的 classNames 测试值。 */
const testClassNames = {
  root: 'test-root',
  section: 'test-section',
  title: 'test-title',
  footer: 'test-footer',
  content: 'test-content',
  header: {
    wrapper: 'test-header-wrapper',
    cell: 'test-header-cell',
    row: 'test-header-row',
  },
  body: {
    wrapper: 'test-body-wrapper',
    cell: 'test-body-cell',
    row: 'test-body-row',
  },
  pagination: {
    root: 'test-pagination-root',
    item: 'test-pagination-item',
  },
}

/** 同构的 styles 测试值（src/table/compat/semantic.ts:93-102）。 */
const testStyles = {
  root: { backgroundColor: 'rgb(11, 11, 11)' },
  section: { backgroundColor: 'rgb(22, 22, 22)' },
  title: { backgroundColor: 'rgb(33, 33, 33)' },
  footer: { backgroundColor: 'rgb(44, 44, 44)' },
  content: { backgroundColor: 'rgb(55, 55, 55)' },
  header: {
    wrapper: { borderTopWidth: '8px' },
    cell: { backgroundColor: 'rgb(66, 66, 66)' },
    row: { color: 'rgb(77, 77, 77)' },
  },
  body: {
    wrapper: { borderTopWidth: '9px' },
    cell: { backgroundColor: 'rgb(88, 88, 88)' },
    row: { color: 'rgb(99, 99, 99)' },
  },
  pagination: {
    root: { backgroundColor: 'rgb(111, 111, 111)' },
    item: { borderTopWidth: '7px' },
  },
}

/**
 * classNames 逐字段断言表。`selector: null` = 无 DOM 注入点（断言 0 次出现，见文件头注释）。
 */
const classNameSlots: Array<{ field: string; className: string; selector: string | null }> = [
  { field: 'root', className: testClassNames.root, selector: '.dg-wrapper' },
  { field: 'section', className: testClassNames.section, selector: '.dg-scroll-wrap' },
  { field: 'title', className: testClassNames.title, selector: '.dg-title' },
  { field: 'footer', className: testClassNames.footer, selector: '.dg-footer' },
  { field: 'content', className: testClassNames.content, selector: '.dg-grid' },
  { field: 'header.cell', className: testClassNames.header.cell, selector: '.dg-cell-header' },
  { field: 'header.row', className: testClassNames.header.row, selector: '.dg-cell-header' },
  { field: 'body.cell', className: testClassNames.body.cell, selector: '.dg-cell-body' },
  { field: 'body.row', className: testClassNames.body.row, selector: '.dg-cell-body' },
  { field: 'pagination.root', className: testClassNames.pagination.root, selector: '.dg-pagination' },
  { field: 'pagination.item', className: testClassNames.pagination.item, selector: '.ant-pagination' },
  { field: 'header.wrapper', className: testClassNames.header.wrapper, selector: null },
  { field: 'body.wrapper', className: testClassNames.body.wrapper, selector: null },
]

/** styles 逐字段断言表（结构与 classNameSlots 对称）。 */
const styleSlots: Array<{ field: string; style: Record<string, string>; selector: string | null }> = [
  { field: 'root', style: testStyles.root, selector: '.dg-wrapper' },
  { field: 'section', style: testStyles.section, selector: '.dg-scroll-wrap' },
  { field: 'title', style: testStyles.title, selector: '.dg-title' },
  { field: 'footer', style: testStyles.footer, selector: '.dg-footer' },
  { field: 'content', style: testStyles.content, selector: '.dg-grid' },
  { field: 'header.cell', style: testStyles.header.cell, selector: '.dg-cell-header' },
  { field: 'header.row', style: testStyles.header.row, selector: '.dg-cell-header' },
  { field: 'body.cell', style: testStyles.body.cell, selector: '.dg-cell-body' },
  { field: 'body.row', style: testStyles.body.row, selector: '.dg-cell-body' },
  { field: 'pagination.root', style: testStyles.pagination.root, selector: '.dg-pagination' },
  { field: 'pagination.item', style: testStyles.pagination.item, selector: '.ant-pagination' },
  { field: 'header.wrapper', style: testStyles.header.wrapper, selector: null },
  { field: 'body.wrapper', style: testStyles.body.wrapper, selector: null },
]

describe('Table semantic classNames/styles', () => {
  // antd semantic.test.tsx 第 1 条（classNames 部分）。
  it('applies each classNames slot', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        size="medium"
        pagination={{ pageSize: 3 }}
        title={() => <>table title</>}
        footer={() => <>table footer</>}
        classNames={testClassNames}
      />,
    )

    for (const { field, className, selector } of classNameSlots) {
      const label = `classNames.${field} → ${selector ?? '(无注入点)'}`
      if (selector === null) {
        expect(container.getElementsByClassName(className).length, label).toBe(0)
        continue
      }
      const el = container.querySelector(selector)
      expect(el, label).not.toBeNull()
      expect(el, label).toHaveClass(className)
    }
  })

  // antd semantic.test.tsx 第 1 条（styles 部分）。
  it('applies each styles slot', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        size="medium"
        pagination={{ pageSize: 3 }}
        title={() => <>table title</>}
        footer={() => <>table footer</>}
        styles={testStyles}
      />,
    )

    for (const { field, style, selector } of styleSlots) {
      const label = `styles.${field} → ${selector ?? '(无注入点)'}`
      if (selector === null) {
        // 无注入点：该 slot 的样式属性不应出现在任何元素的内联 style 上。
        const [prop, value] = Object.entries(style)[0]
        const kebab = prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
        expect(container.querySelectorAll(`[style*="${kebab}: ${value}"]`).length, label).toBe(0)
        continue
      }
      const el = container.querySelector(selector)
      expect(el, label).not.toBeNull()
      expect(el, label).toHaveStyle(style)
    }
  })

  // antd semantic.test.tsx 第 1 条（次数部分）。
  it('counts each classNames slot occurrence', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        size="medium"
        pagination={{ pageSize: 3 }}
        title={() => <>table title</>}
        footer={() => <>table footer</>}
        classNames={testClassNames}
      />,
    )

    // 3 叶子列 × 3 行（pageSize=3）；header.row / body.row 的 class 分发到该行每个格子。
    const expectedCounts: Record<string, number> = {
      root: 1,
      section: 1,
      title: 1,
      footer: 1,
      content: 1,
      'header.cell': 3,
      'header.row': 3,
      'body.cell': 9,
      'body.row': 9,
      'pagination.root': 1,
      // antd Pagination 的 className 落在 .ant-pagination 根元素（非每个页码项）。
      'pagination.item': 1,
      // 无注入点（见文件头注释）。
      'header.wrapper': 0,
      'body.wrapper': 0,
    }

    const byField = new Map(classNameSlots.map((slot) => [slot.field, slot.className]))
    for (const [field, expected] of Object.entries(expectedCounts)) {
      const className = byField.get(field)
      expect(className, `槽位 ${field} 未在断言表中登记`).toBeDefined()
      expect(container.getElementsByClassName(className as string).length, `slot ${field}`).toBe(expected)
    }
  })

  // antd semantic.test.tsx 第 2 条：函数式 classNames / styles。
  it('supports function classNames and styles', () => {
    const seenInfo: Array<{ props: Record<string, unknown> }> = []
    const paginationConfig = { pageSize: 3 }

    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        size="small"
        bordered
        pagination={paginationConfig}
        // antd 用 header.wrapper/body.wrapper 验动态性；data-grid 这两字段无注入点（见文件头注释），
        // 故函数返回值改用实际注入的 header.cell / body.cell。
        classNames={(info) => {
          seenInfo.push(info as unknown as { props: Record<string, unknown> })
          return {
            root: info.props.bordered ? 'fn-bordered-root' : 'fn-borderless-root',
            header: { cell: info.props.size === 'small' ? 'fn-header-small' : 'fn-header-default' },
            body: { cell: 'fn-body-dynamic' },
            pagination: { root: 'fn-pagination-root' },
          }
        }}
        styles={(info) => ({
          root: { borderTopWidth: info.props.bordered ? '2px' : '1px' },
          header: { cell: { backgroundColor: info.props.size === 'small' ? '#e6f7ff' : '#f6ffed' } },
          body: { cell: { backgroundColor: '#fffbe6' } },
          pagination: { root: { borderTopWidth: '3px' } },
        })}
      />,
    )

    // info.props 结构（src/table/useSemanticClassNames.ts:59-67）：恰好 5 个字段子集。
    expect(seenInfo.length).toBeGreaterThan(0)
    const info = seenInfo[seenInfo.length - 1]
    expect(Object.keys(info.props).sort()).toEqual([
      'bordered',
      'pagination',
      'scroll',
      'size',
      'virtual',
    ])
    expect(info.props.size).toBe('small')
    expect(info.props.bordered).toBe(true)
    expect(info.props.virtual).toBeUndefined()
    expect(info.props.scroll).toBeUndefined()
    // pagination 原样透传（同一引用）。
    expect(info.props.pagination).toBe(paginationConfig)

    // 函数返回值落到真实 DOM。
    const root = container.querySelector('.dg-wrapper')
    expect(root).toHaveClass('fn-bordered-root')
    expect(root).toHaveStyle({ borderTopWidth: '2px' })

    const headerCells = container.querySelectorAll('.dg-cell-header')
    expect(headerCells.length).toBeGreaterThan(0)
    for (const headerCell of headerCells) {
      expect(headerCell).toHaveClass('fn-header-small')
      expect(headerCell).toHaveStyle({ backgroundColor: '#e6f7ff' })
    }

    const bodyCells = container.querySelectorAll('.dg-cell-body')
    expect(bodyCells.length).toBeGreaterThan(0)
    for (const bodyCell of bodyCells) {
      expect(bodyCell).toHaveClass('fn-body-dynamic')
      expect(bodyCell).toHaveStyle({ backgroundColor: '#fffbe6' })
    }

    const paginationRoot = container.querySelector('.dg-pagination')
    expect(paginationRoot).toHaveClass('fn-pagination-root')
    expect(paginationRoot).toHaveStyle({ borderTopWidth: '3px' })
  })

  // antd semantic.test.tsx 第 3 条：ConfigProvider 级语义 styles（table.styles / table.style）。
  // data-grid 不消费 ConfigProvider 的 Table 组件级配置：src/table/Table.tsx:289-298 的
  // useContext(ConfigContext) 只取 `locale?.Table`，无组件级 styles/style 消费点，
  // 故 "configStyles 注入根容器" 这一前提在 data-grid 上不成立 → 无法直测。
  it.skip('should follow root style priority', () => {})
})

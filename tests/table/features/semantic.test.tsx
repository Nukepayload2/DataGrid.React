// 黑盒 feature-slice 测试：语义化 classNames / styles 域。
//
// 对齐来源: {{AntDesign}}/components/table/__tests__/semantic.test.tsx
//   antd 源 3 个 it（**6.5.2** 参照口径；已安装裁判 6.4.4 同名件 = **2**，差 1 行＝第 3 条
//   'should follow root style priority' 仅存在于 6.5.2，该 it.skip 旁注释有 P-088 版本注记；
//   分母由 G-2 分母门从 tests/fixtures/antd-denominator.json 重算，本行只是人类回读面）：
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
//   本批（BAT-8）另加 **1 条 data-grid 自有直测** 'applies classNames.section in both layout paths'
//   （sticky / 非 sticky 两条内部渲染路径同效，antd 只有一条路径、无对应用例，
//   不进 antd 对账分母）⇒ 本文件运行时入口 5 → 6（直测 4 → 5，skip 恒 1）。
//
// 断言面（data-grid 自有字段集，非 antd 字段名）：
//   - 字段全集来自 src/table/compat/semantic.ts:78-102
//     （TableSemanticClassNames / TableSemanticStyles：root / section / title / footer / content /
//      header.{row,cell} / body.{row,cell} / pagination.{root,item} = 11 个槽位）。
//   - 函数式 info 结构的 props 子集来自 src/table/useSemanticClassNames.ts:59-67
//     （{ size, bordered, virtual, scroll, pagination }）。
//
// 选择器重映射 + 注入点（逐条读 src 确认，不猜）：
//   root            → .dg-wrapper        src/table/Table.tsx:590（`classNamesResolved?.root`）、
//                                        src/table/useTableThemeVars.ts:138-146（style）
//   section         → **两条布局路径各有宿主**（同一份配置两边都要生效，见双路径直测）：
//     · 非 sticky   → .dg-scroll-wrap    src/table/engine/ScrollContainer.tsx:341（mergeSectionClass）、
//                                        :342（mergeSectionStyle）、src/table/engine/FloatingScrollBar.tsx:901
//     · sticky     → .dg-sticky-scroll-viewport  同文件 :233（mergeSectionClass）/ :234（mergeSectionStyle）；
//                                        summary 提取出的第二条视口 :256（class）/ :260（style）同款合并
//                                        （antd 侧对照：sticky 与非 sticky 都落 div.ant-table-container）
//   title / footer  → .dg-title / .dg-footer   src/table/Table.tsx:824-830 / 924-930
//   content         → .dg-grid           src/table/engine/GridTable.tsx:591（class）、583-585（style）
//   header.cell     → 每个 .dg-cell-header    src/table/engine/HeaderCell.tsx:253（className.cell）/ 338（style.cell）
//   header.row      → 同 header.cell 元素（grid 无 tr，row 级 class/style 分发到该行每个表头格）
//                                        src/table/engine/HeaderCell.tsx:256（className.row）/ 340（style.row）
//   body.cell       → 每个 .dg-cell-body      src/table/engine/BodyGrid.tsx:188（className.cell）/ 222（style.cell）
//   body.row        → 同 body.cell 元素        src/table/engine/BodyGrid.tsx:186（className.row）/ 220（style.row）
//   pagination.root → .dg-pagination（外层布局 div；探针对照实测 antd 那侧把语义 root 并进
//                                        `ul.ant-pagination`。该映射现记于
//                                        `docs/features/styling/semantic-dom.md` 槽位表「12 pagination.root」行、
//                                        标为「完全兼容」；是否算分叉属 BAT-7 遗交 main 的待裁定项，非本批缺陷）
//                                        src/table/paginationAdapter.tsx:67-79
//   pagination.item → 分页器的每个 item 项 `<li>`：适配层把该槽交给 antd `<Pagination>` 的
//                                        `classNames/styles.item`，由 rc-pagination 自己分发到
//                                        prev / 页码项 / next（实测 6 行数据 + pageSize=3 → 4 个 li，
//                                        父元素均为 `ul.ant-pagination`；既不落 `ul.ant-pagination`
//                                        根、也不落外层 `.dg-pagination`）
//                                        src/table/paginationAdapter.tsx:61-64（读取该槽）、
//                                        91-98（交给 `<Pagination>` 分发）
//   header.wrapper / body.wrapper → **本批已删（原 13 槽位里的 2 条）**：公共类型曾声明、运行时全仓
//                                        零消费（`?.wrapper` 读取点 0 处）。BAT-8 探针实测 antd 侧宿主是
//                                        `<thead class="ant-table-thead">` / `<tbody class="ant-table-tbody">`
//                                        （`@rc-component/table` es/Header/Header.js:83-88、es/Body/index.js:110-111），
//                                        而 data-grid 的 7 条渲染路径（flat / multi / virtual / recycling /
//                                        components.body.row / scroll.y / 树形 / sticky+summary）里 thead 与
//                                        tbody 命中恒 0、`.dg-grid` 的第一层子元素恒为格子本身 ⇒ 无语义正确的
//                                        宿主可注入（`.dg-grid` 已是 content 槽位宿主，塞进去等于伪装实现）。
//                                        处置＝从 compat/semantic.ts + publicTypes.ts 删除这两个字段，
//                                        槽位表 13 → 11，断言表**不再保留 `selector: null`（断言 0 次）档**。
//   另注：同一元素会同时收到 cell 与 row 两个 slot 的 class/style（header 格 = header.cell + header.row；
//         body 格 = body.row + body.cell），冲突属性上 header 侧 row 覆盖 cell、body 侧 cell 覆盖 row
//         （HeaderCell.tsx:337-340 vs BodyGrid.tsx:219-222），故 styles 表对这两个 slot 用不同 CSS 属性。
//
// 直测 5 条 / skip 1 条（本批 +1 条 data-grid 自有双路径直测，非 antd 对齐项）。
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
    cell: 'test-header-cell',
    row: 'test-header-row',
  },
  body: {
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
    cell: { backgroundColor: 'rgb(66, 66, 66)' },
    row: { color: 'rgb(77, 77, 77)' },
  },
  body: {
    cell: { backgroundColor: 'rgb(88, 88, 88)' },
    row: { color: 'rgb(99, 99, 99)' },
  },
  pagination: {
    root: { backgroundColor: 'rgb(111, 111, 111)' },
    item: { borderTopWidth: '7px' },
  },
}

/**
 * classNames 逐字段断言表。`selector` 必填——**槽位声明了就一定要有真实宿主**：
 * 本文件曾有 `selector: null`（= 断言该 class 出现 0 次）一档，用来覆盖 `header.wrapper` /
 * `body.wrapper` 这两个「公共类型声明了、运行时零消费」的字段；BAT-8 已把这两个字段从
 * `compat/semantic.ts` / `publicTypes.ts` 的公共类型面删除（探针证实 antd 侧宿主是
 * `<thead class="ant-table-thead">` / `<tbody class="ant-table-tbody">`，data-grid 全部 7 条
 * 渲染路径都没有对应容器），槽位表随之 **13 → 11**，并**不再提供 `null` 档**
 * （留着它等于允许下一次「声明了但不消费」的槽位偷偷进表）。
 * 注：`pagination.item` 的 selector 只取第一个 item 项验「类是否落到真实页码项」，
 * 该槽实际分发到多个 `<li>` 的总数由 occurrence 用例的计数断言覆盖。
 */
const classNameSlots: Array<{ field: string; className: string; selector: string }> = [
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
  { field: 'pagination.item', className: testClassNames.pagination.item, selector: '.ant-pagination-item' },
]

/** styles 逐字段断言表（结构与 classNameSlots 对称；`pagination.item` 同取真实页码项 `<li>`）。 */
const styleSlots: Array<{ field: string; style: Record<string, string>; selector: string }> = [
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
  { field: 'pagination.item', style: testStyles.pagination.item, selector: '.ant-pagination-item' },
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
      const label = `classNames.${field} → ${selector}`
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
      const label = `styles.${field} → ${selector}`
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
      // pagination.item 走 antd Pagination 自己的 item 槽：实测分发到 4 个 li
      // （prev / 页码 1 / 页码 2 / next），均不落 ul.ant-pagination 根（探针实测，见文件头注释）。
      'pagination.item': 4,
    }

    // 计数表与槽位表必须逐字段一一对上（槽位表 11 行 = 这里 11 个字段，且每个都有真实宿主）。
    expect(Object.keys(expectedCounts).sort(), '出现次数表字段 ≠ 槽位表字段').toEqual(
      classNameSlots.map((slot) => slot.field).sort(),
    )

    const byField = new Map(classNameSlots.map((slot) => [slot.field, slot.className]))
    for (const [field, expected] of Object.entries(expectedCounts)) {
      const className = byField.get(field)
      expect(className, `槽位 ${field} 未在断言表中登记`).toBeDefined()
      expect(container.getElementsByClassName(className as string).length, `slot ${field}`).toBe(expected)
    }
  })

  // data-grid 自有判据（antd 无对应用例：antd 的 section 恒落 div.ant-table-container，只有一条渲染路径）。
  // 回归锚：sticky 分支曾只挂裸类名，同一份 classNames.section / styles.section 在 sticky 下 class 与
  // style 双双静默丢弃（探针读数：sticky 侧全 DOM 命中 0，非 sticky 侧 1）。
  it('applies classNames.section in both layout paths', () => {
    const sameClassNames = { section: 'dual-path-section' }
    const sameStyles = { section: { backgroundColor: 'rgb(12, 130, 210)' } }

    const nonSticky = customRender(
      <Table
        columns={columns}
        dataSource={data}
        scroll={{ x: 800 }}
        classNames={sameClassNames}
        styles={sameStyles}
      />,
    ).container
    const sticky = customRender(
      <Table
        columns={columns}
        dataSource={data}
        sticky
        scroll={{ x: 800 }}
        classNames={sameClassNames}
        styles={sameStyles}
      />,
    ).container

    const wrap = nonSticky.querySelector('.dg-scroll-wrap')
    expect(wrap, '非 sticky：宿主 .dg-scroll-wrap 存在').not.toBeNull()
    expect(wrap, '非 sticky：classNames.section 生效').toHaveClass('dual-path-section')
    expect(wrap, '非 sticky：styles.section 生效').toHaveStyle({ backgroundColor: 'rgb(12, 130, 210)' })

    const viewport = sticky.querySelector('.dg-sticky-scroll-viewport')
    expect(viewport, 'sticky：宿主 .dg-sticky-scroll-viewport 存在').not.toBeNull()
    expect(viewport, 'sticky：classNames.section 生效').toHaveClass('dual-path-section')
    expect(viewport, 'sticky：styles.section 生效').toHaveStyle({ backgroundColor: 'rgb(12, 130, 210)' })

    // 两条路径互斥（防止把 sticky 视口误当滚动包装、或反向）：同一份配置各自只有一种宿主。
    expect(sticky.querySelector('.dg-scroll-wrap'), 'sticky 路径不渲染 .dg-scroll-wrap').toBeNull()
    expect(nonSticky.querySelector('.dg-sticky-scroll-viewport'), '非 sticky 路径不渲染 sticky 视口').toBeNull()

    // sticky + summary：summary 被提取成第二条同级视口，同样属 section 宿主 ⇒ 两边同款合并。
    const stickyWithSummary = customRender(
      <Table
        columns={columns}
        dataSource={data}
        sticky
        scroll={{ x: 800 }}
        classNames={sameClassNames}
        styles={sameStyles}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                sum
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />,
    ).container
    const viewports = stickyWithSummary.querySelectorAll('.dg-sticky-scroll-viewport')
    expect(viewports.length, 'sticky + summary：主视口 + summary 视口').toBe(2)
    for (const el of viewports) {
      expect(el, 'sticky + summary：每条 section 宿主都带 classNames.section').toHaveClass('dual-path-section')
      expect(el, 'sticky + summary：每条 section 宿主都带 styles.section').toHaveStyle({
        backgroundColor: 'rgb(12, 130, 210)',
      })
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
        // antd 该条用 header.wrapper/body.wrapper 验动态性；data-grid 无 thead/tbody 宿主，
        // 这两个字段已由 BAT-8 从公共类型面删除（见文件头注释），故函数返回值改用有真实宿主的
        // header.cell / body.cell。
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

  // antd semantic.test.tsx 第 3 条（规约源 6.5.2 `semantic.test.tsx:308`）：
  //   `ConfigProvider table={{ styles, style }}` 与 props `styles/style` 的根样式优先级
  //   （夹具 `{{AntDesign}}/tests/shared/semanticStylePriority.ts` 的 `expectSemanticRootStylePriority`：
  //    backgroundColor ← props `style`、marginTop ← props `styles.root`、
  //    paddingTop ← 上下文 `style`、borderTopWidth ← 上下文 `styles.root`）。
  // skip 依据（**结论仍真、旧理由已半假**）：
  //   ⚠️ 旧依据写「`src/table/Table.tsx:289-298` 的 `useContext(ConfigContext)` **只取 `locale?.Table`**」——
  //   这句已过期：现码 `src/table/Table.tsx:302` 同时取 `table: contextTableConfig`，
  //   并由 `src/table/contextDefaults.ts:1-30` 归一消费 `rowKey` / `scroll` / `expandable.expandIcon` 三项
  //   （⇒ 本文件同域的两条 rowKey skip 已因此转直测，见 Table.test.tsx 文末）。
  //   仍然成立的**真判据**＝组件级配置的**那四件**（`className` / `style` / `classNames` / `styles`）
  //   在 dg 无任何消费点：根样式只走 props 侧——`src/table/useTableThemeVars.ts:138-146` 里
  //   `if (stylesResolved?.root) Object.assign(merged, style, stylesResolved.root)`，
  //   `stylesResolved` 来自 `useSemanticClassNames(props.classNames, props.styles, …)`，上下文不进这条路。
  // 双臂实测（探针 `tmp/81-probe-readings.txt` 臂 `A13.dg` / `A13.ref`，wrapper 取 `.ant-table-wrapper`
  //   ＝ `.dg-wrapper ant-table-wrapper`，读**内联 style**）：
  //   dg `bg rgb(0,128,0)`(=props styles.root) / `marginTop 3px` / `paddingTop ''` / `borderTopWidth ''`
  //   ↔ 裁判 `bg rgb(255,255,0)`(=props style) / `marginTop 2px` / `paddingTop 2px` / `borderTopWidth 1px`
  //   ⇒ 四项里三项不同值 ⇒ **不同值**，留 skip。
  // ⚠️ 另登记一条 **P-088 级发现（规约面与运行时面不同构）**：
  //   裁判 6.4.4 的 `node_modules/antd/es/table/InternalTable.js:397-401`
  //   `mergedStyle = { ...mergedStyles.root, ...contextStyle, ...style }` ⇒ `contextStyle.marginTop`
  //   **后置覆盖** `styles.root.marginTop` ⇒ 实测 `2px`；而规约源 6.5.2
  //   `components/table/InternalTable.tsx:727` 已改成 `style={mergedStyles.root}`（包内已无 `mergedStyle` 变量）
  //   ⇒ 夹具期望的 `3px` 在裁判 6.4.4 上**并不成立**（6.5.2 用例直抄到 6.4.4 会红）。
  //   将来即使 dg 补齐这四件消费，也**不能**拿 6.5.2 的期望值当裁判读数。
  //   用例本身仅存在于 6.5.2（6.4.4 同名件 2 个 it，无 `should follow root style priority`），
  //   分母按 P-088 双写：tests/fixtures/antd-denominator.json（G-2 分母门重算）。
  it.skip('should follow root style priority', () => {})

})

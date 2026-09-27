// 黑盒 feature-slice 测试：size 尺寸档 + locale 本地化域。
//
// 对齐来源: antd 无同名源文件（`components/table/__tests__/` 下无 size/locale 专测）；
//   本文件按 plan 规定的 ~10 条用例实施，覆盖 antd v6 `TableProps.size` / `TableProps.locale`
//   / `ConfigProvider locale.Table` / `ConfigProvider renderEmpty('Table')` 的对外语义。
//
// 选择器重映射:
//   - antd `.ant-table`（尺寸类挂载点）→ data-grid 挂在 `.dg-wrapper`（`dg-size-large|middle|small`
//     三档，src/table/Table.tsx:147-169 sizeToClass + 564-583 wrapperClass）
//   - antd `.ant-table-placeholder` → `.dg-empty`（表体空态区，src/table/engine/GridTable.tsx:754-768）
//   - 筛选下拉 portal 到 document.body（`dg-filter` 前缀，src/table/engine/FilterDropdown.tsx:429）
//
// src 依据:
//   - size: src/table/Table.tsx:147-169（三档 + medium/middle 别名 + compact→small）、
//     src/table/compat/size.ts:1-29（SizeType 定义与实测结论：antd v6 Table 无 compact 档）
//   - empty 优先级: src/table/emptyLoadingAdapter.tsx:9-32（locale.emptyText 函数形态 +
//     TableProps.locale.emptyText > ConfigProvider locale.Table.emptyText > renderEmpty('Table')
//     > 默认 <Empty>）、src/table/Table.tsx:289-298（mergedLocale 合并顺序：defaults <
//     contextLocale.Table < TableProps.locale）
//   - 已消费 locale 字段: src/table/compat/locale.ts:9-23 清单（filterConfirm/filterReset/
//     filterEmptyText/filterSearchPlaceholder/filterCheckAll/filterCheckall/emptyText）+
//     src/table/engine/FilterDropdown.tsx:150-157（消费点）+
//     src/table/engine/HeaderCell.tsx:292-302（triggerAsc/triggerDesc/cancelSort 排序 hover title）+
//     src/table/expandAdapter.tsx:73-81（expand/collapse → 展开按钮 aria-label）+
//     src/table/selectionAdapter.tsx:174-180 / 205（selectionAll/selectInvert/selectNone）
//
// 直测 10 条 / skip 1 条（filterTitle / sortTitle / selectAll 无消费点）。
//
// 实测路径差异（不断言，仅记录；详见最终报告「疑似缺陷」）：
//   单层表头的 flat 快速路径表头格（src/table/engine/FlatColumnCells.tsx:291-301）把排序 hover
//   文案硬编码为英文，不消费 filterLocale.triggerAsc/triggerDesc/cancelSort；多级表头走
//   src/table/engine/HeaderCell.tsx:292-302 才消费。故本文件的排序文案断言用多级表头驱动。
import { describe, expect, it } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import type { ConfigProviderProps } from 'antd'

import { Table, type TableProps } from '../../../src/table/index'
import { customRender, renderWithConfig } from '../../shared/render'

interface RecordType {
  key: string
  name: string
  age: number
}

const columns: TableProps<RecordType>['columns'] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
]

const data: RecordType[] = [
  { key: '1', name: 'alpha', age: 10 },
  { key: '2', name: 'bravo', age: 20 },
]

const filterColumns: TableProps<RecordType>['columns'] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    filters: [
      { text: 'alpha', value: 'alpha' },
      { text: 'bravo', value: 'bravo' },
    ],
    onFilter: (value, record) => (record as RecordType).name === value,
  },
]

const emptyFilterColumns: TableProps<RecordType>['columns'] = [
  { title: 'Name', dataIndex: 'name', key: 'name', filters: [] },
]

function wrapperOf(container: HTMLElement): HTMLElement {
  return container.querySelector<HTMLElement>('.dg-wrapper')!
}

describe('Table size', () => {
  // sizeToClass：v6 三档 large/middle(medium)/small → 三个尺寸类（src/table/Table.tsx:147-169）。
  it('applies size class for v6 sizes', () => {
    const large = customRender(
      <Table columns={columns} dataSource={data} pagination={false} size="large" />,
    )
    expect(wrapperOf(large.container)).toHaveClass('dg-size-large')

    const medium = customRender(
      <Table columns={columns} dataSource={data} pagination={false} size="medium" />,
    )
    expect(wrapperOf(medium.container)).toHaveClass('dg-size-middle')

    const small = customRender(
      <Table columns={columns} dataSource={data} pagination={false} size="small" />,
    )
    expect(wrapperOf(small.container)).toHaveClass('dg-size-small')
  })

  // v5 `middle` 与 data-grid 保留的 `compact` 别名共用档位类
  // （middle/medium → dg-size-middle；compact → dg-size-small，src/table/Table.tsx:151-162）。
  it('maps v5 middle and compact aliases to shared size classes', () => {
    const middle = customRender(
      <Table columns={columns} dataSource={data} pagination={false} size="middle" />,
    )
    expect(wrapperOf(middle.container)).toHaveClass('dg-size-middle')

    const compact = customRender(
      <Table columns={columns} dataSource={data} pagination={false} size="compact" />,
    )
    expect(wrapperOf(compact.container)).toHaveClass('dg-size-small')
  })

  // 缺省 / 非法值兜底：sizeToClass default 分支返回 undefined → 不输出任何 dg-size-* 类
  // （src/table/Table.tsx:166-167；同时确认 data-grid 不消费 ConfigProvider componentSize）。
  it('omits size class for undefined or illegal size', () => {
    const none = customRender(<Table columns={columns} dataSource={data} pagination={false} />)
    expect(wrapperOf(none.container).className).not.toMatch(/dg-size-/)

    const illegal = customRender(
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        size={'big' as TableProps<RecordType>['size']}
      />,
    )
    expect(wrapperOf(illegal.container).className).not.toMatch(/dg-size-/)
  })

  // size 随 prop 更新：rerender 换档 → 类名替换（旧档类移除），回退 undefined → 尺寸类全部移除。
  it('updates size class on rerender', () => {
    const { container, rerender } = customRender(
      <Table columns={columns} dataSource={data} pagination={false} size="small" />,
    )
    expect(wrapperOf(container)).toHaveClass('dg-size-small')

    rerender(<Table columns={columns} dataSource={data} pagination={false} size="large" />)
    expect(wrapperOf(container)).toHaveClass('dg-size-large')
    expect(wrapperOf(container)).not.toHaveClass('dg-size-small')

    rerender(<Table columns={columns} dataSource={data} pagination={false} />)
    expect(wrapperOf(container).className).not.toMatch(/dg-size-/)
  })
})

describe('Table locale', () => {
  // emptyText 优先级（src/table/Table.tsx:289-298 + emptyLoadingAdapter.tsx:19-23）：
  //   TableProps.locale.emptyText > ConfigProvider locale.Table.emptyText > renderEmpty('Table') > <Empty>。
  it('prefers Table locale emptyText over ConfigProvider locale.Table emptyText', () => {
    const fromContext = renderWithConfig(
      <Table columns={columns} dataSource={[]} pagination={false} />,
      { locale: { locale: 'en', Table: { emptyText: 'ctx empty' } } },
    )
    expect(fromContext.container.querySelector('.dg-empty')).toHaveTextContent('ctx empty')

    const fromProps = renderWithConfig(
      <Table columns={columns} dataSource={[]} pagination={false} locale={{ emptyText: 'table empty' }} />,
      { locale: { locale: 'en', Table: { emptyText: 'ctx empty' } } },
    )
    expect(fromProps.container.querySelector('.dg-empty')).toHaveTextContent('table empty')
  })

  // locale.emptyText 函数形态：typeof === 'function' 时调用（emptyLoadingAdapter.tsx:19-23），
  // 经 ConfigProvider locale.Table 传入同样生效。
  it('supports function-form locale emptyText', () => {
    const { container } = renderWithConfig(
      <Table columns={columns} dataSource={[]} pagination={false} />,
      {
        locale: {
          locale: 'en',
          Table: { emptyText: () => <span data-testid="fn-empty">fn empty</span> },
        },
      },
    )

    expect(container.querySelector('.dg-empty [data-testid="fn-empty"]')).toHaveTextContent(
      'fn empty',
    )
  })

  // renderEmpty('Table') 兜底 + 再兜底到默认 antd <Empty>（emptyLoadingAdapter.tsx:25-30）；
  // 且一旦 locale.emptyText 存在，renderEmpty 让位。
  it('falls back to renderEmpty and then to the default Empty', () => {
    const renderEmpty: ConfigProviderProps['renderEmpty'] = (componentName) =>
      componentName === 'Table' ? <div className="custom-empty">custom empty</div> : null

    const custom = renderWithConfig(
      <Table columns={columns} dataSource={[]} pagination={false} />,
      { renderEmpty },
    )
    expect(custom.container.querySelector('.dg-empty .custom-empty')).toHaveTextContent(
      'custom empty',
    )

    const localeWins = renderWithConfig(
      <Table
        columns={columns}
        dataSource={[]}
        pagination={false}
        locale={{ emptyText: 'table empty' }}
      />,
      { renderEmpty },
    )
    expect(localeWins.container.querySelector('.dg-empty .custom-empty')).toBeNull()
    expect(localeWins.container.querySelector('.dg-empty')).toHaveTextContent('table empty')

    const fallback = customRender(<Table columns={columns} dataSource={[]} pagination={false} />)
    expect(fallback.container.querySelector('.dg-empty .ant-empty')).toBeTruthy()
    expect(fallback.container.querySelector('.dg-empty')).toHaveTextContent('No data')
  })

  // 已消费 locale 字段（FilterDropdown.tsx:150-157）：filterReset / filterConfirm 按钮 + 搜索框 placeholder。
  // 面板 portal 到 document.body，故用 document.body 查询。
  it('consumes filter panel locale fields', async () => {
    const searchColumns: TableProps<RecordType>['columns'] = [
      { ...filterColumns[0], filterSearch: true },
    ]
    const { container } = renderWithConfig(
      <Table columns={searchColumns} dataSource={data} pagination={false} />,
      {
        locale: {
          locale: 'en',
          Table: {
            filterConfirm: '确定',
            filterReset: '重置',
            filterSearchPlaceholder: '搜索筛选项',
          },
        },
      },
    )

    fireEvent.click(container.querySelector('.dg-filter-trigger')!)
    await waitFor(() => expect(document.body.querySelector('.dg-filter-dropdown')).toBeTruthy())

    // antd Button 对「恰好两个中文字」的 label 自动插入空格（autoInsertSpace）→ 归一空白后比较。
    const buttons = document.body.querySelectorAll('.dg-filter-dropdown-btns button')
    expect(buttons[0].textContent?.replace(/\s+/g, '')).toBe('重置')
    expect(buttons[1].textContent?.replace(/\s+/g, '')).toBe('确定')
    // `.dg-filter-dropdown-search-input` 类落在 antd Input 的 affix 包裹层（带 prefix 图标），
    // 真正的 `<input>` 在其内——placeholder 断言查询内层 input。
    expect(document.body.querySelector('.dg-filter-dropdown-search input')).toHaveAttribute(
      'placeholder',
      '搜索筛选项',
    )
  })

  // 已消费 locale 字段：filterCheckAll（tree 模式全选 Checkbox）+ filterEmptyText（filters: [] 空面板占位）。
  it('consumes filterCheckAll in tree mode and filterEmptyText in the empty panel', async () => {
    const treeColumns: TableProps<RecordType>['columns'] = [
      { ...filterColumns[0], filterMode: 'tree' },
    ]
    const tree = renderWithConfig(
      <Table columns={treeColumns} dataSource={data} pagination={false} />,
      { locale: { locale: 'en', Table: { filterCheckAll: '全选' } } },
    )
    fireEvent.click(tree.container.querySelector('.dg-filter-trigger')!)
    await waitFor(() =>
      expect(document.body.querySelector('.dg-filter-dropdown-checkall')).toBeTruthy(),
    )
    expect(document.body.querySelector('.dg-filter-dropdown-checkall')).toHaveTextContent('全选')

    // filters: [] → 面板菜单区渲染 renderEmpty('Table.filter') 兜底（Empty SIMPLE + filterEmptyText）。
    const emptyPanel = renderWithConfig(
      <Table columns={emptyFilterColumns} dataSource={data} pagination={false} />,
      { locale: { locale: 'en', Table: { filterEmptyText: '无筛选项' } } },
    )
    fireEvent.click(emptyPanel.container.querySelector('.dg-filter-trigger')!)
    await waitFor(() =>
      expect(document.body.querySelector('.dg-filter-dropdown-empty')).toBeTruthy(),
    )
    expect(document.body.querySelector('.dg-filter-dropdown-empty')).toHaveTextContent('无筛选项')
  })

  // 已消费 locale 字段：triggerAsc/triggerDesc/cancelSort（HeaderCell.tsx:292-302 原生 title）
  // + expand/collapse（expandAdapter.tsx:73-81 展开按钮 aria-label，仅字符串形态被消费）。
  //
  // 用**多级表头**（grouped children）驱动 multi 路径，让表头格走 engine/HeaderCell.tsx：
  // 单层表头的 flat 快速路径（engine/FlatColumnCells.tsx:291-301）把排序 title 硬编码为英文，
  // 不消费 filterLocale —— 实测差异已记入最终报告的「疑似缺陷」；此处不断言缺陷行为。
  it('consumes sort hover titles and expand/collapse labels', () => {
    const sorterColumns: TableProps<RecordType>['columns'] = [
      {
        title: 'Group',
        children: [{ title: 'Name', dataIndex: 'name', key: 'name', sorter: () => 0 }],
      },
      { title: 'Age', dataIndex: 'age', key: 'age' },
    ]
    const { container } = customRender(
      <Table
        columns={sorterColumns}
        dataSource={data}
        pagination={false}
        locale={{ triggerAsc: '点我升序', triggerDesc: '点我降序', cancelSort: '点我取消排序' }}
      />,
    )

    // multi 路径的叶子表头格 `data-column-key` 是路径限定键（`col-0.name`），故用
    // `.dg-column-has-sorters`（可排序叶子格唯一）定位。
    const headerOf = () =>
      container.querySelector<HTMLElement>('.dg-cell-header.dg-column-has-sorters')!
    expect(headerOf()).toHaveAttribute('title', '点我升序')
    fireEvent.click(headerOf())
    expect(headerOf()).toHaveAttribute('title', '点我降序')
    fireEvent.click(headerOf())
    expect(headerOf()).toHaveAttribute('title', '点我取消排序')

    const expandable = customRender(
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        locale={{ expand: '展开行', collapse: '收起行' }}
        expandable={{ expandedRowRender: (record) => <span>detail {record.name}</span> }}
      />,
    )
    const iconOf = () => expandable.container.querySelector<HTMLElement>('.dg-expand-icon')!
    expect(iconOf()).toHaveAttribute('aria-label', '展开行')
    fireEvent.click(iconOf())
    expect(iconOf()).toHaveAttribute('aria-label', '收起行')
  })

  // skip 依据：filterTitle / sortTitle / selectAll 三个字段在 src/table 内**无任何消费点**
  //   （grep `src/table/**` 仅命中 src/table/compat/locale.ts 自身的类型声明与注释；
  //   FilterDropdown 消费 5 个 filter* 字段，HeaderCell 消费 trigger*/cancelSort，
  //   expandAdapter 消费 expand/collapse，selectionAdapter 消费 selectionAll/selectInvert/selectNone
  //   ——filterTitle（antd FilterDropdown 的下拉标题）与 sortTitle（antd 排序 tooltip）在
  //   data-grid 无对应 UI 部位，selectAll 被 selectionAll 取代）。
  it.skip('applies filterTitle / sortTitle / selectAll', () => {
    // 占位：字段未被消费（src/table/compat/locale.ts:9-23 清单外的字段无渲染落点）。
  })
})

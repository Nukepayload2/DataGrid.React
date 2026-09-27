// 黑盒 feature-slice 测试：与 antd 自家 Table 测试用例逐条对齐（antd-style 黑盒层）。
//
// 对齐来源: G:\Projects\ant-design\components\table\__tests__\Table.test.tsx
//   30 个 it + mountTest（1 it）+ directionTest 占位（1 it.skip）= 共 32 用例。
//
// 选择器重映射（data-grid 无语义化 table DOM，行无 .dg-row 元素，以 data-row-index 标识）:
//   - antd `th` / `td` → `div.dg-cell.ant-table-cell.dg-cell-header` / `.dg-cell-body`
//     （表体格同样带 `data-column-key`，见 src/table/engine/BodyGrid.tsx:203）
//   - antd `.ant-table` → `.dg-grid`（类名别名，见 tests/table/api/Table.public-api.tsx 别名用例）
//   - antd `.ant-table-row-expand-icon` → `button.dg-expand-icon`
//   - antd `.ant-checkbox-input` → `input.dg-selection-input`
//   - antd `.ant-table-cell-ellipsis` → `.dg-cell-ellipsis`
//   - antd `.ant-table-cell-row-hover` → `.dg-row-hover`
//   - antd `.ant-table-selection-column` → `[data-column-key="__dg_selection__"]`
//   - 隐藏列：antd 从 DOM 移除单元格；data-grid 0fr grid track 保留在 DOM 并加 `.dg-cell-hidden`
//     （src/table/compat/column.ts:232-252），故"th 数量"断言重映射为"隐藏格带类"断言。
//
// skip 策略：data-grid 不支持 / 从未有的行为用 it.skip，且每个 skip 均带注释写明依据
// （src 文件:行号）；直测用例全部针对 data-grid 实际 DOM 断言。
import { createRef, useRef } from 'react'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { ConfigProvider } from 'antd'

import { Table, type TableProps, type TableRef } from '../../../src/table/index'
import { customRender, renderWithConfig } from '../../shared/render'
import { useFakeTimersSafe, waitFakeTimer } from '../../shared/fakeTimers'
import { mountTest } from '../../shared/mountTest'
import { directionTest } from '../../shared/directionTest'
import { expectSnapshot } from '../../shared/snapshot'

const { Column, ColumnGroup } = Table

describe('Table', () => {
  mountTest(Table)
  directionTest(Table)

  const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  afterAll(() => {
    warnSpy.mockRestore()
  })

  // antd L23：JSX 风格 API（Column/ColumnGroup 子元素 + 非法字符串子节点不崩溃）+ 快照。
  it('renders JSX correctly', () => {
    const data = [
      {
        key: '1',
        firstName: 'John',
        lastName: 'Brown',
        age: 32,
      },
      {
        key: '2',
        firstName: 'Jim',
        lastName: 'Green',
        age: 42,
      },
    ]

    const { container } = customRender(
      <Table dataSource={data} pagination={false}>
        <ColumnGroup title="Name">
          <Column title="First Name" dataIndex="firstName" key="firstName" />
          <Column title="Last Name" dataIndex="lastName" key="lastName" />
        </ColumnGroup>
        <Column title="Age" dataIndex="age" key="age" />
        {'invalid child'}
      </Table>,
    )

    expectSnapshot(container.firstChild)
  })

  // antd L53：columns prop 更新后表头随之更新（th → .dg-cell-header）。
  it('updates columns when receiving props', () => {
    const columns: TableProps<any>['columns'] = [
      {
        title: 'Name',
        key: 'name',
        dataIndex: 'name',
      },
    ]
    const { container, rerender } = customRender(<Table columns={columns} />)

    const newColumns: TableProps<any>['columns'] = [
      {
        title: 'Title',
        key: 'title',
        dataIndex: 'title',
      },
    ]
    rerender(<Table columns={newColumns} />)
    expect(container.querySelector('.dg-cell-header')?.textContent).toBe('Title')
  })

  // loading 两个用例用 fake timers（antd Spin delay 为 setTimeout 驱动，纯计时断言）。
  describe('loading', () => {
    useFakeTimersSafe()

    // antd L74：Spin 包裹 + delay 延迟出现 spinning section。
    // data-grid 经 TableLoadingContainer 直接用 antd <Spin>（src/table/emptyLoadingAdapter.tsx:42-55），
    // 选择器 .ant-spin-section 无需重映射；.ant-table-placeholder 重映射为 .dg-empty。
    it('loading with Spin', async () => {
      const { container, rerender } = customRender(<Table loading={{ spinning: false, delay: 500 }} />)
      expect(container.querySelector('.ant-spin-section')).toBeFalsy()
      expect(container.querySelector('.dg-empty')?.textContent).not.toBe('')
      rerender(<Table loading={{ spinning: true, delay: 500 }} />)
      expect(container.querySelector('.ant-spin-section')).toBeFalsy()
      await waitFakeTimer()
      rerender(<Table loading />)
      expect(container.querySelector('.ant-spin-section')).toBeTruthy()
    })

    // antd L89（issue 22733）：loading tip 不产生重复 Spin（.ant-spin 恰好 1 个）。
    it('support loading tip', async () => {
      const { container, rerender } = customRender(<Table loading={{ tip: 'loading...' }} />)
      await waitFakeTimer()
      rerender(
        <Table loading={{ tip: 'loading...', loading: true } as TableProps<any>['loading']} />,
      )
      expect(container.querySelectorAll('.ant-spin')).toHaveLength(1)
    })
  })

  // antd L101。
  // skip 依据：data-grid 从未有 columnsPageRange/columnsPageSize 字段（antd v5 已移除这两个
  // 废弃字段），无废弃兼容 warning 可断言；且 TableProps 不接受这两个字段，wrapper div 也
  // 不 spread rest props（src/table/Table.tsx:924-931 仅接 className/style/ref/onPointerDown）。
  it.skip('props#columnsPageRange and props#columnsPageSize do not warn anymore', () => {
    // 占位：与 antd 用例清单对齐，data-grid 无对应废弃字段。
  })

  // antd L124：onHeaderCell 返回值合并进表头格 div props（src/table/engine/FlatColumnCells.tsx:180-209,314-330）。
  it('support onHeaderCell', () => {
    const onClick = vi.fn()
    const { container } = customRender(
      <Table columns={[{ title: 'title', onHeaderCell: () => ({ onClick }) }]} />,
    )
    fireEvent.click(container.querySelector('.dg-cell-header')!)
    expect(onClick).toHaveBeenCalled()
  })

  // antd L133：column children 为空不崩溃。
  it('should not crash when column children is empty', () => {
    customRender(
      <Table<{ name?: string }>
        columns={[
          {
            dataIndex: 'name',
            children: undefined,
          },
        ]}
        dataSource={[]}
      />,
    )
  })

  // antd L147：dataSource 含非对象项不崩溃（getRowKey 对 null/undefined 安全，
  // src/table/engine/recordAccess.ts getRowKey）。
  it('should not crash when dataSource is array with none-object items', () => {
    customRender(
      <Table
        columns={[{ title: 'name' }]}
        dataSource={['1', 2, undefined, {}, null, true, false, 0] as TableProps<any>['dataSource']}
      />,
    )
  })

  // antd L156：原用例即 no-op 守卫（antd 源注释"原来的用例感觉是少了 touchmove 调用判断"）。
  // data-grid 无 touchmove 绑定，重映射为：对 grid 根（.ant-table 别名）触发 touchMove 不破坏渲染。
  it('prevent touch event', () => {
    const { container } = customRender(
      <Table<{ name?: string }>
        columns={[
          {
            dataIndex: 'name',
            children: undefined,
          },
        ]}
        dataSource={[]}
      />,
    )
    fireEvent.touchMove(container.querySelector('.ant-table')!)
    expect(container.querySelector('.ant-table')).toBeTruthy()
  })

  // antd L174：ellipsis: { showTitle: false } 仍加 ellipsis 类（CSS 省略号照常），
  // 只是不加 native title（src/table/columnAdapter.ts:26-51 normalize；BodyGrid.tsx:177-179）。
  it('renders ellipsis by showTitle option', () => {
    const data = [
      {
        id: '1',
        age: 32,
      },
      {
        id: '2',
        age: 42,
      },
    ]
    const columns: TableProps<any>['columns'] = [
      { title: 'id', dataIndex: 'id', ellipsis: { showTitle: false } },
      { title: 'age', dataIndex: 'age', ellipsis: { showTitle: false } },
    ]
    const { container } = customRender(<Table columns={columns} dataSource={data} />)
    container.querySelectorAll('.dg-cell-body').forEach((cell) => {
      expect(cell.classList.contains('dg-cell-ellipsis')).toBe(true)
    })
  })

  // antd L195：showTitle: true 时表头格带 native title，表体格 div 本身不带
  // （data-grid 的 body ellipsis title 在内层 .dg-cell-inner 上，BodyGrid.tsx:239-244；
  // 表头格 title 见 FlatColumnCells.tsx:291-301）。
  it('not renders ellipsis origin html title', () => {
    const data = [
      {
        id: '1',
        age: 32,
      },
      {
        id: '2',
        age: 42,
      },
    ]
    const columns: TableProps<any>['columns'] = [
      { title: 'id', dataIndex: 'id', ellipsis: { showTitle: true } },
      { title: 'age', dataIndex: 'age', ellipsis: { showTitle: true } },
    ]

    const { container } = customRender(<Table columns={columns} dataSource={data} />)
    container.querySelectorAll('.dg-cell-header').forEach((cell) => {
      expect(cell.getAttribute('title')).toBeTruthy()
    })
    container.querySelectorAll('.dg-cell-body').forEach((cell) => {
      expect(cell.getAttribute('title')).toBeFalsy()
    })
  })

  // antd L221（issue 37977）：ellipsis + sorter + filters 组合时表头 title 不丢失。
  it('should render title when enable ellipsis, sorter and filters', () => {
    const columns: TableProps<any>['columns'] = [
      { title: 'id', dataIndex: 'id', ellipsis: true, sorter: true, filters: [] },
      { title: 'age', dataIndex: 'age', ellipsis: true, sorter: true },
      { title: 'age', dataIndex: 'age', ellipsis: true, filters: [] },
    ]
    const { container } = customRender(<Table columns={columns} dataSource={[]} />)
    container.querySelectorAll('.dg-cell-header').forEach((cell) => {
      expect(cell.getAttribute('title')).toBeTruthy()
    })
  })

  // antd L236：全局 column.align + 逐列 align 覆盖 + EXPAND/SELECTION 哨兵列位置。
  // 重映射：td → .dg-cell-body[data-row-index="0"]（4 格：name / expand / age / selection）；
  // .ant-table-row-expand-icon → .dg-expand-icon；.ant-checkbox-input → .dg-selection-input。
  // 哨兵位置语义见 src/table/Table.tsx:492-494；全局 align 合并见 columnAdapter.ts:258-290。
  // align 取值重映射：antd 用 `'left' | 'right'`（antd `es/table/interface.d.ts:180`），
  // data-grid 的 `Align` 是逻辑值 `'start' | 'center' | 'end'`（src/table/nativeOptions.ts:5），
  // 且对齐由 `data-align` 驱动的 flex `justify-content` 实现（src/table/style/table.css:220-226，
  // 只有 `[data-align='center'|'end']` 两条规则，没有 `'right'`）——故用 `'end'` 而非 `'right'`。
  it('supports column align with per-column override and special columns', () => {
    const { container } = customRender(
      <Table
        columns={[
          { title: 'Name', dataIndex: 'name' },
          Table.EXPAND_COLUMN,
          {
            title: 'Info',
            children: [{ title: 'Age', dataIndex: 'age', align: 'end' }],
          },
          Table.SELECTION_COLUMN,
        ]}
        dataSource={[
          {
            key: '1',
            name: 'Jack',
            age: 20,
          },
        ]}
        column={{ align: 'center' }}
        expandable={{ expandedRowRender: () => null }}
        rowSelection={{}}
        pagination={false}
      />,
    )

    // 泛型窄化到 HTMLElement：`.style`（ElementCSSInlineStyle）不在 Element 上。
    const cells = container.querySelectorAll<HTMLElement>('.dg-cell-body[data-row-index="0"]')

    expect(cells).toHaveLength(4)
    // [0] name 列：全局 column.align='center'（applyColumnDefaults 合并）。
    expect(cells[0].style.textAlign).toBe('center')
    expect(cells[0].textContent).toBe('Jack')
    // [1] 展开列：expandedRowRender 返回 null → 图标渲染但 disabled（expandAdapter）。
    expect(cells[1].querySelector('.dg-expand-icon')).toBeTruthy()
    // [2] age 列：逐列 align='end' 覆盖全局（antd 同位置为 `'right'`）。
    expect(cells[2].style.textAlign).toBe('end')
    expect(cells[2].textContent).toBe('20')
    // [3] 选择列：原生 checkbox input。
    expect(cells[3].querySelector('.dg-selection-input')).toBeTruthy()
  })

  // antd L273：rowKey 函数 index 参数废弃 warning。
  // skip 依据：data-grid 的 RowKeyType 为 `string | ((record) => string | number)`，
  // 函数形态本就没有 index 参数（src/table/publicTypes.ts:31），无废弃 warning 可触发。
  it.skip('warn about rowKey when using index parameter', () => {
    // 占位：data-grid rowKey 函数无 index 参数。
  })

  // antd L288：rowKey 函数（无 index 参数）不产生 warning。
  it('not warn about rowKey', () => {
    warnSpy.mockReset()
    const columns: TableProps<any>['columns'] = [
      {
        title: 'Name',
        key: 'name',
        dataIndex: 'name',
      },
    ]
    customRender(<Table columns={columns} rowKey={(record) => record.key as string} />)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  // antd L301：ConfigProvider table={{ rowKey }} 全局配置。
  // skip 依据：data-grid 只从 ConfigProvider 上下文消费 locale（src/table/Table.tsx:289-298），
  // 无全局 rowKey 配置；且 DOM 无 .ant-table-row 元素 / data-row-key 属性可断言。
  it.skip('use global rowKey config', () => {
    // 占位：data-grid 无 ConfigProvider table.rowKey 全局配置。
  })

  // antd L320：rowKey prop 优先于全局配置。
  // skip 依据：同上——全局 rowKey 配置不存在，"优先"语义无从谈起。
  it.skip('prefer rowKey prop over global rowKey config', () => {
    // 占位：data-grid 无 ConfigProvider table.rowKey 全局配置。
  })

  // antd L340：ref 支持不产生 warning（data-grid ref 为 TableRef 句柄，
  // src/table/Table.tsx:596-605 useImperativeHandle）。
  it('should support ref', () => {
    warnSpy.mockReset()
    const columns: TableProps<any>['columns'] = [
      {
        title: 'Name',
        key: 'name',
        dataIndex: 'name',
      },
    ]
    const Wrapper = () => {
      const ref = useRef<TableRef>(null)
      return <Table ref={ref} columns={columns} />
    }
    customRender(<Wrapper />)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  // antd L358（issue 38371）：column title 函数形态（title: () => ReactNode）。
  // skip 依据：data-grid 的 ColumnType.title 仅支持 ReactNode
  // （src/table/compat/column.ts:95 `title?: ReactNode`），无函数形态——函数作为
  // ReactNode 会被 React 抛 "Functions are not valid as a React child"。
  // ReactNode 形态由下方 'title should support ReactNode' 用例覆盖。
  it.skip('should render title', () => {
    // 占位：data-grid column.title 不支持函数形态。
  })

  // antd L404：column title 支持 ReactNode（thead th 快照 → .dg-cell-header 快照）。
  it('title should support ReactNode', () => {
    const { container } = customRender(
      <Table<{ name?: string }>
        columns={[
          {
            title: (
              <div>
                <strong>Current</strong> <span>User</span>
              </div>
            ),
            dataIndex: 'name',
          },
        ]}
        dataSource={[]}
      />,
    )

    expectSnapshot(container.querySelector('.dg-cell-header'))
  })

  // antd L425：aria-*/data-* 属性透传。
  // skip 依据：data-grid 的 TableProps 不继承 HTMLAttributes，wrapper div 只接收
  // className/style/ref/onPointerDown，不 spread rest props（src/table/Table.tsx:924-931）；
  // 且无语义化 <table> 元素可挂 aria-label。
  it.skip('support aria-* and data-*', () => {
    // 占位：data-grid TableProps 无 HTML 属性透传。
  })

  // antd L432（issue 44802）：scroll 时 aria-* 透传到所有 table。
  // skip 依据：同上（无 HTML 属性透传）；且 data-grid 为单 DOM 结构，不存在 antd
  // 头/体双 table 的"多 table"场景。
  it.skip('passes aria-* props to all tables with scroll', () => {
    // 占位：data-grid TableProps 无 HTML 属性透传，且为单 DOM 结构。
  })

  // antd L450：ConfigProvider theme wireframe token（wireframe 为 token 级主题，
  // 此处快照 DOM 结构与 antd 用例对齐；data-grid 主题经 ConfigProvider token 注入）。
  it('support wireframe', () => {
    const columns: TableProps<any>['columns'] = [{ title: 'Name', key: 'name', dataIndex: 'name' }]
    const { container } = renderWithConfig(
      <Table columns={columns} />,
      { theme: { token: { wireframe: true } } },
    )
    expectSnapshot(container.firstChild)
  })

  // antd L460：ConfigProvider getPopupContainer 注入到筛选下拉（portal 挂到表格外层 div 内）。
  // 用函数形态在调用时读 ref（antd 原用例直接传 wrapRef.current!，首帧为 null；
  // 函数形态语义等价且规避该时序问题）。弹窗类断言用真 timers + waitFor。
  it('support getPopupContainer inject by ConfigProvider', async () => {
    const columns: TableProps<any>['columns'] = [
      {
        title: 'title',
        key: 'title',
        dataIndex: 'title',
        filters: [
          {
            text: 'filter',
            value: 'filter',
          },
        ],
      },
    ]
    const Demo = () => {
      const wrapRef = useRef<HTMLDivElement>(null)
      return (
        <ConfigProvider getPopupContainer={() => wrapRef.current ?? document.body}>
          <div ref={wrapRef}>
            <Table columns={columns} />
          </div>
        </ConfigProvider>
      )
    }

    const { container } = customRender(<Demo />)

    fireEvent.click(container.querySelector('.ant-table-filter-trigger')!)
    await waitFor(() => {
      expect(container.querySelector('.ant-dropdown')).toBeTruthy()
    })
  })

  // antd L492：scroll.y=200 时受控 Popover 不重复渲染。
  // skip 依据：data-grid 的 scroll.y 仅支持 true（布尔），不支持数字固定高度
  // （src/table/publicTypes.ts:175 `y?: true`；known-limitations: scroll-y）；
  // 且"重复 Popover"根因是 antd 头/体双 table DOM，data-grid 单 DOM 结构不存在该问题。
  it.skip('should not render duplicated controlled Popover in column title when scroll is enabled', () => {
    // 占位：scroll.y 数字形态未支持（known-limitations: scroll-y）。
  })

  // antd L541：ref 句柄。data-grid ref 是 TableRef 句柄对象（非 antd 的 wrapper DOM 节点），
  // 故 antd 对 ref 本身的 toHaveClass 断言重映射为 nativeElement === .ant-table-wrapper
  // （.dg-wrapper 带 ant-table-wrapper 别名类，见 tests/table/api/Table.public-api.tsx 别名用例）。
  it('support reference', () => {
    const tblRef = createRef<TableRef>()
    const { container } = customRender(<Table ref={tblRef} />)

    const wrapDom = container.querySelector('.ant-table-wrapper')!

    expect(tblRef.current?.nativeElement).toBe(wrapDom)
    expect(typeof tblRef.current?.scrollTo === 'function').toBeTruthy()
  })

  // antd L552：hidden 列。重映射：data-grid 隐藏列保留在 DOM（0fr track + visibility），
  // 带 .dg-cell-hidden 类（src/table/compat/column.ts:232-252）——antd 的"th 数量 2"
  // 断言重映射为"3 格中隐藏格带类、其余不带"。
  it('support hidden columns', () => {
    const columns: TableProps<any>['columns'] = [
      {
        key: 1,
        title: 'title1',
      },
      {
        key: 2,
        title: 'title2',
        hidden: true,
      },
      {
        key: 3,
        title: 'title3',
      },
    ]
    const { container } = customRender(<Table columns={columns} />)

    const headerCells = container.querySelectorAll('.dg-cell-header')
    expect(headerCells).toHaveLength(3)
    expect(headerCells[1].classList.contains('dg-cell-hidden')).toBe(true)
    expect(headerCells[1].textContent).toBe('title2')
    expect(headerCells[0].classList.contains('dg-cell-hidden')).toBe(false)
    expect(headerCells[2].classList.contains('dg-cell-hidden')).toBe(false)
  })

  // antd L574：分组表头 hidden 列（组级 hidden + 组内叶子 hidden）。
  // skip 依据：data-grid 的 hidden 仅对叶子列生效，分组列 hidden 无效
  // （src/table/compat/column.ts:238-239）；叶子列 hidden 已由上方 'support hidden columns'
  // 用例覆盖（.dg-cell-hidden 类断言）。
  it.skip('support hidden columns in Group table head', () => {
    // 占位：data-grid hidden 仅支持叶子列。
  })

  // antd L616：rowHoverable=false 关闭行 hover 高亮（.ant-table-cell-row-hover → .dg-row-hover，
  // src/table/engine/BodyGrid.tsx:160-182 resolveHoverClass）。
  it('support disable row hover', () => {
    const { container } = customRender(
      <Table
        columns={[
          {
            title: 'Name',
            key: 'name',
            dataIndex: 'name',
          },
        ]}
        dataSource={[
          {
            name: 'name1',
          },
        ]}
        rowHoverable={false}
      />,
    )
    const cell = container.querySelector('.dg-cell-body')!

    fireEvent.mouseEnter(cell)
    expect(container.querySelectorAll('.dg-cell-body.dg-row-hover')).toHaveLength(0)
  })

  // antd L640：rowSelection.align 透传到选择列（.ant-table-selection-column →
  // .dg-cell-body[data-column-key="__dg_selection__"]，inline textAlign，
  // src/table/selectionAdapter.tsx:154-158 align 缺省 'center'）。
  // ★ 与 antd 差异：antd 传物理值 'right'，data-grid 的 Align 联合是逻辑值
  // 'start' | 'center' | 'end'（src/table/nativeOptions.ts:5），且对齐实际由
  // `.dg-cell[data-align]` 的 justify-content 驱动（src/table/style/table.css:172 单元格是
  // flex 容器，220-226 只有 [data-align='center'/'end'] 两条规则，无 [data-align='right']）。
  // 实测 'right'：inline text-align='right'、data-align="right" 均写出，但没有 CSS 规则匹配，
  // 内容对齐退回 .dg-cell 默认 flex-start → 即"被透传成对布局无效的值"，属被忽略而非可用。
  // 故本用例改用 data-grid 合法取值 'end'（实测 data-align="end"、inline textAlign='end'）。
  it('rowSelection should support align', () => {
    const { container } = customRender(
      <Table
        columns={[{ title: 'Name', dataIndex: 'name' }]}
        dataSource={[{ key: 1, name: 'Jack' }]}
        rowSelection={{ align: 'end' }}
      />,
    )

    const selectionCell = container.querySelector<HTMLElement>(
      '.dg-cell-body[data-column-key="__dg_selection__"]',
    )
    expect(selectionCell).toBeTruthy()
    expect(selectionCell!.style.textAlign).toBe('end')
  })
})

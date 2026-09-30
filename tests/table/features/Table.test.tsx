// 黑盒 feature-slice 测试：与 antd 自家 Table 测试用例逐条对齐（antd-style 黑盒层）。
//
// 对齐来源: {{AntDesign}}/components/table/__tests__/Table.test.tsx
//   30 个 it + mountTest（1 it）+ directionTest 占位（1 it.skip）= 共 32 用例
//   （**6.5.2** 参照口径；已安装裁判 6.4.4 同名件 = **31**，差 1 行＝C-6
//   `passes aria-* props to all tables with scroll` 仅存在于 6.5.2，该 it.skip 旁注释有
//   P-088 版本注记；分母由 G-2 分母门从 tests/fixtures/antd-denominator.json 重算）。
//   本文件另有 data-grid 专属补测 **5 条**（engine cell key 保持 4 条 + onHeaderRow key 变化
//   时 header cell DOM 节点保持 1 条，步骤 86 jsx-key 批次，见各用例旁注释）
//   ⇒ 运行时 30 直测 | 7 skip（37），2026-09-30 G-2 分母门重跑核平。
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

/** 用户 onRow 返回的 `key` 值——缺陷现场里它会覆写引擎给格子的 React key。 */
const USER_CELL_KEY = 'boom-cell-key'

/**
 * 读 DOM 节点上的 React fiber `key`（步骤 84 探针口径，`tmp/84-doctor/probe-fiber.txt`）。
 * React 的元素 key **不落 DOM** ⇒ 属性断言测不到覆写，只能从 fiber 取。
 */
function readFiberKey(el: Element): string {
  const names = Object.getOwnPropertyNames(el).concat(Object.keys(el))
  const fiberProp = names.find((name) => name.startsWith('__reactFiber$'))
  if (!fiberProp) return '<no-fiber>'
  const fiber = (el as unknown as Record<string, any>)[fiberProp]
  const key = fiber?.key
  return key === null || key === undefined ? '<undefined>' : String(key)
}

/**
 * 读格子的祖先**组件名**链——用来确认这条用例真跑在预期的那条表体路径上
 * （flat 路径格子由 `ColumnCells` 渲染，multi 路径由 `BodyCell` 渲染）。
 */
function fiberAncestorNames(el: Element): string[] {
  const names = Object.getOwnPropertyNames(el).concat(Object.keys(el))
  const fiberProp = names.find((name) => name.startsWith('__reactFiber$'))
  if (!fiberProp) return []
  let cur = (el as unknown as Record<string, any>)[fiberProp]
  const out: string[] = []
  for (let depth = 0; cur && depth < 8; depth += 1) {
    if (typeof cur.type === 'function') out.push(cur.type.name || '<anonymous>')
    cur = cur.return
  }
  return out
}

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

  // antd L101（props#columnsPageRange / columnsPageSize）→ **已转直测，物理位置移到本域末尾**
  // （见文末「步骤 81 由 skip 转直测」组）。原因：本文件 `support wireframe` 的存量快照把 cssinjs 的
  // `css-var-_r_N_` 类名一起存了，N 随**全文件 <Table> 挂载次数**漂移；在它之前新增任何挂载都会把
  // 那条快照染红（`__snapshots__/` 与 `tests/shared/snapshot.ts` 均在本棒写边界外）⇒ 三条转直测统一后置。
  // 用例内容与 antd L101 逐条对应，provenance 以 `// antd L101` 标记为准，不以物理位置为准。


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
  // 哨兵位置语义见 src/table/Table.tsx:492-494；全局 align 合并见 columnAdapter.ts:280-312。
  // align 取值（缺口 #13 已修）：antd 用物理值 `'left' | 'right'`（`es/table/interface.d.ts:180`），
  // data-grid 的输入面 `Align` 是**双取值**（逻辑值 start/center/end + 物理值 left/center/right，
  // src/table/nativeOptions.ts:19），物理值在适配层由 `columnAdapter.normalizeAlign`（`:39-44`）
  // 归一为逻辑值后才落引擎 ⇒ 本用例照 antd 原值传 `'right'`。
  // ★ 归一是**唯一**的对齐真源：`table.css` 只有 `[data-align='center'|'end']` 两条规则，
  //   **不补** `[data-align='right']`——所以 `'right'` 与 `'end'` 的落点（data-align / inline
  //   textAlign / justify-content）逐值全等（探针 P6 并排实测）。
  it('supports column align with per-column override and special columns', () => {
    const { container } = customRender(
      <Table
        columns={[
          { title: 'Name', dataIndex: 'name' },
          Table.EXPAND_COLUMN,
          {
            title: 'Info',
            children: [{ title: 'Age', dataIndex: 'age', align: 'right' }],
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
    // [2] age 列：逐列 align='right'（antd 原值）覆盖全局，经 normalizeAlign 归一为 'end' 落点
    //     —— data-align 与 inline textAlign 都是 'end'，**不会**写出未匹配的 'right'。
    expect(cells[2].getAttribute('data-align')).toBe('end')
    expect(cells[2].style.textAlign).toBe('end')
    expect(cells[2].textContent).toBe('20')
    // [3] 选择列：原生 checkbox input。
    expect(cells[3].querySelector('.dg-selection-input')).toBeTruthy()
  })

  // antd L273（规约源 6.5.2 `Table.test.tsx:273`；裁判 = 已安装 antd **6.4.4**）：rowKey 函数 index 参数废弃 warning。
  // skip 依据（**结论仍真**）：data-grid 在该场景**不产生任何告警**，与裁判不同值 ⇒ 缺口在我方，不可转直测。
  //   - 类型面：`RowKeyType = string | ((record) => string | number)`，函数形态本就没有 index 参数
  //     （`src/table/publicTypes.ts:32`；旧依据写的 `:31` 实测 off-by-one，已改）。
  //   - ⚠️ 但"类型面没有 index"只解释调用约定，**不等于**"不会/不该告警"——真判据是运行时零告警：
  //     `src/table` 唯一的 console 出口是 `devWarn.ts:84` 的 `console.warn`，全文 `console.error` 零命中。
  //   - 裁判 6.4.4 产物：`node_modules/antd/es/table/InternalTable.js:169`
  //     `warning(!(isFunction(rowKey) && rowKey.length > 1), 'usage', '`index` parameter of `rowKey` function is deprecated. …')`
  //     ⇒ 判据是**形参个数**，6.4.4 与 6.5.2 都在场（非版本条件性分叉）。
  //   - 双臂实测（探针 `tmp/81-probe2-readings.txt`）：`B2.dg.indexWarnHit = 0`（行 2 gate 已过）
  //     ↔ `B2.ref.indexWarnHit = 2`（StrictMode 双跑，同文案）⇒ **不同值**，留 skip。
  it.skip('warn about rowKey when using index parameter', () => {
    // 占位：data-grid 不产生该废弃告警（缺口在我方产品码）。
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

  // antd L301 / L320（ConfigProvider `table={{rowKey}}` 全局配置 与 props 优先级）
  // → **已转直测，物理位置移到本域末尾**（原因见文件内 `antd L101` 处的指针注释）。
  // 旧依据「data-grid 只从 ConfigProvider 消费 locale、无全局 rowKey 配置」已实测为假：
  //   `src/table/Table.tsx:302` 同时取 `table` 段，`src/table/contextDefaults.ts` 归一
  //   `props.rowKey || table?.rowKey || 'key'` 三档链（与裁判 6.4.4
  //   `node_modules/antd/es/table/InternalTable.js:165` 同形）⇒ 与裁判同值，转直测。


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

  // antd L358（规约源 6.5.2 `Table.test.tsx:358`，issue 38371）：column title 函数形态（title: () => ReactNode）。
  // skip 依据（**仍真**）：data-grid 的 `ColumnType.title` 仅支持 ReactNode
  //   （`src/table/compat/column.ts:96`；旧依据写的 `:95` 实测 off-by-one，已改），无函数形态。
  //   实测后果（不是"React 会抛"——那句是假理由，框架只按父组件名重写一条 console 错误、永不抛）：
  //   标题**渲染为空**，开 `ellipsis` 时连原生 `title` 属性也丢；现值另有一条开发态按列 `console.warn` 兜住可发现性。
  // 双臂实测（探针 `tmp/81-probe-readings.txt` / `81-probe3-readings.txt`）：
  //   `A5.dg` = 表头文本 `["sex",""]`、函数被调 **0** 次、`console.error` 1 条（React「Functions are not
  //   valid as a React child」）、`console.warn` 1 条 `[data-grid] column.title … key=`t` …`；
  //   `C1.dg` = 加 `ellipsis` 后表头 `title` 属性仍为 `null`；
  //   `A5.ref` = `["sex","age20"]`、被调 **4** 次（形参 1 个）、err/warn 皆 0
  //   （裁判 6.4.4 侧 `renderColumnTitle` 遇函数即调）⇒ **不同值**。
  // ⚠️ 另登记一条转直测的**结构性前置**：上游该用例的承重断言是 `expect(container).toMatchSnapshot()`，
  //   而本仓 6.5.2 与 6.4.4 两侧生成的类名/节点不同 ⇒ 将来即使补齐产品码，转直测还要先解决
  //   "新增快照要写 `tests/table/features/__snapshots__/`"（本棒写边界外）。能力不移植（属功能移植），故留 skip。
  it.skip('should render title', () => {
    // 占位：data-grid column.title 不支持函数形态（缺口在我方产品码）。
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

  // antd L425（规约源 6.5.2 `Table.test.tsx:425`）：aria-*/data-* 属性透传。
  // skip 依据（**仍真**）：data-grid 的 `TableProps` 不继承 HTMLAttributes，wrapper div 只接
  //   `className` / `style` / `ref` / `onPointerDownCapture` / `onPointerDown`，**不 spread rest props**
  //   （真位 `src/table/Table.tsx:1031-1037`；旧依据写的 `:924-931` 实测是 `.dg-scroll` 的文档注释区，已改）；
  //   且无语义化 `<table>` 元素可挂 `aria-label`。
  // 双臂实测（探针 `tmp/81-probe-readings.txt` 臂 `A6.dg` / `A6.ref`）：dg `<table>` **0** 张、
  //   wrapper 与 `.dg-grid` 的 `data-number`/`aria-label` 全 **null** ↔ 裁判 `<table>` 1 张且
  //   `aria-label='label'`、`.ant-table[data-number]='123'` ⇒ **不同值**。
  it.skip('support aria-* and data-*', () => {
    // 占位：data-grid TableProps 无 HTML 属性透传。
  })

  // antd L432（规约源 6.5.2 `Table.test.tsx:432`，issue 44802）：scroll 时 aria-* 透传到所有 table。
  // skip 依据（**仍真**）：同上（无 HTML 属性透传，`src/table/Table.tsx:1031-1037`）；
  //   且 data-grid 为单 DOM 结构，不存在 antd 头/体双 `<table>` 的"多 table"场景。
  // 双臂实测（臂 `A7.dg` / `A7.ref`，构造 `scroll:{x:400,y:100}`）：dg `<table>` **0**、`.dg-grid` 1（无 aria）
  //   ↔ 裁判 `<table>` **2** 张、`allTablesAriaLabel = [null,'label']` ⇒ **不同值**。
  // ⚠️ 新登记一条对裁判的读数（不改判决，本条 dg 侧连 `<table>` 都没有）：**已安装 antd 6.4.4 自身
  //   不满足**上游"每张 table 都带 aria-label"的期望（两张里只有一张带）⇒ 该期望属**规约源 6.5.2** 的行为，
  //   本条不存在"补齐我方就同值"的路径（按 P-088 记版本）。
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

  // antd L492（规约源 6.5.2 `Table.test.tsx:492`）：scroll.y=200 时受控 Popover 不重复渲染。
  // skip 依据（**仍真**）：data-grid 的 `scroll.y` 仅支持 `true`（布尔），不支持数字固定高度
  //   （`src/table/publicTypes.ts:176` `scroll?: { x?: true | number | string; y?: true; … }`；
  //   旧依据写的 `:175` 实测是上一行的 `*/`，已改；known-limitations: scroll-y）；
  //   且"重复 Popover"的根因是 antd 头/体双 `<table>` DOM，data-grid 单 DOM 结构不存在该问题。
  // 双臂实测（**第三轮干净读数** `tmp/81-probe3-readings.txt` 臂 `B8.dg` / `B8.ref`，
  //   每臂独立 it ＋ 臂首打印 body 残留基线 `popoverInBodyBeforeArm: 0`）：
  //   点表头按钮 开→关→开 三次 `.ant-popover` 计数 dg **`[1,1,1]`** ↔ 裁判 **`[1,1,1]`**、弹层内按钮文本
  //   两臂都是 `["C"]` ⇒ **上游的期望值（恰好 1）两臂已达**。
  //   ⚠️ 第一轮曾用 `thead button` 读 dg ⇒ `headerButtonFound:false`、弹层数 0，那是**读不到**不是**没发生**
  //   （dg 无 `<thead>`，选择器要换 `.dg-cell-header button`）；同一轮还因两臂共用一个 it 让 dg 的 portal
  //   残留把裁判读数染成 2。两条都已作废。
  // 判决＝仍留 skip，但**理由不是"无法断"**：转直测要写 `scroll={{ y: 200 }}`，本仓公开类型 `y?: true` 直接拒，
  //   只能 `as never` 破类型面才能构造 ⇒ 与"黑盒层按公开类型面写用例"的口径冲突。**交 main 裁定**
  //   （要不要为这条开"故意传非法值"的先例），本棒不硬转。
  it.skip('should not render duplicated controlled Popover in column title when scroll is enabled', () => {
    // 占位：scroll.y 数字形态未支持（known-limitations: scroll-y），转直测需先破公开类型面。
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

  // antd L574（规约源 6.5.2 `Table.test.tsx:574`）：分组表头 hidden 列（组级 hidden ＋ 组内叶子 hidden）。
  // skip 依据（**仍真**）：data-grid 的 `hidden` 仅对叶子列生效，分组列（有 `children`）的 `hidden` 无效
  //   （判据文案在 `src/table/compat/column.ts:239-240`；旧依据写的 `:238-239` 实测越界一格，已改）。
  // 双臂实测（探针 `tmp/81-probe-readings.txt` 臂 `A9.dg` / `A9.ref`；两臂都只数容器内节点、无 portal 面）：
  //   dg `.dg-cell-header` **9** 个（组级 hidden 的 `title2` 及其三个子叶子**全在**），
  //   带 `.dg-cell-hidden` 的只有叶子级的 `title3-1` / `title3-3`；
  //   ↔ 裁判 `thead th` **3** 个，两行分别 `['title1','title3']` / `['title3-2']`（上游正是断 2 与 1）
  //   ⇒ **不同值**。
  // ⚠️ 更正旧依据末句的口径：「叶子列 hidden 已由上方 'support hidden columns' 用例覆盖」只对**平铺表头**成立；
  //   分组表头下的叶子 hidden（dg 保留 DOM ＋ 加 `.dg-cell-hidden`，0fr track 方案）本文件**无直测**。
  it.skip('support hidden columns in Group table head', () => {
    // 占位：data-grid hidden 仅支持叶子列（组级 hidden 无效＝与裁判的真实分叉）。
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
  // .dg-cell-body[data-column-key="__dg_selection__"]，inline textAlign + data-align，
  // src/table/selectionAdapter.tsx:315 align 缺省 'center'）。
  // 缺口 #13 已修：`rowSelection.align` 与普通列 align 走**同一条**归一路径
  // （`normalizeAlign`，src/table/columnAdapter.ts:39-44），所以 antd 的物理值 `'right'`
  // 在这里合法且有效 ⇒ 本用例回归 antd 原值 `'right'`（旧版因未归一被迫改用 `'end'`，
  // 因为 `'right'` 会直通成没有 CSS 规则匹配的 `data-align="right"`）。
  // 归一后落点是逻辑值：data-align="end"、inline textAlign='end'，与直接传 'end' 逐值全等
  // （table.css 不补 `[data-align='right']` 规则，归一是单一真源；探针 P6 并排实测）。
  it('rowSelection should support align', () => {
    const { container } = customRender(
      <Table
        columns={[{ title: 'Name', dataIndex: 'name' }]}
        dataSource={[{ key: 1, name: 'Jack' }]}
        rowSelection={{ align: 'right' }}
      />,
    )

    const selectionCell = container.querySelector<HTMLElement>(
      '.dg-cell-body[data-column-key="__dg_selection__"]',
    )
    expect(selectionCell).toBeTruthy()
    expect(selectionCell!.getAttribute('data-align')).toBe('end')
    expect(selectionCell!.style.textAlign).toBe('end')
  })

  // ══════════════ 步骤 81 由 skip 转直测（antd L101 / L301 / L320）══════════════
  // 三条统一后置到本域末尾：`support wireframe` 的存量快照把 cssinjs 的 `css-var-_r_N_` 类名存了进去，
  // N 随全文件 `<Table>` 挂载次数漂移 ⇒ 在它之前新增任何挂载都会把那条快照染红，而
  // `tests/table/features/__snapshots__/` 与 `tests/shared/snapshot.ts` 都在本棒写边界外。
  // provenance 以每条的 `// antd LNNN` 标记为准，不以物理位置为准。

  // antd L101（规约源 6.5.2 `Table.test.tsx:101`；裁判 = 已安装 antd **6.4.4**）。
  // 旧依据「无废弃兼容 warning 可断言」把上游的**负向期望**读成了正向——上游断的正是
  // 「不 warn 那串 v5 文案」＋「两字段不被调用」，data-grid 与裁判 6.4.4 逐值同值
  // （探针 `tmp/81-probe2-readings.txt` 臂 `B1.dg` / `B1.ref`：行 2、告警 0 条、两 mock 0/0、
  // wrapper 上 `columnsPage*` 属性 []）。裁判产物 `grep -rn columnsPageRange node_modules/antd/es/`
  // 零命中 ⇒ 该告警在 6.4.4 也已彻底不存在。
  // 旧依据的假锚点同时改实：wrapper div 真位在 `src/table/Table.tsx:1031-1037`，属性面只有
  // className/style/ref/onPointerDownCapture/onPointerDown（原写的 `:924-931` 实测是 `.dg-scroll` 注释区）。
  // 永绿防护：本条承重全是负向断言 ⇒ 末尾的阳性对照不可省（否则 spy 没接上也恒绿）。
  it('props#columnsPageRange and props#columnsPageSize do not warn anymore', () => {
    const data = [
      { key: '1', age: 32 },
      { key: '2', age: 42 },
    ]
    const columnsPageRange = vi.fn()
    const columnsPageSize = vi.fn()
    const props = { columnsPageRange, columnsPageSize }

    warnSpy.mockReset()
    const { container } = customRender(
      <Table dataSource={data} rowKey="key" {...props}>
        <Column title="Age" dataIndex="age" key="age" />
      </Table>,
    )

    // 非空对照 ①（P-102）：两行确实渲染了 ⇒ "没告警"不是因为"没跑到"。
    // data-grid 无语义 <tbody>，行以 data-row-index 标识（见本文件头选择器重映射）。
    const rowIndexes = new Set(
      Array.from(container.querySelectorAll('.dg-cell-body')).map((cell) => cell.getAttribute('data-row-index')),
    )
    expect([...rowIndexes]).toEqual(['0', '1'])

    // 上游的两条承重断言（照 6.5.2 语义）。
    expect(warnSpy).not.toHaveBeenCalledWith(
      '`columnsPageRange` and `columnsPageSize` are removed, please use fixed columns instead, see: https://u.ant.design/fixed-columns.',
    )
    expect(columnsPageRange).not.toHaveBeenCalled()
    expect(columnsPageSize).not.toHaveBeenCalled()
    // 比上游更强一档：dg 侧连一条 console.error 都不该有。
    expect(warnSpy).not.toHaveBeenCalled()
    // wrapper 未被 spread 上未知属性（真分叉点，实测 []）。
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.getAttributeNames().filter((name) => name.startsWith('columnsPage'))).toEqual([])

    // 非空对照 ②（阳性）：本用例的 console.error 捕获通道确实会响——
    // 函数式 `column.title` 会让 React 走一次 console.error（探针 `A5.dg.errCount = 1`）。
    customRender(
      <Table
        columns={[{ title: (() => <span>fn</span>) as never, key: 't', dataIndex: 'age' }]}
        dataSource={data}
        pagination={false}
      />,
    )
    const errorCalls = warnSpy.mock.calls.length
    warnSpy.mockReset()
    expect(errorCalls).toBeGreaterThan(0)
  })

  // antd L301（规约源 6.5.2 `Table.test.tsx:301`；裁判 = 已安装 antd **6.4.4**）：
  // `ConfigProvider table={{ rowKey }}` 全局配置生效。
  // 选择器重映射：上游断 `.ant-table-row` 的 `dataset.rowKey`；data-grid 无 `data-row-key` 属性
  //   （探针 `B3.dg.anyDataRowKey = null`），改从 `rowSelection.onChange` 回传的 selectedRowKeys 观测行键；
  //   裁判侧用**同一个观测面**读数与 dg 逐值相同（`B3.ref.ctxOnly = ["666"]`）。
  it('use global rowKey config', () => {
    const rows = [{ id: '666', key: 'foobar', name: 'Foobar' }]
    const columns: TableProps<any>['columns'] = [{ title: 'Name', dataIndex: 'name', key: 'name' }]

    // 非空对照（同一观测面的缺省档）：不给 ConfigProvider 时行键回退内置 'key' 字段。
    const baselineOnChange = vi.fn()
    const baseline = customRender(
      <Table
        columns={columns}
        dataSource={rows}
        rowSelection={{ onChange: baselineOnChange }}
        pagination={false}
      />,
    )
    const baselineCheckbox = baseline.container.querySelector<HTMLInputElement>('.dg-cell-body .dg-selection-input')
    expect(baselineCheckbox).toBeTruthy() // P-102：先确认点击目标在场
    fireEvent.click(baselineCheckbox!)
    expect(baselineOnChange.mock.calls[0]?.[0]).toEqual(['foobar'])

    // 主断言：只给 ConfigProvider 的全局 rowKey ⇒ 行键取 `id`。
    const onChange = vi.fn()
    const { container } = customRender(
      <ConfigProvider table={{ rowKey: 'id' }}>
        <Table columns={columns} dataSource={rows} rowSelection={{ onChange }} pagination={false} />
      </ConfigProvider>,
    )
    const checkbox = container.querySelector<HTMLInputElement>('.dg-cell-body .dg-selection-input')
    expect(checkbox).toBeTruthy()
    fireEvent.click(checkbox!)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]?.[0]).toEqual(['666'])
  })

  // antd L320（规约源 6.5.2 `Table.test.tsx:320`；裁判 = 已安装 antd **6.4.4**）：
  // `rowKey` prop 优先于 `ConfigProvider table={{ rowKey }}`。
  // 双臂实测 `B3.dg.propWinsCtx = ["Foobar"]` ↔ `B3.ref.propWinsCtx = ["Foobar"]` ⇒ 同值。
  it('prefer rowKey prop over global rowKey config', () => {
    const rows = [{ id: '666', key: 'foobar', name: 'Foobar' }]
    const columns: TableProps<any>['columns'] = [{ title: 'Name', dataIndex: 'name', key: 'name' }]

    // 非空对照：同一棵树里先量"只有上下文"那一档 ⇒ 证明下面的 'Foobar' 是 **props 赢了**，
    // 不是"上下文根本没生效"或"恒回退 'key'"（三档取值互不相同：'foobar' / '666' / 'Foobar'）。
    const ctxOnlyOnChange = vi.fn()
    const ctxOnly = customRender(
      <ConfigProvider table={{ rowKey: 'id' }}>
        <Table
          columns={columns}
          dataSource={rows}
          rowSelection={{ onChange: ctxOnlyOnChange }}
          pagination={false}
        />
      </ConfigProvider>,
    )
    const ctxOnlyCheckbox = ctxOnly.container.querySelector<HTMLInputElement>('.dg-cell-body .dg-selection-input')
    expect(ctxOnlyCheckbox).toBeTruthy()
    fireEvent.click(ctxOnlyCheckbox!)
    expect(ctxOnlyOnChange.mock.calls[0]?.[0]).toEqual(['666'])

    // 主断言：再加 `rowKey="name"` ⇒ props 覆盖上下文。
    const onChange = vi.fn()
    const { container } = customRender(
      <ConfigProvider table={{ rowKey: 'id' }}>
        <Table
          columns={columns}
          dataSource={rows}
          rowKey="name"
          rowSelection={{ onChange }}
          pagination={false}
        />
      </ConfigProvider>,
    )
    const checkbox = container.querySelector<HTMLInputElement>('.dg-cell-body .dg-selection-input')
    expect(checkbox).toBeTruthy()
    fireEvent.click(checkbox!)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]?.[0]).toEqual(['Foobar'])
  })

  // ── 本仓独有缺陷钉子（taskId `fix-real-bugs`／步骤 86；react-doctor `jsx-key` error ×2）──────
  // 症状：用户 `onRow` 返回的对象里带 `key` 时，会**覆写**引擎写在格子上的 React key。
  // 落点（实读）：multi 路径的引擎 key 是 src/table/engine/BodyGrid.tsx:165 的 `standardCellKey`，
  //   flat 路径的引擎 key 是 src/table/engine/FlatColumnCells.tsx:460 的 `getRowKey`；
  //   用户行级 props 袋（`omitKey`）在 src/table/engine/BodyGrid.tsx:238 与
  //   src/table/engine/FlatColumnCells.tsx:519 展开，JSX 后置属性赢 ⇒ 引擎 key 消失。
  // 修法：行级袋不再装 `key`，剔除集 = `className` / `style` / `key`，见 src/table/engine/bodyCellUtils.ts:45；
  //   JSX 属性顺序**不动**，因为 oxlint 的 `react/jsx-key` 要求 "key" prop must be placed before any
  //   `{...spread}`（实测：在已剔 key 的袋上再把 key 挪到袋之后，react-doctor 的 2 条 jsx-key 消失、
  //   oxlint 反手新产 2 条 warning ⇒ 两工具的顺序要求互斥；读数 tmp/86-evidence-oxlint-AplusB-keyafter.log
  //   与 tmp/86-doctor-keyafter/，账本 tmp/vortex-logs/fix-real-bugs/86-implementer-jsxkey.md 第 2.2 节）。
  // 裁判侧形状（实读 `@rc-component/table@1.10.2/es/body/BodyRow.js`）：onRow 返回值只 spread 到该行
  //   **唯一一个** `<tr>`（`:124`），格子 key 走 `getCellProps().key`（`:146`）；本仓 grid 无 `<tr>`，
  //   行级 key 没有合法落点 ⇒ 「行级 key 广播到该行 N 个格子」是本仓自家产物，
  //   不属于「与 antd 不一致但功能正常」。
  // 取证口径＝fiber 读数（见上方 readFiberKey 注释）；React 元素 key 不落 DOM，属性断言测不到。
  it('keeps the engine cell key when onRow returns a key (flat body path)', () => {
    const rows = [
      { id: 'a', name: 'Alice', code: 1 },
      { id: 'b', name: 'Bob', code: 2 },
      { id: 'c', name: 'Cary', code: 3 },
    ]
    const columns: TableProps<any>['columns'] = [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Code', dataIndex: 'code', key: 'code' },
    ]
    // `key` 不在公开返回类型 `React.HTMLAttributes` 上（`src/table/publicTypes.ts:680`）
    //   ⇒ 只有 JS 用户 / 断言用户会写出来；用 `as never` 复刻同形返回值。
    const onRowControl = () => ({ 'data-user-row': 'injected' }) as never
    const onRowWithKey = () => ({ 'data-user-row': 'injected', key: USER_CELL_KEY }) as never

    const control = customRender(
      <Table rowKey="id" columns={columns} dataSource={rows} onRow={onRowControl} pagination={false} />,
    )
    const exp = customRender(
      <Table rowKey="id" columns={columns} dataSource={rows} onRow={onRowWithKey} pagination={false} />,
    )

    const controlCells = Array.from(control.container.querySelectorAll('.dg-cell-body'))
    const expCells = Array.from(exp.container.querySelectorAll('.dg-cell-body'))
    // 非空对照：3 行 × 2 列 = 6 格在场（否则"没覆写"可能只是因为"没渲染"）。
    expect(controlCells).toHaveLength(6)
    expect(expCells).toHaveLength(6)
    // 路径见证：格子祖先链里有 `ColumnCells` ⇒ 这条用例量的确实是 flat 表体路径。
    expect(fiberAncestorNames(controlCells[0]!)).toContain('ColumnCells')

    // 引擎值（实读 `src/table/engine/FlatColumnCells.tsx:460` = `getRowKey(record,rowKey) ?? index`；
    // DOM 按行优先输出 ⇒ 每行的两列共享同一行键，列间靠父层 `ColumnCells` 的 key 区分）。
    const engineKeys = ['a', 'a', 'b', 'b', 'c', 'c']
    expect(controlCells.map(readFiberKey)).toEqual(engineKeys)

    // 主断言：用户 onRow 加 `key` 后，格子的 React key 逐位等于引擎值/等于对照组 ⇒ 未被覆写。
    expect(expCells.map(readFiberKey)).toEqual(engineKeys)
    expect(expCells.map(readFiberKey)).not.toContain(USER_CELL_KEY)

    // 修法边界：只让 React 元素身份归引擎，用户其余字段照旧上到每个格子（防"整包丢弃"式修法）。
    expect(expCells.every((cell) => cell.getAttribute('data-user-row') === 'injected')).toBe(true)
  })

  it('keeps the engine cell key when onRow returns a key (multi body path)', () => {
    const rows = [
      { id: 'a', name: 'Alice', code: 1 },
      { id: 'b', name: 'Bob', code: 2 },
      { id: 'c', name: 'Cary', code: 3 },
    ]
    // 分组表头 ⇒ maxDepth>1 ⇒ mode='multi'（`src/table/engine/GridTable.tsx:287`），表体走 BodyGrid。
    const columns: TableProps<any>['columns'] = [
      {
        title: 'Group',
        key: 'group',
        children: [
          { title: 'Name', dataIndex: 'name', key: 'name' },
          { title: 'Code', dataIndex: 'code', key: 'code' },
        ],
      },
    ]
    const onRowControl = () => ({ 'data-user-row': 'injected' }) as never
    const onRowWithKey = () => ({ 'data-user-row': 'injected', key: USER_CELL_KEY }) as never

    const control = customRender(
      <Table rowKey="id" columns={columns} dataSource={rows} onRow={onRowControl} pagination={false} />,
    )
    const exp = customRender(
      <Table rowKey="id" columns={columns} dataSource={rows} onRow={onRowWithKey} pagination={false} />,
    )

    const controlCells = Array.from(control.container.querySelectorAll('.dg-cell-body'))
    const expCells = Array.from(exp.container.querySelectorAll('.dg-cell-body'))
    expect(controlCells).toHaveLength(6)
    expect(expCells).toHaveLength(6)
    // 路径见证：格子祖先链里有 `BodyCell` ⇒ 量的确实是 multi 表体路径（与 flat 那条互不冒充）。
    expect(fiberAncestorNames(controlCells[0]!)).toContain('BodyCell')

    // 引擎值（实读 `src/table/engine/BodyGrid.tsx:165` = `standardCellKey`，
    // 由 `resolveStandardBodyCellKey` 产出 `b-{列序}-{行键}`，见
    // `src/table/engine/recyclingIdentity.ts:17` 的 `resolveStandardBodyRowKey`）。
    const engineKeys = ['b-0-a', 'b-1-a', 'b-0-b', 'b-1-b', 'b-0-c', 'b-1-c']
    expect(controlCells.map(readFiberKey)).toEqual(engineKeys)

    expect(expCells.map(readFiberKey)).toEqual(engineKeys)
    expect(expCells.map(readFiberKey)).not.toContain(USER_CELL_KEY)

    expect(expCells.every((cell) => cell.getAttribute('data-user-row') === 'injected')).toBe(true)
  })

  // ── 本仓独有缺陷钉子（taskId `fix-real-bugs`／步骤 92：表头通道的 `key` 注入）────────────
  // 症状：用户 `onHeaderRow` 返回值里的 `key` 落到该表头行**每一个**表头格的 React key 上。
  // 落点（实读）：表头走的是**独立于表体**的一条通道 `mergeHeaderEventProps`
  //   （src/table/engine/headerCellUtils.ts:87 的剔除集行，此前只有 className/style），
  //   消费者两处：`HeaderCell.tsx:402` 与 `FlatColumnCells.tsx:360`，两处都是
  //   `{...omitKey(omitKey(headerEventProps, 'onClick'), 'onKeyDown')}` 这句 spread。
  //   表头格根 div **本来就没有**引擎 key（HeaderCell.tsx:234 / FlatColumnCells.tsx:253 的 `dg-cell-header` div），
  //   表头格的组件身份在**父层**（实读 GridTable.tsx:651 的 `<HeaderCell key={`h-${cell.key}`}>`、
  //   GridTable.tsx:821+870 的 `<ColumnCells key={`h-${column.key}`}>`）⇒ 用户 key 在这一层是**注入**、
  //   不是覆写（与步骤 86 的表体条机制不同，见下）。
  // 改前实测（探针 tmp/92-probe/header-key-detail.probe.test.tsx，改前读数 tmp/92-probe-detail-before.log）：
  //   flat  2 格 div fiber key = ["boom-header-key","boom-header-key"]（对照恒 "<undefined>"）
  //   multi 3 格 div fiber key 全塌成同一个串；父层组件 key 两组一致（h-name/h-code、h-g.name/h-g.code/h-g）
  //     ⇒ 组件身份未被摧毁（工单 §2 的停手条件不触发）；但用户 key 随渲染变化时该行表头格 DOM
  //     节点会被销毁重建（`sameNode=false`，稳定 key / 不传 onHeaderRow 两条对照臂均 `sameNode=true`）
  //     ＋ React 19 dev 告警 `A props object containing a "key" prop is being spread into JSX`。
  // 修法：行级袋不再装 `key`（剔除集 = className / style / key），与表体通道
  //   src/table/engine/bodyCellUtils.ts:46 同形；JSX 属性顺序**不动**（表头格根节点无引擎 key 可保，
  //   且步骤 86 已实测两个静态器对顺序的要求互斥，见 86 报告 §2.2）。
  // 裁判侧形状（实读 `@rc-component/table@1.10.2` 的 `es/Header/HeaderRow.js`）：`onHeaderRow` 返回值只
  //   spread 到该表头行**唯一一个** `<tr>`（`:28`），表头格 key 走 `:46` 的 `columnsKey[cellIndex]`（`:40` 消费）；
  //   本仓 grid 无 `<tr>` ⇒ 「行级 key 广播到该行 N 个表头格」是本仓自家产物。
  // 取证口径＝fiber 读数（见上方 readFiberKey 注释）；React 元素 key 不落 DOM，属性断言测不到。
  // ⚠️ 本块必须留在文件**末尾**：本文件含 expectSnapshot/mountTest，`__snapshots__/Table.test.tsx.snap`
  //   里存了 cssinjs 的 `css-var-_r_N_` 类名，N 随同文件 `<Table>` 挂载次数漂移（工单 §5）。
  const USER_HEADER_KEY = 'boom-header-key'

  /** 读格子的**父层组件元素** key（表头格的真实身份载体：`h-<colKey>`）。见块首注释。 */
  const readParentComponentKey = (el: Element): string => {
    const names = Object.getOwnPropertyNames(el).concat(Object.keys(el))
    const fiberProp = names.find((name) => name.startsWith('__reactFiber$'))
    if (!fiberProp) return '<no-fiber>'
    let cur = (el as unknown as Record<string, any>)[fiberProp]
    for (let depth = 0; cur && depth < 8; depth += 1) {
      cur = cur.return
      if (cur && typeof cur.type === 'function') {
        return cur.key === null || cur.key === undefined ? '<undefined>' : String(cur.key)
      }
    }
    return '<none>'
  }

  it('keeps the engine header cell key when onHeaderRow returns a key (flat header path)', () => {
    const rows = [
      { id: 'a', name: 'Alice', code: 1 },
      { id: 'b', name: 'Bob', code: 2 },
    ]
    const columns: TableProps<any>['columns'] = [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Code', dataIndex: 'code', key: 'code' },
    ]
    // `key` 不在公开返回类型 `React.HTMLAttributes` 上（`src/table/publicTypes.ts:638`）
    //   ⇒ 只有 JS 用户 / 断言用户会写出来；用 `as never` 复刻同形返回值（同文件既有风格）。
    const onHeaderRowControl = () => ({ 'data-user-row': 'injected' }) as never
    const onHeaderRowWithKey = () =>
      ({ 'data-user-row': 'injected', key: USER_HEADER_KEY }) as never

    const control = customRender(
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        onHeaderRow={onHeaderRowControl}
        pagination={false}
      />,
    )
    const exp = customRender(
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        onHeaderRow={onHeaderRowWithKey}
        pagination={false}
      />,
    )

    const controlCells = Array.from(control.container.querySelectorAll('.dg-cell-header'))
    const expCells = Array.from(exp.container.querySelectorAll('.dg-cell-header'))
    // 非空对照：2 个表头格在场（否则"没注入"可能只是因为"没渲染"）。
    expect(controlCells).toHaveLength(2)
    expect(expCells).toHaveLength(2)
    // 路径见证：格子祖先链里有 `ColumnCells` ⇒ 这条用例量的确实是 flat 表头路径。
    expect(fiberAncestorNames(controlCells[0]!)).toContain('ColumnCells')

    // 引擎值：表头格根 div **无引擎 key**（实读 `FlatColumnCells.tsx:280` 的 `<div>` 属性表），
    //   身份在父层 `<ColumnCells key={`h-${column.key}`}>`（`GridTable.tsx:821` + keyPrefix='h' 见 `:870`）。
    const controlKeys = controlCells.map(readFiberKey)
    expect(controlKeys).toEqual(['<undefined>', '<undefined>'])
    // 身份归属的正面读数：父层组件 key 仍是引擎写的 `h-<colKey>`（未被用户字段接管）。
    expect(controlCells.map(readParentComponentKey)).toEqual(['h-name', 'h-code'])

    // 主断言：用户 onHeaderRow 加 `key` 后，表头格的 React key 逐位等于对照组/引擎值 ⇒ 未被注入。
    expect(expCells.map(readFiberKey)).toEqual(controlKeys)
    expect(expCells.map(readFiberKey)).not.toContain(USER_HEADER_KEY)
    // 父层身份仍由引擎独占。
    expect(expCells.map(readParentComponentKey)).toEqual(['h-name', 'h-code'])

    // 修法边界：只让 React 元素身份不进袋，用户其余字段照旧上到每个表头格（防"整包丢弃"式修法）。
    expect(expCells.every((cell) => cell.getAttribute('data-user-row') === 'injected')).toBe(true)
  })

  it('keeps the engine header cell key when onHeaderRow returns a key (multi header path)', () => {
    const rows = [
      { id: 'a', name: 'Alice', code: 1 },
      { id: 'b', name: 'Bob', code: 2 },
    ]
    // 分组表头 ⇒ maxDepth>1 ⇒ mode='multi'（`src/table/engine/GridTable.tsx:287`），表头走 HeaderGrid + HeaderCell。
    const columns: TableProps<any>['columns'] = [
      {
        title: 'Group',
        key: 'g',
        children: [
          { title: 'Name', dataIndex: 'name', key: 'name' },
          { title: 'Code', dataIndex: 'code', key: 'code' },
        ],
      },
    ]
    const onHeaderRowControl = () => ({ 'data-user-row': 'injected' }) as never
    const onHeaderRowWithKey = () =>
      ({ 'data-user-row': 'injected', key: USER_HEADER_KEY }) as never

    const control = customRender(
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        onHeaderRow={onHeaderRowControl}
        pagination={false}
      />,
    )
    const exp = customRender(
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        onHeaderRow={onHeaderRowWithKey}
        pagination={false}
      />,
    )

    const controlCells = Array.from(control.container.querySelectorAll('.dg-cell-header'))
    const expCells = Array.from(exp.container.querySelectorAll('.dg-cell-header'))
    // 非空对照：1 个分组格 + 2 个叶子格 = 3 个表头格在场。
    expect(controlCells).toHaveLength(3)
    expect(expCells).toHaveLength(3)
    // 路径见证：格子祖先链里有 `HeaderCell` ⇒ 量的确实是 multi 表头路径（与 flat 那条互不冒充）。
    expect(fiberAncestorNames(controlCells[0]!)).toContain('HeaderCell')

    const controlKeys = controlCells.map(readFiberKey)
    expect(controlKeys).toEqual(['<undefined>', '<undefined>', '<undefined>'])
    // 父层 `<HeaderCell key={`h-${cell.key}`}>`（`GridTable.tsx:651`）：分组格 h-g、叶子格 h-g.name / h-g.code。
    expect(controlCells.map(readParentComponentKey)).toEqual(['h-g.name', 'h-g.code', 'h-g'])

    expect(expCells.map(readFiberKey)).toEqual(controlKeys)
    expect(expCells.map(readFiberKey)).not.toContain(USER_HEADER_KEY)
    expect(expCells.map(readParentComponentKey)).toEqual(['h-g.name', 'h-g.code', 'h-g'])

    expect(expCells.every((cell) => cell.getAttribute('data-user-row') === 'injected')).toBe(true)
  })

  it('keeps the header cell DOM node when onHeaderRow returns a key that changes (both header paths)', () => {
    // 改前实测读数（tmp/92-probe-detail-before.log 的 churn 三臂）：用户 `key` 随渲染变化 ⇒
    //   该表头行全部表头格 DOM 节点被销毁重建（`sameNode=false`，挂的标记丢失）；
    //   稳定 key / 不传 onHeaderRow 两条对照臂均 `sameNode=true`（`churn-*-STABLE` / `churn-*-NONE`）。
    // 改后同三臂全 `sameNode=true`（tmp/92-probe-detail-after.log）⇒ 钉的是"身份不再被用户字段绑架"。
    const cases: Array<[string, TableProps<any>['columns']]> = [
      [
        'flat',
        [
          { title: 'Name', dataIndex: 'name', key: 'name' },
          { title: 'Code', dataIndex: 'code', key: 'code' },
        ],
      ],
      [
        'multi',
        [
          {
            title: 'Group',
            key: 'g',
            children: [
              { title: 'Name', dataIndex: 'name', key: 'name' },
              { title: 'Code', dataIndex: 'code', key: 'code' },
            ],
          },
        ],
      ],
    ]
    for (const [label, columns] of cases) {
      const rows = [
        { id: 'a', name: 'Alice', code: 1 },
        { id: 'b', name: 'Bob', code: 2 },
      ]
      const view = (userKey: string) => (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          onHeaderRow={(() => ({ key: userKey })) as never}
          pagination={false}
        />
      )
      const { rerender, container } = customRender(view('user-key-1'))
      const first = container.querySelector('.dg-cell-header')!
      ;(first as unknown as Record<string, unknown>).__nodeMark = 'alive'
      rerender(view('user-key-2'))
      const after = container.querySelector('.dg-cell-header')!
      // 非空对照：表头格在场（否则"节点存活"可能只是因为"没渲染"）。
      expect(container.querySelectorAll('.dg-cell-header').length, label).toBeGreaterThan(0)
      expect(after === first, `${label}: 表头格节点被销毁重建`).toBe(true)
      expect(
        (after as unknown as Record<string, unknown>).__nodeMark,
        `${label}: 节点被换掉了`,
      ).toBe('alive')
    }
  })
})

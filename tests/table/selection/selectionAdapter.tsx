import { fireEvent, render, screen } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Key } from 'react'
import { useRowSelection } from '../../../src/table/engine/useRowSelection'
import { buildSelectionColumnNode } from '../../../src/table/selectionAdapter'
import type {
  RowSelectMethod,
  TableLocale,
  TableRowSelection,
} from '../../../src/table/types'

interface Rec {
  key: string
  name: string
  disabled?: boolean
}

const data: Array<Rec> = [
  { key: 'a', name: 'Alice' },
  { key: 'b', name: 'Bob', disabled: true },
  { key: 'c', name: 'Carol' },
  { key: 'd', name: 'Dan' },
]

const locale = {
  selectionAll: 'Select all',
  selectInvert: 'Invert selection',
  selectNone: 'Clear selection',
} as TableLocale

function renderSelection(
  rowSelection: TableRowSelection<Rec>,
  selectedRowKeys: Array<Key> = [],
) {
  return renderHook(() =>
    useRowSelection<Rec>({
      type: rowSelection.type,
      selectedRowKeys,
      dataSource: data,
      rowKey: 'key',
      getCheckboxProps: rowSelection.getCheckboxProps,
      selections: rowSelection.selections,
    }),
  ).result.current
}

function buildColumn(
  rowSelection: TableRowSelection<Rec>,
  selectedRowKeys: Array<Key> = [],
  fireSelectionChange = vi.fn(),
  selectionAnchorKey: Key | null = null,
  setSelectionAnchorKey = vi.fn(),
) {
  return {
    column: buildSelectionColumnNode<Rec>(
      rowSelection,
      renderSelection(rowSelection, selectedRowKeys),
      fireSelectionChange as (
        nextKeys: Array<Key>,
        method: RowSelectMethod,
        trigger?: { record?: Rec; nativeEvent?: Event },
      ) => void,
      'key',
      locale,
      selectionAnchorKey,
      setSelectionAnchorKey,
    ),
    fireSelectionChange,
    setSelectionAnchorKey,
  }
}

describe('selectionAdapter buildSelectionColumnNode', () => {
  it('renders columnTitle around the title checkbox and applies getTitleCheckboxProps', () => {
    const { column, fireSelectionChange } = buildColumn({
      columnTitle: (checkboxNode) => (
        <span>
          Pick
          {checkboxNode}
        </span>
      ),
      getTitleCheckboxProps: () => ({
        disabled: true,
        name: 'bulk',
        'aria-label': 'bulk disabled',
      }),
    })

    render(<>{column.title}</>)

    expect(screen.getByText('Pick')).toBeInTheDocument()
    const checkbox = screen.getByRole('checkbox', { name: 'bulk disabled' })
    expect(checkbox).toBeDisabled()
    expect(checkbox).toHaveAttribute('name', 'bulk')

    fireEvent.click(checkbox)
    expect(fireSelectionChange).not.toHaveBeenCalled()
  })

  it('merges rowSelection.onCell with renderCell props and fires row selection changes from the default node', () => {
    // `TableRowSelection['renderCell']` 是**可选**字段，其类型含 `undefined`；直接拿它当
    // `vi.fn` 的类型实参会撞上 `Constructable | Procedure` 约束（TS2344），产出的
    // `Mock<T | undefined>` 也不是可调用类型、传不进 `buildColumn`（TS2322）。
    // 取 `NonNullable<...>` 才是这个 mock 真正要表达的签名；只改类型实参，行为与实现逐字不变。
    const renderCell = vi.fn<NonNullable<TableRowSelection<Rec>['renderCell']>>(
      (_checked, record, index, node) => ({
        props: {
          colSpan: 1,
          rowSpan: index + 1,
          title: `render-${record.key}`,
        },
        children: <span data-testid={`wrapped-${record.key}`}>{node}</span>,
      }),
    )
    const { column, fireSelectionChange } = buildColumn({
      getCheckboxProps: (record) => ({ name: `select-${record.key}` }),
      onCell: (record, index) => ({
        className: `base-${record.key}`,
        rowSpan: 5,
        marker: index,
      }),
      renderCell,
    })

    expect(column.onCell?.(data[0], 0)).toEqual({
      className: 'base-a',
      marker: 0,
      colSpan: 1,
      rowSpan: 1,
      title: 'render-a',
    })

    render(<>{column.render?.(undefined, data[0], 0)}</>)

    expect(screen.getByTestId('wrapped-a')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'select-a' }))

    expect(fireSelectionChange).toHaveBeenCalledTimes(1)
    expect(fireSelectionChange.mock.calls[0][0]).toEqual(['a'])
    expect(fireSelectionChange.mock.calls[0][1]).toBe('single')
    expect(fireSelectionChange.mock.calls[0][2]).toMatchObject({ record: data[0] })
    expect(fireSelectionChange.mock.calls[0][2]?.nativeEvent).toBeInstanceOf(Event)
  })

  it('renders disabled row checkbox from getCheckboxProps and ignores row changes', () => {
    const { column, fireSelectionChange } = buildColumn({
      getCheckboxProps: (record) => ({
        disabled: record.disabled,
        name: `select-${record.key}`,
      }),
    })

    render(<>{column.render?.(undefined, data[1], 1)}</>)

    const checkbox = screen.getByRole('checkbox', { name: 'select-b' })
    expect(checkbox).toBeDisabled()
    fireEvent.click(checkbox)
    expect(fireSelectionChange).not.toHaveBeenCalled()
  })

  // 步骤 80 改判据后重定基（旧标题「uses selectionAnchorKey for shift range」钉的是**锚点存在维**，
  // 那是修前的分叉判据；现判据＝参照的「已有选中项」维，见 `isCheckboxRangeSelect` 的注释）。
  // 本条的形状是「锚点在（'a'）＋选中集非空（['a']）」——两代判据都为真 ⇒ 它**不**区分二者，
  // 区分作用由下面那条（锚点为 null）与 features 层的三条新钉承担。
  it('ranges from selectionAnchorKey and reports method=multiple when something is already selected', () => {
    const setSelectionAnchorKey = vi.fn()
    const { column, fireSelectionChange } = buildColumn(
      {
        getCheckboxProps: (record) => ({
          disabled: record.disabled,
          name: `select-${record.key}`,
        }),
      },
      ['a'],
      vi.fn(),
      'a',
      setSelectionAnchorKey,
    )

    render(<>{column.render?.(undefined, data[2], 2)}</>)
    fireEvent.click(screen.getByRole('checkbox', { name: 'select-c' }), {
      shiftKey: true,
    })

    expect(fireSelectionChange).toHaveBeenCalledTimes(1)
    expect(fireSelectionChange.mock.calls[0][0]).toEqual(['a', 'c'])
    expect(fireSelectionChange.mock.calls[0][1]).toBe('multiple')
    expect(fireSelectionChange.mock.calls[0][2]).toMatchObject({ record: data[2] })
    expect(setSelectionAnchorKey).toHaveBeenCalledWith('c')
  })

  // 步骤 80 / 缺陷 1 的白盒格（双臂探针 A1 的最小对应物）：
  // 批量操作把锚点清成 null 之后，**已有选中项**仍在 ⇒ 判据必须仍走区间支（method 'multiple'），
  // 而区间因缺起点**退化成一个点**（照抄 antd `useMultipleSelect.js:9` 的
  // `prevSelectedIndex ?? currentSelectedIndex`）⇒ 键集只动被点行。
  // 修前读数：method 'single' ⇒ `useSelectionAdapter.ts` 的 `onSelectMultiple` 分支永不进（探针 A1：dg 0 次 / antd 1 次）。
  it('still reports method=multiple with a degenerate range when the anchor was cleared', () => {
    const setSelectionAnchorKey = vi.fn()
    const { column, fireSelectionChange } = buildColumn(
      {
        getCheckboxProps: (record) => ({
          disabled: record.disabled,
          name: `select-${record.key}`,
        }),
      },
      ['a', 'c'],
      vi.fn(),
      null,
      setSelectionAnchorKey,
    )

    render(<>{column.render?.(undefined, data[3], 3)}</>)
    fireEvent.click(screen.getByRole('checkbox', { name: 'select-d' }), {
      shiftKey: true,
    })

    expect(fireSelectionChange).toHaveBeenCalledTimes(1)
    // 区间退化 ⇒ 只把 'd' 加进已有选中集（**不是**从 anchor 拉的整段）
    expect(fireSelectionChange.mock.calls[0][0]).toEqual(['a', 'c', 'd'])
    expect(fireSelectionChange.mock.calls[0][1]).toBe('multiple')
    expect(setSelectionAnchorKey).toHaveBeenCalledWith('d')
  })

  // 步骤 83 补钉（步骤 82 反证 M3 暴露的覆盖面缺口）：`src/table/selectionAdapter.tsx:263` 的
  //   `?? 32` 是「**脱离 token 通道**时的兜底」。渲染路径的缺省宽度由 `useSelectionAdapter` 从主题
  //   token 注入（步骤 82 的修复）⇒ 黑盒层任何档位都拿不到这一支，M3 把 32 改成 40 时全仓不红。
  //   只有像本件这样白盒直调 `buildSelectionColumnNode`（不经该 hook、无 ConfigProvider）才可达。
  //   对照组钉「调用方显式值原样透传」⇒ 排除「该函数把宽度写死」的另一种实现（否则本条恒真）。
  it('falls back to width 32 when neither rowSelection.columnWidth nor the token channel gives one', () => {
    expect(buildColumn({}).column.width).toBe(32)
    // radio 与 checkbox 共用同一条兜底表达式（type 不参与宽度判据）。
    expect(buildColumn({ type: 'radio' }).column.width).toBe(32)
    // 对照组：显式数字／字符串宽度不经兜底。
    expect(buildColumn({ columnWidth: 50 }).column.width).toBe(50)
    expect(buildColumn({ columnWidth: '4rem' }).column.width).toBe('4rem')
  })
})

// 29-E / Y-4：disabled 守卫是 render() 返回元素上的 `props.onChange` 闭包
// （src/table/selectionAdapter.tsx 三处 `if (disabled …) return`）。
// 上条 `fireEvent.click(disabled checkbox)` 测的是 **jsdom 的 disabled 不派发**（P-094），
// 摘掉守卫也不会红 → 它**不是守卫的门**。本 describe 走 **白盒直接调用** `props.onChange`：
// 该调用绕过 jsdom 事件派发，真正执行守卫函数体 → 摘掉守卫即红（活门自证见批次日志）。
// 覆盖两条**独立**渲染分支的守卫站点：默认分支 `:469` 与 renderCell 透传 node 分支 `:416`。
interface GuardElement {
  props: {
    disabled?: boolean
    onChange: (checked: boolean, event: unknown) => void
  }
}
function guardedElement(
  column: { render?: (t: unknown, r: Rec, i: number) => unknown },
  record: Rec,
  index: number,
): GuardElement {
  return column.render?.(undefined, record, index) as GuardElement
}

describe('selectionAdapter disabled 守卫（白盒直接调用 props.onChange，29-E/Y-4）', () => {
  it('默认分支：disabled 行直接调 props.onChange → fireSelectionChange 0 次', () => {
    const { column, fireSelectionChange } = buildColumn({
      getCheckboxProps: (record) => ({ disabled: record.disabled }),
    })
    const el = guardedElement(column, data[1] /* key='b', disabled:true */, 1)
    expect(el.props.disabled).toBe(true)
    el.props.onChange(true, {})
    expect(fireSelectionChange).not.toHaveBeenCalled()
  })

  it('默认分支对照组：enabled 行直接调 props.onChange → fireSelectionChange 1 次（防永真）', () => {
    const { column, fireSelectionChange } = buildColumn({
      getCheckboxProps: (record) => ({ disabled: record.disabled }),
    })
    const el = guardedElement(column, data[0] /* key='a', enabled */, 0)
    expect(el.props.disabled).toBe(false)
    el.props.onChange(true, {})
    expect(fireSelectionChange).toHaveBeenCalledTimes(1)
    expect(fireSelectionChange.mock.calls[0][0]).toEqual(['a'])
  })

  it('renderCell 透传 node 分支：disabled 行直接调 node.props.onChange → 0 次；对照组 enabled → 1 次', () => {
    const { column, fireSelectionChange } = buildColumn({
      getCheckboxProps: (record) => ({ disabled: record.disabled }),
      renderCell: (_checked, _record, _index, node) => node,
    })
    const disabledEl = guardedElement(column, data[1], 1) as GuardElement
    expect(disabledEl.props.disabled).toBe(true)
    disabledEl.props.onChange(true, {})
    expect(fireSelectionChange).not.toHaveBeenCalled()

    const enabledEl = guardedElement(column, data[0], 0) as GuardElement
    expect(enabledEl.props.disabled).toBe(false)
    enabledEl.props.onChange(true, {})
    expect(fireSelectionChange).toHaveBeenCalledTimes(1)
    expect(fireSelectionChange.mock.calls[0][0]).toEqual(['a'])
  })
})

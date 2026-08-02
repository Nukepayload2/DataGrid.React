import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigProvider } from 'antd'
import { describe, expect, it, vi } from 'vitest'
import type { Key } from 'react'
import { Table, type ColumnType, type TableProps, type TableRowSelection } from '../../../src/table/index'

if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 1
    }
  }

  ;(window as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill
  ;(globalThis as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill
}

interface Person {
  key: string
  name: string
  age: number
}

const data: Array<Person> = [
  { key: 'bob', name: 'Bob', age: 32 },
  { key: 'alice', name: 'Alice', age: 28 },
]

const baseColumns: Array<ColumnType<Person>> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
]

function expectVisibleTextOrder(labels: Array<string>): void {
  const text = document.body.textContent ?? ''
  const positions = labels.map((label) => text.indexOf(label))

  expect(positions.every((position) => position >= 0)).toBe(true)
  expect(positions).toEqual([...positions].sort((a, b) => a - b))
}

function setElementWidth(element: Element, width: number): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 20,
    left: 0,
    right: width,
    top: 0,
    bottom: 20,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
}

function pointer(type: string, clientX: number, pointerId = 7): PointerEvent {
  return new PointerEvent(type, {
    pointerId,
    clientX,
    bubbles: true,
    cancelable: true,
    button: 0,
  })
}

describe('Table public API behavior', () => {
  it('uses column gridColumnOptions minWidth/maxWidth for layout and resize clamps', async () => {
    const columns: Array<ColumnType<Person>> = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        gridColumnOptions: { minWidth: 80, maxWidth: 120 },
      },
      { title: 'Age', dataIndex: 'age', key: 'age', width: 96 },
    ]

    const { container } = render(
      <Table<Person>
        columns={columns}
        dataSource={data}
        pagination={false}
        tableLayout="auto"
        gridOptions={{ columnResizeMode: 'ResizeLeft' }}
      />,
    )

    const grid = container.querySelector('.dg-grid') as HTMLElement
    expect(grid.style.gridTemplateColumns).toBe('minmax(80px, 120px) minmax(96px, max-content)')

    const nameHeader = container.querySelector(
      '.dg-cell-header[data-column-key="name"]',
    ) as HTMLElement
    setElementWidth(nameHeader, 100)
    const resizer = screen.getAllByRole('separator', { name: 'Resize column' })[0]!

    act(() => {
      fireEvent(resizer, pointer('pointerdown', 100))
      resizer.dispatchEvent(pointer('pointermove', 240))
      resizer.dispatchEvent(pointer('pointerup', 240))
    })

    await waitFor(() => {
      expect(grid.style.gridTemplateColumns).toBe('120px minmax(96px, max-content)')
    })
  })

  it('sorts visible rows and reports sort change data', async () => {
    type OnChange = NonNullable<TableProps<Person>['onChange']>
    const changes: Array<Parameters<OnChange>> = []
    const user = userEvent.setup()
    const columns: Array<ColumnType<Person>> = [
      baseColumns[0]!,
      {
        ...baseColumns[1]!,
        sorter: (a, b) => a.age - b.age,
      },
    ]

    render(
      <Table<Person>
        columns={columns}
        dataSource={data}
        pagination={false}
        onChange={(...args) => {
          changes.push(args)
        }}
      />,
    )

    expectVisibleTextOrder(['Bob', 'Alice'])

    await user.click(screen.getByText('Age'))

    await waitFor(() => {
      expectVisibleTextOrder(['Alice', 'Bob'])
    })
    expect(changes).toHaveLength(1)
    expect(changes[0]![3].action).toBe('sort')
    expect(changes[0]![3].currentDataSource.map((row) => row.name)).toEqual([
      'Alice',
      'Bob',
    ])
  })

  it('paginates rows and reports pagination changes', async () => {
    type OnChange = NonNullable<TableProps<Person>['onChange']>
    const changes: Array<Parameters<OnChange>> = []
    const user = userEvent.setup()

    render(
      <Table<Person>
        columns={baseColumns}
        dataSource={data}
        pagination={{ pageSize: 1 }}
        onChange={(...args) => {
          changes.push(args)
        }}
      />,
    )

    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()

    await user.click(screen.getByRole('listitem', { name: '2' }))

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
    expect(changes).toHaveLength(1)
    expect(changes[0]![0].current).toBe(2)
    expect(changes[0]![3].action).toBe('paginate')
  })

  it('uses locale.emptyText for empty data', () => {
    render(
      <Table<Person>
        columns={baseColumns}
        dataSource={[]}
        pagination={false}
        locale={{ emptyText: 'No people available' }}
      />,
    )

    expect(screen.getByText('No people available')).toBeInTheDocument()
  })

  it('uses ConfigProvider Table locale emptyText for empty data', () => {
    render(
      <ConfigProvider
        locale={{
          locale: 'en',
          Table: { emptyText: 'Provider locale empty' },
        }}
      >
        <Table<Person> columns={baseColumns} dataSource={[]} pagination={false} />
      </ConfigProvider>,
    )

    expect(screen.getByText('Provider locale empty')).toBeInTheDocument()
  })

  it('prefers Table locale.emptyText over ConfigProvider Table locale emptyText', () => {
    render(
      <ConfigProvider locale={{ locale: 'en', Table: { emptyText: 'Provider empty' } }}>
        <Table<Person>
          columns={baseColumns}
          dataSource={[]}
          pagination={false}
          locale={{ emptyText: 'Table empty' }}
        />
      </ConfigProvider>,
    )

    expect(screen.getByText('Table empty')).toBeInTheDocument()
    expect(screen.queryByText('Provider empty')).not.toBeInTheDocument()
  })

  it('uses ConfigProvider renderEmpty for empty data without locale.emptyText', () => {
    render(
      <ConfigProvider
        renderEmpty={(componentName) =>
          componentName === 'Table' ? <span>Configured empty table</span> : null
        }
      >
        <Table<Person> columns={baseColumns} dataSource={[]} pagination={false} />
      </ConfigProvider>,
    )

    expect(screen.getByText('Configured empty table')).toBeInTheDocument()
  })

  it('prefers locale.emptyText function over ConfigProvider renderEmpty', () => {
    render(
      <ConfigProvider renderEmpty={() => <span>Configured empty table</span>}>
        <Table<Person>
          columns={baseColumns}
          dataSource={[]}
          pagination={false}
          locale={{ emptyText: () => <span>Locale empty table</span> }}
        />
      </ConfigProvider>,
    )

    expect(screen.getByText('Locale empty table')).toBeInTheDocument()
    expect(screen.queryByText('Configured empty table')).not.toBeInTheDocument()
  })

  it('does not expose a spinner when loading is undefined and keeps content for loading false', () => {
    const { rerender } = render(
      <Table<Person>
        columns={baseColumns}
        dataSource={data}
        pagination={false}
        loading={undefined}
      />,
    )

    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    rerender(
      <Table<Person>
        columns={baseColumns}
        dataSource={data}
        pagination={false}
        loading={false}
      />,
    )

    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('honors loading object fields over default non-spinning state', () => {
    render(
      <Table<Person>
        columns={baseColumns}
        dataSource={data}
        pagination={false}
        loading={{ spinning: true, tip: 'Loading people' }}
      />,
    )

    const loadingTip = screen.getByText('Loading people')

    expect(loadingTip).toBeInTheDocument()
    expect(loadingTip.closest('[aria-busy="true"]')).not.toBeNull()
  })

  it('reports row selection changes through the public rowSelection API', async () => {
    type OnSelectionChange = NonNullable<TableRowSelection<Person>['onChange']>
    const selectionChanges: Array<Parameters<OnSelectionChange>> = []
    const user = userEvent.setup()

    render(
      <Table<Person>
        columns={baseColumns}
        dataSource={data}
        pagination={false}
        rowSelection={{
          getCheckboxProps: (record) => ({ name: record.name }),
          onChange: (...args) => {
            selectionChanges.push(args)
          },
        }}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Alice' }))

    await waitFor(() => {
      expect(selectionChanges).toHaveLength(1)
    })
    expect(selectionChanges[0]![0]).toEqual(['alice'])
    expect(selectionChanges[0]![1].map((row) => row.name)).toEqual(['Alice'])
    expect(selectionChanges[0]![2].type).toBe('single')
  })

  it('supports rowSelection columnTitle, getTitleCheckboxProps and onCell', () => {
    const selectionChanges: Array<Array<Key>> = []
    const CustomCell = (props: any) => {
      if (props.selectionCell) {
        return <span>select {props.record.name}</span>
      }
      return <span>{props.children}</span>
    }

    render(
      <Table<Person>
        columns={baseColumns}
        dataSource={data}
        pagination={false}
        components={{ body: { cell: CustomCell } }}
        rowSelection={{
          columnTitle: (checkboxNode) => (
            <span>
              Pick
              {checkboxNode}
            </span>
          ),
          getTitleCheckboxProps: () => ({
            disabled: true,
            'aria-label': 'select all blocked',
          }),
          onCell: (record) => ({ selectionCell: true, marker: record.key }),
          onChange: (keys) => {
            selectionChanges.push(keys)
          },
        }}
      />,
    )

    expect(screen.getByText('Pick')).toBeInTheDocument()
    expect(screen.getByText('select Bob')).toBeInTheDocument()
    expect(screen.getByText('select Alice')).toBeInTheDocument()

    const headerCheckbox = screen.getByRole('checkbox', { name: 'select all blocked' })
    expect(headerCheckbox).toBeDisabled()
    expect(selectionChanges).toHaveLength(0)
  })

  it('triggers rowSelection.onSelectMultiple from checkbox shift range selection', async () => {
    const onSelectMultiple: NonNullable<TableRowSelection<Person>['onSelectMultiple']> = vi.fn()
    const people = [
      ...data,
      { key: 'carol', name: 'Carol', age: 35 },
      { key: 'dan', name: 'Dan', age: 41 },
    ]

    render(
      <Table<Person>
        columns={baseColumns}
        dataSource={people}
        pagination={false}
        rowSelection={{
          onSelectMultiple,
        }}
      />,
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]!)
    await waitFor(() => {
      expect(checkboxes[1]).toBeChecked()
    })
    fireEvent.click(checkboxes[3]!, { shiftKey: true })

    await waitFor(() => {
      expect(onSelectMultiple).toHaveBeenCalledTimes(1)
    })
    expect(onSelectMultiple).toHaveBeenCalledWith(
      true,
      [people[0], people[1], people[2]],
      [people[1], people[2]],
    )
  })

  it('scrolls to first row on pagination changes by default and allows disabling it', async () => {
    const manyRows = Array.from({ length: 12 }, (_, index) => ({
      key: `row-${index}`,
      name: `Row ${index}`,
      age: index,
    }))
    const user = userEvent.setup()
    const { container, rerender } = render(
      <div style={{ height: 240 }}>
        <Table<Person>
          columns={baseColumns}
          dataSource={manyRows}
          pagination={{ pageSize: 5 }}
          scroll={{ y: true }}
        />
      </div>,
    )
    const scrollContainer = container.querySelector<HTMLElement>('.dg-scroll')
    expect(scrollContainer).not.toBeNull()
    scrollContainer!.scrollTop = 120

    await user.click(screen.getByRole('listitem', { name: '2' }))
    expect(scrollContainer!.scrollTop).toBe(0)

    rerender(
      <div style={{ height: 240 }}>
        <Table<Person>
          columns={baseColumns}
          dataSource={manyRows}
          pagination={{ pageSize: 5 }}
          scroll={{ y: true, scrollToFirstRowOnChange: false }}
        />
      </div>,
    )
    const nextScrollContainer = container.querySelector<HTMLElement>('.dg-scroll')
    expect(nextScrollContainer).not.toBeNull()
    nextScrollContainer!.scrollTop = 120

    await user.click(screen.getByRole('listitem', { name: '3' }))
    expect(nextScrollContainer!.scrollTop).toBe(120)
  })

  it('supports JSX Column and ColumnGroup children when columns prop is omitted', () => {
    render(
      <Table<Person> dataSource={data} pagination={false}>
        <Table.ColumnGroup<Person> title="Profile">
          <Table.Column<Person> title="Name" dataIndex="name" key="name" />
          <Table.Column<Person> title="Age" dataIndex="age" key="age" />
        </Table.ColumnGroup>
      </Table>,
    )

    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('32')).toBeInTheDocument()
  })

  it('keeps explicit columns authoritative over JSX children', () => {
    render(
      <Table<Person> columns={baseColumns.slice(0, 1)} dataSource={data} pagination={false}>
        <Table.Column<Person> title="Age" dataIndex="age" key="age" />
      </Table>,
    )

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.queryByText('Age')).not.toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.queryByText('32')).not.toBeInTheDocument()
  })

  it('renders title, footer and summary from the current paged data', () => {
    render(
      <Table<Person>
        columns={baseColumns}
        dataSource={data}
        pagination={{ pageSize: 1 }}
        title={(rows) => `Rows ${rows.length}`}
        footer={(rows) => `Footer ${rows.length}`}
        summary={(pageData) => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                Summary {pageData.map((row) => row.name).join(',')}
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />,
    )

    expect(screen.getByText('Rows 2')).toBeInTheDocument()
    expect(screen.getByText('Footer 2')).toBeInTheDocument()
    expect(screen.getByText('Summary Bob')).toBeInTheDocument()
    expect(document.querySelector('.dg-wrapper')).toHaveClass('dg-content-scrolled')
  })

  it('adds sticky and data-area wrapper classes from table-level props', () => {
    render(
      <div style={{ height: 240 }}>
        <Table<Person>
          columns={baseColumns}
          dataSource={data}
          pagination={false}
          sticky
          scroll={{ y: true }}
        />
      </div>,
    )

    expect(document.querySelector('.dg-wrapper')).toHaveClass('dg-sticky')
    expect(document.querySelector('.dg-wrapper')).toHaveClass('dg-data-area')
  })

  it('supports expandable columnTitle and fixed expand column', () => {
    render(
      <Table<Person>
        columns={baseColumns}
        dataSource={data}
        pagination={false}
        scroll={{ x: 640 }}
        expandable={{
          columnTitle: 'Details',
          fixed: 'left',
          expandedRowRender: (record) => <div>More {record.name}</div>,
        }}
      />,
    )

    expect(screen.getByText('Details')).toBeInTheDocument()
    const expandHeader = document.querySelector(
      '.dg-cell-header[data-column-key="__dg_expand__"]',
    )
    expect(expandHeader).toHaveClass('ant-table-cell-fix-left')
  })

  it('emits antd table class aliases for stable data-grid nodes', () => {
    const columns: Array<ColumnType<Person>> = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        sorter: (a, b) => a.name.localeCompare(b.name),
        filters: [{ text: 'Bob', value: 'Bob' }],
        onFilter: (value, record) => record.name === value,
      },
      baseColumns[1]!,
    ]

    render(
      <Table<Person>
        columns={columns}
        dataSource={data}
        pagination={false}
        scroll={{ x: 640 }}
        title={() => 'People'}
        footer={() => 'End'}
      />,
    )

    expect(document.querySelector('.dg-wrapper')).toHaveClass('ant-table-wrapper')
    expect(document.querySelector('.dg-title')).toHaveClass('ant-table-title')
    expect(document.querySelector('.dg-footer')).toHaveClass('ant-table-footer')
    expect(document.querySelector('.dg-grid')).toHaveClass('ant-table')
    expect(document.querySelector('.dg-scroll-wrap')).toHaveClass('ant-table-container')
    expect(document.querySelector('.dg-scroll')).toHaveClass('ant-table-content')
    expect(document.querySelector('.dg-cell-header')).toHaveClass('ant-table-cell')
    expect(document.querySelector('.dg-cell-body')).toHaveClass('ant-table-cell')
    expect(document.querySelector('[data-column-key="name"]')).toHaveClass('ant-table-cell-fix-left')
    expect(document.querySelector('.dg-column-has-sorters')).toHaveClass('ant-table-column-has-sorters')
    expect(document.querySelector('.dg-column-sorters')).toHaveClass('ant-table-column-sorters')
    expect(document.querySelector('.dg-column-title')).toHaveClass('ant-table-column-title')
    expect(document.querySelector('.dg-filter-trigger')).toHaveClass('ant-table-filter-trigger')
  })
})

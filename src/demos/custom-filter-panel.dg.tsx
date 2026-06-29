/**
 * custom-filter-panel demo 的 data-grid 段（左栏），从 custom-filter-panel.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（由 custom-filter-panel.tsx 父组件传）。
 * - 自包含：含 `useDgColumnSearch` 工厂 hook + 内联 `SearchOutlined` + `dgColumns`（Name/Age/Address
 *   三列均 `getColumnSearchProps`；Address 额外 sorter）+ `<Table>` JSX。
 * - 行为与改造前一致：filterDropdown（antd Input 搜索 + Space[Search/Reset/Filter/close] 四按钮）
 *   + filterIcon（放大镜，激活态 colorPrimary）+ onFilter + filterDropdownProps.onOpenChange
 *   （打开时 setTimeout 聚焦 Input）+ render（react-highlight-words 命中高亮，colorWarningBorderHover）。
 *   内联 SearchOutlined SVG（不直接依赖 @ant-design/icons）；HTMLInputElement ref。
 *
 * === ★ 筛选/搜索 state 自管（局部交互）===
 * filterDropdown 内搜索词（searchText/searchedColumn/searchInput）属该 demo 的**局部交互状态**，
 * 强行共享会割裂两侧「忠实各自复刻」语义（点左栏搜索不应影响右栏的搜索词）。故 searchText/
 * searchedColumn/searchInput 在子组件内自管（`useDgColumnSearch` hook 内部 useState/useRef）。
 * 表格整体排序/筛选非受控（filterDropdown 内 confirm 应用为该列 filteredValue，由引擎内部管理）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 已覆盖本子组件所需 props，无需额外兜底。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/custom-filter-panel.shared'` / `'antd'` / `'react'` /
 * `'react-highlight-words'`），源码可原样展示无需路径改写。
 *
 * ★ react-highlight-words 已在 src/live/scope.ts baseScope 注入（package.json 已声明 ^0.21.0），
 *   live 编辑 require('react-highlight-words') 可正确解析。
 */
import { useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Button, Input, Space, theme } from 'antd'
import type { InputRef } from 'antd'
import Highlighter from 'react-highlight-words'
import { Table } from '../table'
import type {
  ColumnType,
  FilterDropdownProps,
  TableColumnType,
} from '../table'
import { data, type DataIndex, type RecordType } from './_compare/custom-filter-panel.shared'

/**
 * 内联 SearchOutlined（放大镜）图标——避免直接依赖 @ant-design/icons（仅 antd 间接依赖）。
 * 与 antd SearchOutlined 视觉一致（同一 SVG path）；size 跟随父节点 font-size（1em）。
 * 两侧共用：左栏 data-grid + 右栏 antd 均使用此组件（右栏替代 `@ant-design/icons` 直接 import，
 * 视觉零差异，仅 import 来源不同）。
 */
function SearchOutlined({ style }: { style?: CSSProperties }): ReactNode {
  return (
    <svg
      viewBox="64 64 896 896"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-0.125em', ...style }}
    >
      <path d="M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// getColumnSearchProps 工厂（行为与改造前一致；搜索 state 内部自管）
// ---------------------------------------------------------------------------

function useDgColumnSearch() {
  const [searchText, setSearchText] = useState('')
  const [searchedColumn, setSearchedColumn] = useState('')
  // antd Input ref（透传到内部 input）；用 HTMLInputElement 兼容。
  const searchInput = useRef<HTMLInputElement>(null)
  // 主题 token：filterIcon 激活态色 + react-highlight-words 高亮命中色 token 化（暗主题自适应）。
  const { token } = theme.useToken()

  const handleSearch = (
    selectedKeys: Array<React.Key>,
    confirm: FilterDropdownProps['confirm'],
    dataIndex: DataIndex,
  ) => {
    confirm()
    setSearchText(String(selectedKeys[0] ?? ''))
    setSearchedColumn(dataIndex)
  }

  const handleReset = (clearFilters: FilterDropdownProps['clearFilters']) => {
    clearFilters()
    setSearchText('')
  }

  const getColumnSearchProps = (dataIndex: DataIndex): TableColumnType<RecordType> => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
      close,
    }: FilterDropdownProps) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput as unknown as React.Ref<InputRef>}
          placeholder={`Search ${dataIndex}`}
          value={String(selectedKeys[0] ?? '')}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() =>
            handleSearch(selectedKeys as string[], confirm, dataIndex)
          }
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() =>
              handleSearch(selectedKeys as string[], confirm, dataIndex)
            }
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              confirm({ closeDropdown: false })
              setSearchText(String((selectedKeys as string[])[0] ?? ''))
              setSearchedColumn(dataIndex)
            }}
          >
            Filter
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close()
            }}
          >
            close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? token.colorPrimary : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        .toString()
        .toLowerCase()
        .includes(String(value).toLowerCase()),
    filterDropdownProps: {
      onOpenChange(open) {
        if (open) {
          setTimeout(() => searchInput.current?.select(), 100)
        }
      },
    },
    render: (text: unknown) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: token.colorWarningBorderHover, padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? String(text) : ''}
        />
      ) : (
        (text as ReactNode)
      ),
  })

  return getColumnSearchProps
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// ★ props 默认值均为合理有效初值（坑5+坑7）：
// - bordered=false（对齐改造前默认，antd custom-filter-panel demo 原本无边框）。
// - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
// 搜索 state（searchText/searchedColumn/searchInput）子组件内自管（局部交互，见文件头说明）；
// 排序/筛选非受控（confirm 应用为该列 filteredValue，由引擎内部管理）。
// 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 已覆盖本子组件所需 props。
export default function CustomFilterPanelDg({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  // 子组件内自管的搜索 state（局部交互，不提升父）。
  const getColumnSearchProps = useDgColumnSearch()

  const dgColumns: ColumnType<RecordType>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      ...getColumnSearchProps('name'),
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      width: '20%',
      ...getColumnSearchProps('age'),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ...getColumnSearchProps('address'),
      sorter: (a, b) => a.address.length - b.address.length,
      sortDirections: ['descend', 'ascend'],
    },
  ]

  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      bordered={bordered}
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         pane 限高，虚拟窗口才有滚动区；filterDropdown 下拉是表头 popover，不受虚拟化影响）；
         OFF 时回 undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}

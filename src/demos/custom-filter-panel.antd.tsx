/**
 * custom-filter-panel demo 的 antd 段（右栏），从 custom-filter-panel.tsx 拆出。
 *
 * - props 驱动 `{ bordered, virtual }`（与左栏 dg 子组件同款签名）。
 * - 自包含：含 `useAntdColumnSearch` 工厂 hook + 内联 `SearchOutlined`（替代 @ant-design/icons
 *   直接 import，视觉零差异——同一 SVG path）+ `antdColumns`（Name/Age/Address 三列均
 *   `getColumnSearchProps`；Address 额外 sorter）+ `<AntdTable>` JSX。
 * - 忠实复刻 antd custom-filter-panel demo：antd 原生 filterDropdown + antd 原生 <Input> +
 *   antd <Button> + antd InputRef + react-highlight-words。
 *
 * === ★ 筛选/搜索 state 自管（局部交互）===
 * 同左栏 dg 子组件：filterDropdown 内搜索词（searchText/searchedColumn/searchInput）属局部交互状态，
 * 子组件内自管（`useAntdColumnSearch` hook 内部 useState/useRef），不提升父。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/custom-filter-panel.shared'` / `'react-highlight-words'`）。
 *
 * ★ react-highlight-words 已在 src/live/scope.ts baseScope 注入（package.json 已声明 ^0.21.0），
 *   live 编辑 require('react-highlight-words') 可正确解析。
 *
 * === 与左栏保留的差异（如实呈现）===
 * 1. SearchOutlined 来源：两侧均用内联 SVG（与改造前决策一致——不引入 @ant-design/icons 直接依赖；
 *    同一 SVG path，视觉零差异）。
 * 2. Input ref 类型：左栏 HTMLInputElement；右栏 antd InputRef（与官方 demo 一致）。
 * 3. FilterDropdownProps 类型：左栏从 '../table' 导出；右栏从 'antd/es/table/interface' 导入——
 *    但 'antd/es/table/interface' 不在 scope.ts baseScope（subpath 不在 'antd' 命名空间注入），
 *    故右栏改为从 'antd' 直接导入 FilterDropdownProps + TableColumnType（baseScope 注入了 'antd'
 *    整包，子路径访问 antd.FilterDropdownProps / antd.TableColumnType 可行；签名与 antd/es/table/interface
 *    完全等价，antd 主入口 re-export 同款类型）。
 */
import { useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Button, Input, Space, Table as AntdTable, theme } from 'antd'
import type { FilterDropdownProps, InputRef, TableColumnType, TableProps } from 'antd'
import Highlighter from 'react-highlight-words'
import { data, type DataIndex, type RecordType } from './_compare/custom-filter-panel.shared'

/**
 * 内联 SearchOutlined（放大镜）图标——与左栏共用同一 SVG path（视觉零差异，避免 @ant-design/icons
 * 直接依赖）。size 跟随父节点 font-size（1em）。
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
// getColumnSearchProps 工厂（忠实复刻 antd 官方 demo；搜索 state 内部自管）
// ---------------------------------------------------------------------------

function useAntdColumnSearch() {
  const [searchText, setSearchText] = useState('')
  const [searchedColumn, setSearchedColumn] = useState('')
  const searchInput = useRef<InputRef>(null)
  // 主题 token：与左栏同款（filterIcon 激活态色 + react-highlight-words 高亮命中色 token 化，暗主题自适应）。
  const { token } = theme.useToken()

  const handleSearch = (
    selectedKeys: string[],
    confirm: FilterDropdownProps['confirm'],
    dataIndex: DataIndex,
  ) => {
    confirm()
    setSearchText(selectedKeys[0])
    setSearchedColumn(dataIndex)
  }

  const handleReset = (clearFilters: () => void) => {
    clearFilters()
    setSearchText('')
  }

  const getColumnSearchProps = (
    dataIndex: DataIndex,
  ): TableColumnType<RecordType> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
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
              setSearchText((selectedKeys as string[])[0])
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
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: token.colorWarningBorderHover, padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? text.toString() : ''}
        />
      ) : (
        text
      ),
  })

  return getColumnSearchProps
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// ★ props 默认值同左栏 dg（合理有效初值，见 dg 子文件注释）。
export default function CustomFilterPanelAntd({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  // 子组件内自管的搜索 state（局部交互，不提升父）。
  const getColumnSearchProps = useAntdColumnSearch()

  const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
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
    <AntdTable<RecordType>
      columns={antdColumns}
      dataSource={data}
      bordered={bordered}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且表头/默认
         分页画在 scroll.y 之外，需扣除表头~55 与分页条~64 → 约 280 才能塞进 pane 限高；
         OFF 时回 undefined，行为与改造前一致）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}

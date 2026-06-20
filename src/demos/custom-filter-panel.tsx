/**
 * 复刻 antd custom-filter-panel demo：
 *   `G:\Projects\ant-design\components\table\demo\custom-filter-panel.tsx`。
 *
 * === antd demo 要素（S5 自定义筛选面板）===
 *
 * - 三列均用 `getColumnSearchProps(dataIndex)` 工厂注入自定义筛选配置：
 *     * `filterDropdown`：自定义下拉（antd Input 搜索框 + Space[Search/Reset/Filter/close] 四按钮）。
 *       注入 props（data-grid 与 antd 同签名）：
 *         - `setSelectedKeys` / `selectedKeys`：搜索词草稿（Input.value ↔ selectedKeys[0]）。
 *         - `confirm({ closeDropdown })`：应用搜索词为该列 filteredValue；closeDropdown 控制是否关闭。
 *         - `clearFilters()`：清空（Reset）。
 *         - `close()`：仅关闭下拉（不应用）。
 *       Input.onPressEnter / Search 按钮 → handleSearch（confirm + 记录 searchText/searchedColumn 用于高亮）。
 *       Reset 按钮 → handleReset（clearFilters + 清 searchText）。
 *       Filter 按钮 → confirm({ closeDropdown: false })（应用但保持打开）。
 *       close 按钮 → close()。
 *     * `filterIcon: (filtered) => <SearchOutlined color={filtered ? '#1677ff' : undefined}/>`：
 *       自定义漏斗图标（用放大镜；激活态蓝色）。
 *     * `onFilter: (value, record) => record[dataIndex].includes(value)`：data-grid useFilter 用此过滤。
 *     * `filterDropdownProps.onOpenChange(open)`：打开时 setTimeout 聚焦 Input。
 *     * `render: (text) => searchedColumn === dataIndex ? <Highlighter .../> : text`：
 *       命中单元格文本高亮（react-highlight-words）。
 *
 * === data-grid 实现（S5）要点 ===
 *
 * - filterDropdown 取代内置 Checkbox/Radio 下拉（引擎 FilterDropdown 把它渲染进 antd Dropdown popupRender，
 *   注入 antd 兼容 FilterDropdownProps）。
 * - selectedKeys 经 confirm 应用为 filteredValue → useFilter 用 onFilter 过滤（与 S3 同机制）。
 * - filterIcon 覆盖默认漏斗（放大镜 + 激活态蓝）。
 * - filterDropdownProps.onOpenChange 透传（聚焦 Input）。
 *
 * === 与 antd 的差异 ===
 *
 * - `@ant-design/icons` 未在 package.json 声明（仅 antd 间接依赖）；本 demo 内联 SearchOutlined SVG，
 *   不直接 import（与引擎 FilterDropdown.tsx 决策一致）。
 * - antd demo 用 `InputRef`（antd Input ref）做 select()；data-grid 直接用原生 HTMLInputElement ref
 *   （antd Input 的 ref 透传到内部 input，select() 行为一致）。
 * - `FilterDropdownProps` 类型从 data-grid 导出（`../table`），与 antd `antd/es/table/interface` 同签名。
 *
 * === 验证点（S5）===
 *
 * 1. 三列表头均为放大镜图标（非默认漏斗）。
 * 2. 点 Name 放大镜 → 弹出自定义面板（Input + 4 按钮）；输入 "John" → 点 Search → 表格只剩含 John 的行；
 *    放大镜变蓝（激活）；Name 列单元格命中文本高亮（黄色背景）。
 * 3. 点 Reset → 清空搜索词，表格回到全量；放大镜恢复灰。
 * 4. 点 Filter（confirm closeDropdown:false）→ 应用搜索词但下拉保持打开。
 * 5. 点 close → 关闭下拉（不改变已应用筛选）。
 * 6. 再次打开下拉，Input 自动聚焦（filterDropdownProps.onOpenChange + setTimeout select）。
 * 7. Address 列同时带 sorter（点击表头排序），与自定义筛选共存。
 * 8. 回归：head / reset-filter / multiple-sorter demo 不受影响。
 */

import { useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Button, Input, Space } from 'antd'
import Highlighter from 'react-highlight-words'
import { Table } from '../table'
import type {
  ColumnType,
  FilterDropdownProps,
  TableColumnType,
} from '../table'

interface DataType {
  key: string
  name: string
  age: number
  address: string
}

type DataIndex = keyof DataType

const data: DataType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Joe Black', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Jim Green', age: 32, address: 'Sydney No. 1 Lake Park' },
  { key: '4', name: 'Jim Red', age: 32, address: 'London No. 2 Lake Park' },
]

/**
 * 内联 SearchOutlined（放大镜）图标——避免直接依赖 @ant-design/icons（仅 antd 间接依赖）。
 * 与 antd SearchOutlined 视觉一致；size 跟随父节点 font-size（1em）。
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

export default function CustomFilterPanelDemo() {
  const [searchText, setSearchText] = useState('')
  const [searchedColumn, setSearchedColumn] = useState('')
  // antd Input ref（透传到内部 input）；用 HTMLInputElement 兼容。
  const searchInput = useRef<HTMLInputElement>(null)

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

  const getColumnSearchProps = (dataIndex: DataIndex): TableColumnType<DataType> => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
      close,
    }: FilterDropdownProps) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput as unknown as React.Ref<import('antd').InputRef>}
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
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
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
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[searchText]}
          autoEscape
          textToHighlight={text ? String(text) : ''}
        />
      ) : (
        (text as ReactNode)
      ),
  })

  const columns: ColumnType<DataType>[] = [
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
    <div style={{ padding: 24 }}>
      <Table<DataType> columns={columns} dataSource={data} />
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fafafa',
          borderRadius: 8,
          color: 'rgba(0,0,0,0.65)',
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        <p style={{ margin: '0 0 4px' }}>
          <b>S5 自定义筛选面板</b>（对齐 antd custom-filter-panel demo）：
        </p>
        <p style={{ margin: 0 }}>
          - 三列均用 <code>filterDropdown</code>（antd Input 搜索 + Search/Reset/Filter/close 四按钮）
          + <code>filterIcon</code>（放大镜，激活态蓝）+ <code>onFilter</code>。
        </p>
        <p style={{ margin: 0 }}>
          - <code>confirm()</code> 应用搜索词；<code>confirm({'{ closeDropdown: false }'})</code> 应用但保持打开；
          <code>clearFilters()</code> 清空；<code>close()</code> 仅关闭。
        </p>
        <p style={{ margin: 0 }}>
          - 命中单元格文本高亮（react-highlight-words）；Address 列同时支持排序（点表头）。
        </p>
      </div>
    </div>
  )
}

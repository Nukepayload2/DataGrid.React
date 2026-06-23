/**
 * 复刻 antd custom-filter-panel demo：
 *   `G:\Projects\ant-design\components\table\demo\custom-filter-panel.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（filterDropdown + filterIcon + filterDropdownProps
 *   + onFilter + confirm/clearFilters/close + react-highlight-words 高亮 + Address 列 sorter）。
 *   内联 SearchOutlined SVG（不直接依赖 @ant-design/icons）；HTMLInputElement ref。
 * - **右栏（antd Table）**：忠实复刻 antd custom-filter-panel demo（antd 原生 filterDropdown + antd
 *   原生 <Input> + antd <Button> + antd InputRef + react-highlight-words）。
 * - **共享控制条**：`Bordered` 开关（antd custom-filter-panel demo 原本无控制条，此处加最小开关便于
 *   对照「有/无边框」两侧行为是否一致）。
 * - **共享数据**：`RecordType` + `data` + `DataIndex` 见 `_compare/custom-filter-panel.shared.ts`。
 *
 * === 两侧状态独立（忠实各自复刻）===
 *
 * filterDropdown 内的搜索词（searchText/searchedColumn/searchInput）属该 demo 的**局部交互状态**，
 * 强行共享会割裂两侧「忠实各自复刻」语义（点左栏搜索不应影响右栏的搜索词，对照价值在于看两栏
 * 独立操作下行为是否一致）。故两侧各自独立维护 searchText/searchedColumn/searchInput，
 * `getColumnSearchProps` 工厂两侧各自实现（data-grid ColumnType / antd TableColumnType 类型不同）。
 * 这与 head/multiple-sorter 共享控制条只放 Bordered（不变状态）的策略一致。
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
 *     * `onFilter: (value, record) => record[dataIndex].includes(value)`：useFilter 用此过滤。
 *     * `filterDropdownProps.onOpenChange(open)`：打开时 setTimeout 聚焦 Input。
 *     * `render: (text) => searchedColumn === dataIndex ? <Highlighter .../> : text`：
 *       命中单元格文本高亮（react-highlight-words）。
 *
 * === data-grid 实现要点（S5）===
 *
 * - filterDropdown 取代内置 Checkbox/Radio 下拉（引擎 FilterDropdown 把它渲染进 antd Dropdown popupRender，
 *   注入 antd 兼容 FilterDropdownProps）。
 * - selectedKeys 经 confirm 应用为 filteredValue → useFilter 用 onFilter 过滤（与 S3 同机制）。
 * - filterIcon 覆盖默认漏斗（放大镜 + 激活态蓝）。
 * - filterDropdownProps.onOpenChange 透传（聚焦 Input）。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **SearchOutlined 来源**：
 *    - 左栏 data-grid：内联 SVG（`@ant-design/icons` 未在 package.json 声明，仅 antd 间接依赖；
 *      与改造前 demo 决策一致，不引入未声明依赖；SVG path 与 antd 官方完全相同，视觉零差异）。
 *    - 右栏 antd：antd 官方原 demo 直接 `import { SearchOutlined } from '@ant-design/icons'`——
 *      但本项目 package.json 未声明该包（仅 antd 间接依赖）。为避免引入未声明直接依赖触发 lint/build 问题，
 *      右栏**同样使用内联 SVG**（与左栏共用 `SearchOutlined` 组件），视觉与 antd 原生 SearchOutlined
 *      完全一致（同一 SVG path）。这是「忠实复刻」的工程化折中：图标视觉零差异，仅 import 来源不同。
 * 2. **Input ref 类型**：
 *    - 左栏 data-grid：`HTMLInputElement`（原生 input ref，antd Input ref 透传到内部 input，select() 一致）。
 *    - 右栏 antd：`InputRef`（antd Input ref，与官方 demo 一致）。
 * 3. **FilterDropdownProps 类型来源**：
 *    - 左栏：从 `../table` 导出（data-grid 导出，与 antd `antd/es/table/interface` 同签名）。
 *    - 右栏：从 `antd/es/table/interface` 导入（antd 官方原 demo 同款）。
 *
 * === S5 经验（验证者勿误判）===
 *
 * 1. **clearFilters() 不立即清表**：`clearFilters()` 无参默认 `{confirm:false}`，点 Reset 只清草稿
 *    （Input 清空）、不立即清表，需再 Search（confirm 空草稿）或关闭下拉（filterOnClose）才回全量。
 *    与 antd `onReset`（`ant-design\components\table\hooks\useFilter\FilterDropdown.tsx:298-315`）逐字一致。
 * 2. **sortDirections 第三次回 null**（本 demo Address 列 `sortDirections: ['descend','ascend']`）：
 *    第三次点击回 null 是 antd 本身循环（antd `nextSortDirection` 与 data-grid `useSorter.ts:163-171`
 *    逐字相同），勿误判。
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
import { Button, Input, Space, Switch, Table as AntdTable } from 'antd'
import type { InputRef, TableProps } from 'antd'
import type { FilterDropdownProps as AntdFilterDropdownProps } from 'antd/es/table/interface'
import type { TableColumnType as AntdTableColumnType } from 'antd'
import Highlighter from 'react-highlight-words'
import { Table } from '../table'
import type {
  ColumnType,
  FilterDropdownProps,
  TableColumnType,
} from '../table'
import { SplitDemo } from './_compare/SplitDemo'
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
// 左栏（data-grid）—— getColumnSearchProps 工厂（行为与改造前一致）
// ---------------------------------------------------------------------------

function useDgColumnSearch() {
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

  return getColumnSearchProps
}

// ---------------------------------------------------------------------------
// 右栏（antd）—— getColumnSearchProps 工厂（忠实复刻 antd 官方 demo）
// ---------------------------------------------------------------------------

function useAntdColumnSearch() {
  const [searchText, setSearchText] = useState('')
  const [searchedColumn, setSearchedColumn] = useState('')
  const searchInput = useRef<InputRef>(null)

  const handleSearch = (
    selectedKeys: string[],
    confirm: AntdFilterDropdownProps['confirm'],
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
  ): AntdTableColumnType<RecordType> => ({
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
    render: (text) =>
      searchedColumn === dataIndex ? (
        <Highlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
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
// Demo 根组件
// ---------------------------------------------------------------------------

export default function CustomFilterPanelDemo() {
  // ★ 共享控制条状态：Bordered 开关同时驱动两侧。
  const [bordered, setBordered] = useState(false)

  // 两侧各自独立的搜索 state（忠实各自复刻，见文件头说明）。
  const dgGetColumnSearchProps = useDgColumnSearch()
  const antdGetColumnSearchProps = useAntdColumnSearch()

  // 左栏（data-grid）列定义 —— 行为与改造前一致
  const dgColumns: ColumnType<RecordType>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      ...dgGetColumnSearchProps('name'),
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      width: '20%',
      ...dgGetColumnSearchProps('age'),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ...dgGetColumnSearchProps('address'),
      sorter: (a, b) => a.address.length - b.address.length,
      sortDirections: ['descend', 'ascend'],
    },
  ]

  // 右栏（antd）列定义 —— 忠实复刻 antd custom-filter-panel demo
  const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      ...antdGetColumnSearchProps('name'),
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      width: '20%',
      ...antdGetColumnSearchProps('age'),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      ...antdGetColumnSearchProps('address'),
      sorter: (a, b) => a.address.length - b.address.length,
      sortDirections: ['descend', 'ascend'],
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。Bordered 开关同时驱动两侧。 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </div>

      {/*
        minPaneWidth=480（窄表，3 列；Name/Age 有 width 百分比 + Address 自适应）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            columns={dgColumns}
            dataSource={data}
            bordered={bordered}
            pagination={{}}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            dataSource={data}
            bordered={bordered}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B6）：</strong>
          左右并排呈现 data-grid 与 antd custom-filter-panel demo（S5 自定义筛选面板）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              三列均用 <code>filterDropdown</code>（antd Input 搜索 + Search/Reset/Filter/close 四按钮）
              + <code>filterIcon</code>（放大镜，激活态蓝 <code>#1677ff</code>）+ <code>onFilter</code>
              + <code>filterDropdownProps.onOpenChange</code>（打开时聚焦 Input）。
            </li>
            <li>
              <code>confirm()</code> 应用搜索词；<code>confirm({'{ closeDropdown: false }'})</code>
              应用但保持打开；<code>clearFilters()</code> 清空（Reset）；<code>close()</code> 仅关闭。
              命中单元格文本高亮（react-highlight-words，黄色 <code>#ffc069</code>）。
            </li>
            <li>
              <strong>Address 列</strong>同时支持 <code>sorter</code>（点表头排序）+
              <code>sortDirections: ['descend','ascend']</code>，与自定义筛选共存。
            </li>
            <li>
              <strong>两侧状态独立</strong>（忠实各自复刻）：filterDropdown 内搜索词属局部交互，
              点左栏搜索不影响右栏——对照价值在于看两栏独立操作下行为是否一致（面板 UI / 应用/重置
              语义 / 高亮 / 放大镜激活态）。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧边框。
            </li>
            <li>
              <strong>已知正确行为勿误判</strong>：① <code>clearFilters()</code> 无参默认
              <code>{'{confirm:false}'}</code>，点 Reset 只清草稿不立即清表，需再 Search 或关闭下拉
              才回全量——与 antd <code>onReset</code> 逐字一致。② Address 列
              <code>sortDirections</code> 第三次回 null 是 antd 本身循环（data-grid 与 antd
              <code>nextSortDirection</code> 逐字相同）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

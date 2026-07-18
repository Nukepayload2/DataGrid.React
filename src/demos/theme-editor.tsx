import { useState, type ComponentProps, type CSSProperties } from 'react'
import type { TableProps as AntdTableProps } from 'antd'
import {
  Button,
  Card,
  Collapse,
  ColorPicker,
  Form,
  InputNumber,
  Segmented,
  Slider,
  Space,
  Table as AntdTable,
  Tag,
  theme,
} from 'antd'
import { Table } from '../table'
import type {
  ColumnType,
  TableRowSelection,
} from '../table'
import {
  dataSource as sharedData,
  type RecordType,
} from './_compare/theme-editor.shared'
import {
  useTheme,
  type GlobalTokenKey,
  type TableTokenKey,
  type ThemeMode,
} from '../theme/ThemeContext'
import { deriveTableComponentTokenDefaults } from '../table/tokenBridge'

/** 两侧共享的表格尺寸档位。 */
type SharedSize = 'large' | 'medium' | 'small'

/** 按 key 读取的 antd realToken 视图。 */
type RealToken = Record<string, unknown>

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name' },
  {
    title: 'Age',
    dataIndex: 'age',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    filters: [
      { text: 'London', value: 'London' },
      { text: 'New York', value: 'New York' },
    ],
    onFilter: (value, record) =>
      record.address.indexOf(value as string) === 0,
  },
  {
    title: 'Action',
    key: 'action',
    render: () => (
      <Space size="middle">
        <a>Invite</a>
        <a>Delete</a>
      </Space>
    ),
  },
]

const antdColumns: NonNullable<AntdTableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name' },
  {
    title: 'Age',
    dataIndex: 'age',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    filters: [
      { text: 'London', value: 'London' },
      { text: 'New York', value: 'New York' },
    ],
    onFilter: (value, record) =>
      record.address.indexOf(value as string) === 0,
  },
  {
    title: 'Action',
    key: 'action',
    render: () => (
      <Space size="middle">
        <a>Invite</a>
        <a>Delete</a>
      </Space>
    ),
  },
]

type ColorPickerChangeComplete = NonNullable<
  ComponentProps<typeof ColorPicker>['onChangeComplete']
>
type ColorValue = Parameters<ColorPickerChangeComplete>[0]

function colorToString(color: ColorValue): string {
  return color.toHexString()
}

/** label 旁的编辑状态标记。 */
function EditMark({ edited }: { edited: boolean }) {
  return edited ? (
    <Tag color="processing" style={{ marginInlineStart: 8, fontSize: 11 }}>
      ● 已编辑
    </Tag>
  ) : (
    <Tag style={{ marginInlineStart: 8, fontSize: 11, opacity: 0.5 }}>
      默认
    </Tag>
  )
}

export function ThemeEditorPanel() {
  const {
    themeMode,
    setThemeMode,
    globalOverrides,
    tableOverrides,
    setGlobalToken,
    setTableToken,
    resetGlobalToken,
    resetTableToken,
    resetAll,
    hasAnyOverride,
  } = useTheme()

  const { token } = theme.useToken()
  const realToken = token as unknown as RealToken

  const tableDefaults = deriveTableComponentTokenDefaults(realToken)

  const [size, setSize] = useState<SharedSize>('large')
  const [yScroll, setYScroll] = useState(false)

  const getGlobalValue = (key: GlobalTokenKey): string | number => {
    if (key in globalOverrides) {
      return globalOverrides[key] as string | number
    }
    return realToken[key] as string | number
  }
  const getTableValue = (key: TableTokenKey): string | number => {
    if (key in tableOverrides) {
      return tableOverrides[key] as string | number
    }
    return tableDefaults[key] as string | number
  }

  const dgRowSelection: TableRowSelection<RecordType> | undefined = {}
  const antdRowSelection: AntdTableProps<RecordType>['rowSelection'] = {}

  const dgScroll: { y?: true } = yScroll ? { y: true } : {}
  const antdScroll: { y?: number } = yScroll ? { y: 240 } : {}

  const globalColorKeys: GlobalTokenKey[] = ['colorPrimary', 'colorBgContainer']
  const globalSliderKeys: { key: GlobalTokenKey; min: number; max: number }[] = [
    { key: 'borderRadius', min: 0, max: 16 },
    { key: 'fontSize', min: 12, max: 32 },
  ]

  const tableColorKeys: TableTokenKey[] = [
    'headerBg',
    'headerColor',
    'headerSplitColor',
    'rowHoverBg',
    'rowSelectedBg',
    'rowSelectedHoverBg',
    'borderColor',
  ]

  const tableSliderKeys: { key: TableTokenKey; min: number; max: number }[] = [
    { key: 'cellPaddingBlock', min: 4, max: 24 },
    { key: 'cellPaddingInline', min: 4, max: 24 },
    { key: 'headerBorderRadius', min: 0, max: 16 },
  ]

  return (
    <>
      <Card
        size="small"
        title="主题编辑器"
        extra={
          hasAnyOverride ? (
            <Button size="small" onClick={resetAll} danger>
              重置全部
            </Button>
          ) : null
        }
        style={{ marginBottom: 16 }}
      >
        <Form layout="inline" style={{ marginBottom: 8 }}>
          <Form.Item label="主题模式（镜像顶栏）">
            <Segmented
              value={themeMode}
              onChange={(val) => setThemeMode(val as ThemeMode)}
              options={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Size">
            <Segmented
              value={size}
              onChange={(val) => setSize(val as SharedSize)}
              options={[
                { label: 'large', value: 'large' },
                { label: 'medium', value: 'medium' },
                { label: 'small', value: 'small' },
              ]}
            />
          </Form.Item>
          <Form.Item label="scroll.y">
            <Segmented
              value={yScroll ? 'on' : 'off'}
              onChange={(val) => setYScroll(val === 'on')}
              options={[
                { label: 'off', value: 'off' },
                { label: 'on', value: 'on' },
              ]}
            />
          </Form.Item>
        </Form>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            rowGap: 12,
          }}
        >
          <div style={{ flex: '1 1 480px', minWidth: 480 }}>
            <div
              style={{
                fontWeight: 600,
                marginBottom: 8,
                fontSize: 13,
                opacity: 0.85,
              }}
            >
              全局 token（theme.token）
            </div>
            <Form layout="horizontal" labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
              {globalColorKeys.map((key) => {
                const edited = key in globalOverrides
                const value = getGlobalValue(key) as string
                return (
                  <Form.Item
                    key={key}
                    label={
                      <span>
                        {key}
                        <EditMark edited={edited} />
                      </span>
                    }
                  >
                    <Space align="center">
                      <ColorPicker
                        value={value}
                        onChangeComplete={(c) =>
                          setGlobalToken(key, colorToString(c))
                        }
                        showText
                        format="hex"
                      />
                      {edited ? (
                        <Button
                          size="small"
                          type="link"
                          onClick={() => resetGlobalToken(key)}
                        >
                          重置
                        </Button>
                      ) : null}
                    </Space>
                  </Form.Item>
                )
              })}
              {globalSliderKeys.map(({ key, min, max }) => {
                const edited = key in globalOverrides
                const value = getGlobalValue(key) as number
                return (
                  <Form.Item
                    key={key}
                    label={
                      <span>
                        {`${key} (${value})`}
                        <EditMark edited={edited} />
                      </span>
                    }
                  >
                    <Space align="center">
                      <Slider
                        min={min}
                        max={max}
                        step={1}
                        value={value}
                        onChange={(v) => setGlobalToken(key, v)}
                        style={{ width: 160 }}
                      />
                      {edited ? (
                        <Button
                          size="small"
                          type="link"
                          onClick={() => resetGlobalToken(key)}
                        >
                          重置
                        </Button>
                      ) : null}
                    </Space>
                  </Form.Item>
                )
              })}
            </Form>
          </div>

          <div style={{ flex: '1 1 480px', minWidth: 480 }}>
            <div
              style={{
                fontWeight: 600,
                marginBottom: 8,
                fontSize: 13,
                opacity: 0.85,
              }}
            >
              Table 组件 token — 颜色（theme.components.Table）
            </div>
            <Form layout="horizontal" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
              {tableColorKeys.map((key) => {
                const edited = key in tableOverrides
                const value = getTableValue(key) as string
                return (
                  <Form.Item
                    key={key}
                    label={
                      <span>
                        {key}
                        <EditMark edited={edited} />
                      </span>
                    }
                  >
                    <Space align="center">
                      <ColorPicker
                        value={value}
                        onChangeComplete={(c) =>
                          setTableToken(key, colorToString(c))
                        }
                        showText
                        format="hex"
                      />
                      {edited ? (
                        <Button
                          size="small"
                          type="link"
                          onClick={() => resetTableToken(key)}
                        >
                          重置
                        </Button>
                      ) : null}
                    </Space>
                  </Form.Item>
                )
              })}
            </Form>
          </div>

          <div style={{ flex: '1 1 480px', minWidth: 480 }}>
            <div
              style={{
                fontWeight: 600,
                marginBottom: 8,
                fontSize: 13,
                opacity: 0.85,
              }}
            >
              Table 组件 token — 数值（Slider + InputNumber 联动）
            </div>
            <Form layout="horizontal" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
              {tableSliderKeys.map(({ key, min, max }) => {
                const edited = key in tableOverrides
                const value = getTableValue(key) as number
                return (
                  <Form.Item
                    key={key}
                    label={
                      <span>
                        {key}
                        <EditMark edited={edited} />
                      </span>
                    }
                  >
                    <Space align="center">
                      <Slider
                        min={min}
                        max={max}
                        step={1}
                        value={value}
                        onChange={(v) => setTableToken(key, v)}
                        style={{ width: 160 }}
                      />
                      <InputNumber
                        min={min}
                        max={max}
                        step={1}
                        value={value}
                        onChange={(v) => setTableToken(key, v ?? min)}
                        style={{ width: 80 }}
                      />
                      {edited ? (
                        <Button
                          size="small"
                          type="link"
                          onClick={() => resetTableToken(key)}
                        >
                          重置
                        </Button>
                      ) : null}
                    </Space>
                  </Form.Item>
                )
              })}
            </Form>
          </div>
        </div>
      </Card>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            flex: '1 1 560px',
            minWidth: 480,
            maxWidth: '100%',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: 8,
              fontSize: 13,
              opacity: 0.85,
            }}
          >
            data-grid（useToken → .dg-wrapper --ant-* 注入）
          </div>
          {/* scroll.y:true 只开启数据区域模式；Table 自适应占满这里提供的可用空间。 */}
          <div style={yScroll ? { height: 240 } : undefined}>
            <Table<RecordType>
              size={size}
              rowSelection={dgRowSelection}
              scroll={dgScroll}
              columns={dgColumns}
              dataSource={sharedData}
              pagination={{ placement: ['topStart', 'bottomEnd'] }}
            />
          </div>
        </div>

        <div
          style={{
            flex: '1 1 560px',
            minWidth: 480,
            maxWidth: '100%',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: 8,
              fontSize: 13,
              opacity: 0.85,
            }}
          >
            antd（cssinjs :where(.ant-table) 原生消费）
          </div>
          <div style={yScroll ? { height: 240 } : undefined}>
            <AntdTable<RecordType>
              size={size}
              rowSelection={antdRowSelection}
              scroll={antdScroll}
              columns={antdColumns}
              dataSource={sharedData}
              pagination={{ placement: ['topStart', 'bottomEnd'] }}
            />
          </div>
        </div>
      </div>

      <Collapse
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'cov',
            label: '覆盖度对照说明',
            children: (
              <Card size="small">
                <p style={{ margin: '0 0 8px' }}>
          <strong>用法</strong>：改任一 token 控件 → 左右两栏实时同步变化。data-grid
          经 Table.tsx <code>useToken</code> realToken +{' '}
          <code>transformToken</code> 把 token 注入{' '}
          <code>.dg-wrapper</code> inline <code>--ant-*</code> CSS variables
          并直接消费 antd Table var；<code>--dg-*</code> 仅保留自研滚动、行高等异构变量。antd 经 cssinjs 原生消费。两侧
          视觉应一致，差异即注入覆盖 gap。
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong>dark bug 修复</strong>：未编辑的 token <strong>不进</strong>{' '}
          ConfigProvider（由 antd algorithm + prepareComponentToken 派生）→ dark 下自动
          变暗（如 headerBg 由 #fafafa 派生为 #1d1d1d）。只有用户显式编辑过的 token 才作为
          override 传入，dark 下仍保留覆盖值。
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong>编辑/未编辑标记</strong>：label 旁 <Tag color="processing" style={{ fontSize: 11 }}>● 已编辑</Tag>{' '}
          表示该 token 已被覆盖（key 在 overrides 里），<Tag style={{ fontSize: 11, opacity: 0.5 }}>默认</Tag>{' '}
          表示由 algorithm 派生。每项旁「重置」按钮仅已编辑时显示；Card 顶「重置全部」仅任一
          overrides 非空时显示。
        </p>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
          }}
        >
          <thead>
            <tr>
              <th style={th}>Token</th>
              <th style={th}>控件</th>
              <th style={th}>改后看哪里</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={td}><code>colorPrimary</code></td>
              <td style={td}>ColorPicker</td>
              <td style={td}>排序 caret 激活色、选中行 checkbox、分页当前页、a 链接（Action 列）</td>
            </tr>
            <tr>
              <td style={td}><code>borderRadius</code></td>
              <td style={td}>Slider 0–16</td>
              <td style={td}>filter 下拉圆角、pagination 按钮、整体卡片圆角</td>
            </tr>
            <tr>
              <td style={td}><code>fontSize</code></td>
              <td style={td}>Slider 12–32</td>
              <td style={td}>表头与表体字号（基础字号，与 cellFontSize 不同维度）</td>
            </tr>
            <tr>
              <td style={td}><code>colorBgContainer</code></td>
              <td style={td}>ColorPicker</td>
              <td style={td}>表体单元格背景（dark 下由 algorithm 覆盖，编辑器优先级更高）</td>
            </tr>
            <tr>
              <td style={td}><code>headerBg</code></td>
              <td style={td}>ColorPicker</td>
              <td style={td}>表头底色（最强对比，两侧一眼可见）</td>
            </tr>
            <tr>
              <td style={td}><code>headerColor</code></td>
              <td style={td}>ColorPicker</td>
              <td style={td}>表头文字色</td>
            </tr>
            <tr>
              <td style={td}><code>headerSplitColor</code></td>
              <td style={td}>ColorPicker</td>
              <td style={td}>表头排序 icon 与文字之间的竖线分隔</td>
            </tr>
            <tr>
              <td style={td}><code>rowHoverBg</code></td>
              <td style={td}>ColorPicker</td>
              <td style={td}>鼠标 hover 行的背景</td>
            </tr>
            <tr>
              <td style={td}><code>rowSelectedBg</code></td>
              <td style={td}>ColorPicker</td>
              <td style={td}>勾选 checkbox 的行背景（先勾选再看）</td>
            </tr>
            <tr>
              <td style={td}><code>rowSelectedHoverBg</code></td>
              <td style={td}>ColorPicker</td>
              <td style={td}>勾选行再 hover 的背景</td>
            </tr>
            <tr>
              <td style={td}><code>borderColor</code></td>
              <td style={td}>ColorPicker</td>
              <td style={td}>表格行/列分隔线（与 bordered 配合更明显）</td>
            </tr>
            <tr>
              <td style={td}><code>cellPaddingBlock</code></td>
              <td style={td}>Slider 4–24 + InputNumber</td>
              <td style={td}>单元格上下 padding（行高变化，size=large 生效）</td>
            </tr>
            <tr>
              <td style={td}><code>cellPaddingInline</code></td>
              <td style={td}>Slider 4–24 + InputNumber</td>
              <td style={td}>单元格左右 padding（列宽/内容留白变化）</td>
            </tr>
            <tr>
              <td style={td}><code>headerBorderRadius</code></td>
              <td style={td}>Slider 0–16 + InputNumber</td>
              <td style={td}>表头与表格交界处圆角（顶部两角）</td>
            </tr>
          </tbody>
        </table>
        <p style={{ margin: '12px 0 0' }}>
          <strong>dark 切换</strong>：顶栏 Segmented（或本 demo 镜像 Segmented）→ Light/Dark
          → <code>algorithm</code> 重算全套 token。data-grid 经 realToken 重算
          <code> --ant-*</code>，antd 原生 dark。两侧应同步变暗（编辑器覆盖的 token
          在 dark 下仍保留覆盖值，未编辑的重派生为 dark 默认）。
        </p>
        <p style={{ margin: '12px 0 0' }}>
          <strong>全局虚拟化开关不生效</strong>（本 demo 自渲染、非虚拟化对象）：本 demo
          不使用 SplitDemo（自渲染双栏 + 自有 ConfigProvider 作用域），不读全局
          <code> useVirtualization</code>，故全局「Virtual」开关天然不影响它。
        </p>
              </Card>
            ),
          },
        ]}
      />
    </>
  )
}

// 说明区表格样式
const th: CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  borderBottom: '1px solid rgba(128,128,128,0.3)',
  fontWeight: 600,
}
const td: CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  borderBottom: '1px solid rgba(128,128,128,0.15)',
  verticalAlign: 'top',
}

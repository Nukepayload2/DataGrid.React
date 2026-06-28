/**
 * 已重构为顶栏 Modal 内的 ThemeEditorPanel，不再作路由 demo。
 *
 * 交互式 ConfigProvider token 编辑器，证明 data-grid 主题注入**全覆盖**（与 antd
 * 原生消费 cssinjs 对照）。
 *
 * === 任务 T16 重构（修 dark bug）===
 *
 * **旧 bug 根因**：本 demo 把写死的 light 绝对值（headerBg #fafafa 等）塞进本地
 * useState，**全 token 都传** ConfigProvider components.Table/token → antd 当用户
 * override → dark algorithm 派生被覆盖 → dark 下表头仍 #fafafa（应派生为 #1d1d1d）。
 *
 * **修复语义**：edited = key 在全局 overrides 对象里；未编辑的 key 绝不进 ConfigProvider
 * → 让 antd algorithm + prepareComponentToken 派生 → dark 下自动变暗。
 * - state 全部移到 `src/theme/ThemeContext.tsx`（全局 store）：themeMode + globalOverrides
 *   + tableOverrides。ConfigProvider 由 ThemeProvider 内化，本 panel 不再自渲染。
 * - 顶栏 Segmented 是 dark/light 单一真理源（本 panel 内的 dark Segmented 仅作镜像）。
 *
 * **派生默认值（Method B）**：
 * - `useToken`（`antd/es/theme/internal`）6 元组的 index 1 = realToken（alias 派生后原值）。
 * - Table 默认：`prepareTableComponentToken(realToken)`（`antd/es/table/style/index`）
 *   派生 headerBg/headerColor/headerSplitColor/rowHoverBg/rowSelectedBg/rowSelectedHoverBg
 *   /borderColor/cellPaddingBlock/cellPaddingInline/headerBorderRadius 等（随 algorithm
 *   dark/light 实时变）。
 * - 全局默认：直接 `realToken.colorPrimary / realToken.borderRadius / realToken.fontSize
 *   / realToken.colorBgContainer`。
 * - 每控件当前值 = `overrides[key] ?? derivedDefault[key]`。
 *
 * **编辑/未编辑 UI**：
 * - 已编辑 label 加 ●（主色）+"已编辑" tag；仅此 key 在 overrides 对象里时显示。
 * - 未编辑加灰"默认" tag。
 * - 每项旁小"重置"按钮，仅 `key in overrides`（已编辑）时显示；点击 resetXxxToken(key)。
 * - Card 顶"重置全部"按钮，仅任一 overrides 非空时显示；点击 resetAll()。
 *
 * === 双栏（保留自渲染）===
 *
 * 本 panel 仍自渲染双栏（不复用 SplitDemo）：SplitDemo 改造后 dark 由全局顶栏驱动，
 * 理论上可用，但本 panel 需要在同一作用域内同时显示「编辑器 Card + 双栏表格 + 说明区」，
 * 自渲染布局更直接。token 覆盖来自全局 store（ThemeProvider 顶层 ConfigProvider），
 * 故两侧表格（data-grid + antd）都自动响应。
 *
 * === 门户重构 ===
 *
 * 已从 src/demos/index.ts 注册表移除，不再走 #/demos/theme-editor 路由。
 * 通过顶栏「主题编辑器」按钮打开的 ThemeEditorModal（src/ThemeEditorModal.tsx）
 * 渲染本 panel。最外层 padding:24 已去掉（Modal body 提供滚动容器）。
 */

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
// ★ 派生默认（Method B）：useToken realToken（index 1）+ antd Table 真实派生函数。
import { useToken } from 'antd/es/theme/internal'
import { prepareComponentToken as antdTablePrepareComponentToken } from 'antd/es/table/style/index'

// ---------------------------------------------------------------------------
// 类型 & 派生默认
// ---------------------------------------------------------------------------

/** 共享 size 类型：'large'/'medium'/'small' 在两侧都被接受。 */
type SharedSize = 'large' | 'medium' | 'small'

/**
 * antd `useToken` 6 元组 index 1 = realToken（alias 派生后原值，随 algorithm dark/light 变）。
 * Table.tsx 同样用法（src/table/Table.tsx:82）。
 *
 * 类型上 useToken 返回 UseTokenProps（含 theme 等），realToken 是 GlobalToken 的子集。
 * 这里只取我们需要的几个 key，cast 为索引签名以便读取。
 */
type RealToken = Record<string, unknown>

/**
 * prepareComponentToken 的公开类型是 union，运行时始终是函数（antd 源码
 * `export const prepareComponentToken = (token) => {...}`）。cast 为确定性签名。
 * Table.tsx 同样 cast（src/table/Table.tsx:99-103）。
 */
type AntdTablePrepareComponentTokenFn = (
  token: RealToken,
) => Record<string, unknown>
const prepareTableComponentToken: AntdTablePrepareComponentTokenFn =
  antdTablePrepareComponentToken as unknown as AntdTablePrepareComponentTokenFn

// ---------------------------------------------------------------------------
// 两侧共享 columns（可排序 + 可筛选 + Action）
// ---------------------------------------------------------------------------

// data-grid 列定义：Age 可排序，Address 可筛选。
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

// antd 列定义（与 data-grid 结构一致，类型独立）。
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

// ---------------------------------------------------------------------------
// 小工具：ColorPicker 取值（toHexString 统一 hex 字符串）
// ---------------------------------------------------------------------------

type ColorPickerChangeComplete = NonNullable<
  ComponentProps<typeof ColorPicker>['onChangeComplete']
>
type ColorValue = Parameters<ColorPickerChangeComplete>[0]

function colorToString(color: ColorValue): string {
  return color.toHexString()
}

// ---------------------------------------------------------------------------
// 编辑/未编辑标记小组件
// ---------------------------------------------------------------------------

/**
 * label 旁的编辑状态标记。
 * - edited=true：主色 ● + "已编辑" tag（colorPrimary 由 ThemeProvider ConfigProvider 提供）。
 * - edited=false：灰"默认" tag。
 */
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

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export function ThemeEditorPanel() {
  // ★ 全局主题 store（单一真理源）：themeMode + globalOverrides + tableOverrides + 写/重置 API。
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

  // ★ 派生默认（Method B）：useToken realToken（index 1）随 algorithm dark/light 变。
  //   antd useToken 在 ConfigProvider 作用域内调用，读当前 theme（含 dark algorithm 派生）。
  //   index 1 = realToken（alias 派生后原值；与 Table.tsx src/table/Table.tsx:1778 同款用法）。
  //   dark algorithm → realToken 暗值 → prepareTableComponentToken 派生暗默认。
  const antdTokenTuple = useToken()
  const realToken = (antdTokenTuple[1] ?? {}) as unknown as RealToken

  // ★ Table 组件 token 默认值：直接调用 antd 真实派生函数（与 Table.tsx 同源）。
  //   输入 realToken（alias 派生后），输出 headerBg/headerColor/... 等 30+ 派生默认。
  //   dark algorithm → realToken 暗值 → prepareTableComponentToken 派生暗默认（headerBg ≈ #1d1d1d）。
  const tableDefaults = prepareTableComponentToken(realToken)

  // size + scroll.y 仍是本 demo 本地 UI state（与主题无关）。
  const [size, setSize] = useState<SharedSize>('large')
  const [yScroll, setYScroll] = useState(false)

  // ----- 当前值 helper：overrides[key] ?? derivedDefault[key] -----
  // 类型 cast：realToken/tableDefaults 是 unknown 索引签名，按 key 取后断言为期望类型。
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

  // rowSelection：checkbox 多选开启（触发 rowSelectedBg / rowSelectedHoverBg）。
  const dgRowSelection: TableRowSelection<RecordType> | undefined = {}
  const antdRowSelection: AntdTableProps<RecordType>['rowSelection'] = {}

  // scroll：data-grid 用 true（CSS 自适应高度，决策 7），antd 用 240 数字。
  const dgScroll: { y?: true } = yScroll ? { y: true } : {}
  const antdScroll: { y?: number } = yScroll ? { y: 240 } : {}

  // 全局 token 配置（key + min/max for slider）
  const globalColorKeys: GlobalTokenKey[] = ['colorPrimary', 'colorBgContainer']
  const globalSliderKeys: { key: GlobalTokenKey; min: number; max: number }[] = [
    { key: 'borderRadius', min: 0, max: 16 },
    { key: 'fontSize', min: 12, max: 32 },
  ]

  // Table 颜色 token keys
  const tableColorKeys: TableTokenKey[] = [
    'headerBg',
    'headerColor',
    'headerSplitColor',
    'rowHoverBg',
    'rowSelectedBg',
    'rowSelectedHoverBg',
    'borderColor',
  ]

  // Table 数值 token keys
  const tableSliderKeys: { key: TableTokenKey; min: number; max: number }[] = [
    { key: 'cellPaddingBlock', min: 4, max: 24 },
    { key: 'cellPaddingInline', min: 4, max: 24 },
    { key: 'headerBorderRadius', min: 0, max: 16 },
  ]

  return (
    <>
      {/*
        ★ 不再自渲染 ConfigProvider：token 覆盖来自 ThemeProvider 顶层（src/main.tsx 包
        ThemeProvider → ConfigProvider(themeMode algorithm + globalOverrides token +
        tableOverrides components.Table)。两侧表格（data-grid + antd）都在此作用域内，
        自动响应主题编辑器与顶栏 dark/light 切换。
        ★ 门户重构：外层 padding:24 去掉（Modal body 提供滚动容器与内边距）。
      */}
      {/* ============================================================
          控制面板（全宽，antd Card 分组）
          ============================================================ */}
      <Card
        size="small"
        title="主题编辑器"
        extra={
          // ★ 全量重置：仅任一 overrides 非空时显示。点击 resetAll() 清空两 overrides。
          hasAnyOverride ? (
            <Button size="small" onClick={resetAll} danger>
              重置全部
            </Button>
          ) : null
        }
        style={{ marginBottom: 16 }}
      >
        {/* 主题模式（镜像顶栏）+ size + scroll.y */}
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

        {/* 全局 token + Table 组件 token 双栏控件 */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            rowGap: 12,
          }}
        >
          {/* ---- 全局 token ---- */}
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
              {/* 颜色 */}
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
              {/* 数值 */}
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

          {/* ---- Table 组件 token：颜色 ---- */}
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

          {/* ---- Table 组件 token：数值 ---- */}
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

      {/* ============================================================
          双栏预览：自渲染（不用 SplitDemo），共享全局 token store
          ============================================================ */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        {/* 左栏：data-grid */}
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
          {/* scroll.y:true 需父容器有明确 height（决策 7），与 component-token demo 一致。 */}
          <div style={yScroll ? { height: 240 } : undefined}>
            <Table<RecordType>
              size={size}
              rowSelection={dgRowSelection}
              scroll={dgScroll}
              columns={dgColumns}
              dataSource={sharedData}
              pagination={{ placement: ['top', 'bottom'] }}
            />
          </div>
        </div>

        {/* 右栏：antd */}
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
              pagination={{ placement: ['top', 'bottom'] }}
            />
          </div>
        </div>
      </div>

      {/* ============================================================
          说明区：覆盖度对照（默认收起，行为零变化，仅外层改为 Collapse）
          ============================================================ */}
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
          （tokens.css 桥接 <code>--dg-*</code>）；antd 经 cssinjs 原生消费。两侧
          视觉应一致，差异即注入覆盖 gap。
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong>★ dark bug 修复（T16）</strong>：未编辑的 token <strong>不进</strong>{' '}
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

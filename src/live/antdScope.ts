/**
 * live 编辑器的 `antd` 注入表（白名单）。
 *
 * ## 为什么不用 `import('antd')` 拿命名空间
 * 命名空间导入等于"整包引入"：`antd/es/index.js` 会把 80+ 个组件全部拉进图里，
 * 而 rolldown 对"命名空间动态导入 + 首屏已有同名模块"的处理是**合并进首屏 chunk**
 * （实测：`static Button` + `import('antd')` ⇒ 单个 1 638 KB 的 eager chunk；
 * 换成 `static Button` + 懒模块里 `import { DatePicker }` ⇒ Button 294 KB eager +
 * DatePicker 292 KB 真正懒加载）。所以必须显式列出组件名。
 *
 * ## 名单从哪来
 * demo 源码（`src/demos` 下的全部 .tsx）里 `import { … } from 'antd'` 的并集 + 常见编辑用组件。
 * `tests/live/antd-scope.test.ts` 扫 demo 源码做同步校验：新增 demo 用了没登记的组件就红。
 * 类型导入（`TableProps`/`GetProp`/…）在编译期被擦掉，不进本表，测试里单列一份白名单。
 *
 * ## 未命中怎么办
 * 返回占位组件 + `devWarnOnce` 一次：`antd.Foo` 拿到 `undefined` 只会让 React 抛
 * "Element type is invalid"，对编辑者没有指向性。
 */
import { createElement, type CSSProperties } from 'react'
import { devWarnOnce } from '../table/devWarn'
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Collapse,
  ColorPicker,
  ConfigProvider,
  Divider,
  Dropdown,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Segmented,
  Slider,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd'

/** 白名单本体：键即 live 代码里 `require('antd').Xxx` 的 `Xxx`。 */
export const liveAntd: Record<string, unknown> = {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Collapse,
  ColorPicker,
  ConfigProvider,
  Divider,
  Dropdown,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Segmented,
  Slider,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
}

/** 未命中组件时渲染的占位：不打断预览，但让名字出现在页面上。 */
function MissingComponent(props: { style?: CSSProperties }) {
  return createElement(
    'span',
    {
      title: '该 antd 组件不在 live 作用域白名单里',
      style: { opacity: 0.45, fontStyle: 'italic', fontSize: 12, ...props.style },
    },
    '[antd.?]',
  )
}

/**
 * 给 live 作用域用的 antd 命名空间：命中返回真实导出，未命中返回占位并告警一次。
 *
 * 只对**大写开头**的未知键给占位组件（组件用法）；`theme`/`version` 这类非组件键
 * 返回 `undefined`，让错误形态与真实 antd 一致。
 */
export const liveAntdScope: Record<string, unknown> = new Proxy(liveAntd, {
  get(target, key, receiver) {
    const hit = Reflect.get(target, key, receiver)
    if (hit !== undefined) return hit
    if (typeof key !== 'string' || key === 'default' || key === 'then') return undefined
    if (!/^[A-Z]/.test(key)) return undefined
    devWarnOnce(
      `live 的 antd 白名单未包含 "${key}"：已渲染占位组件。需要它在 live 代码里可用，请加到 src/live/antdScope.ts。`,
      `live-antd:${key}`,
    )
    return MissingComponent
  },
})

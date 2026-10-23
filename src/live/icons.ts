/**
 * live 编辑器的 `@ant-design/icons` 注入表（白名单）。
 *
 * ## 为什么是白名单，而不是 `import * as antdIcons`
 * 命名空间导入让打包器**一个图标都摇不掉**（@ant-design/icons 导出 836 个），实测它是
 * docs 首屏 968 KB(min) 的来源之一。白名单把 live 作用域需要的图标收到
 * 「本仓 demo/docs 直接 import 的图标 + 常见编辑用图标」，实测该 chunk 从 341 KB 降到 ~30 KB。
 *
 * ## 覆盖面由测试钉住
 * `tests/live/icon-scope.test.ts` 会扫 `src/demos/**` 里每个 `@ant-design/icons` 具名导入，
 * 漏登记就红 —— 白名单不怕长，怕的是"某天新增 demo 用了新图标、live 编辑静默失灵"。
 *
 * ## 未命中为什么不抛错
 * `evalModule` 的 `require('@ant-design/icons')` 拿到的是本对象的 Proxy；未命中返回
 * **占位组件**并 `devWarnOnce` 一次。若直接返回 `undefined`，React 只会抛
 * "Element type is invalid"，对编辑者没有任何指向性；占位组件能把"名字不在白名单"说清楚。
 */
import { createElement, type CSSProperties } from 'react'
import { devWarnOnce } from '../table/devWarn'
import {
  CaretDownOutlined,
  CaretRightOutlined,
  CaretUpOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleFilled,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
  EllipsisOutlined,
  ExclamationCircleFilled,
  EyeOutlined,
  FilterFilled,
  FilterOutlined,
  FolderOutlined,
  HomeOutlined,
  InfoCircleFilled,
  InfoCircleOutlined,
  LinkOutlined,
  LoadingOutlined,
  LockOutlined,
  MailOutlined,
  MenuOutlined,
  MinusOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  StarOutlined,
  SyncOutlined,
  TagOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
  WarningFilled,
} from '@ant-design/icons'

/** 白名单本体：键即 live 代码里 `require('@ant-design/icons').Xxx` 的 `Xxx`。 */
export const liveIcons: Record<string, unknown> = {
  CaretDownOutlined,
  CaretRightOutlined,
  CaretUpOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleFilled,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
  EllipsisOutlined,
  ExclamationCircleFilled,
  EyeOutlined,
  FilterFilled,
  FilterOutlined,
  FolderOutlined,
  HomeOutlined,
  InfoCircleFilled,
  InfoCircleOutlined,
  LinkOutlined,
  LoadingOutlined,
  LockOutlined,
  MailOutlined,
  MenuOutlined,
  MinusOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  StarOutlined,
  SyncOutlined,
  TagOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
  WarningFilled,
}

/** 未命中图标时渲染的占位：不打断预览，但把名字打在控制台与页面上。 */
function MissingIcon(props: { style?: CSSProperties }) {
  return createElement(
    'span',
    {
      title: '该图标不在 live 作用域白名单里',
      style: { opacity: 0.45, fontStyle: 'italic', fontSize: 12, ...props.style },
    },
    '?',
  )
}

/**
 * 给 live 作用域用的图标命名空间：命中返回真实组件，未命中返回占位并告警一次。
 *
 * Proxy 只拦 `get`；`Object.keys` / 展开仍只看到白名单（这是有意的：白名单就是契约）。
 */
export const liveIconScope: Record<string, unknown> = new Proxy(liveIcons, {
  get(target, key, receiver) {
    const hit = Reflect.get(target, key, receiver)
    if (hit !== undefined) return hit
    if (typeof key !== 'string' || key === 'default' || key === 'then') return undefined
    // Symbol 键（如 Symbol.toPrimitive）交给默认行为；`then` 让 await 不当成 thenable。
    devWarnOnce(
      `live 图标白名单未包含 "${key}"：已渲染占位图标。需要它在 live 代码里可用，请加到 src/live/icons.ts 的白名单。`,
      `live-icon:${key}`,
    )
    return MissingIcon
  },
})

/**
 * 决策 9：dynamic-settings 左右对比 demo 的共享配置。
 *
 * dynamic-settings 与 component-token 的「columns 形状 + 数据 + title/footer」完全同构，
 * 唯一差异：component-token 包了 `<ConfigProvider theme.components.Table>` token 覆盖，
 * dynamic-settings 用默认主题。故两者复用同一份共享配置（component-token.shared.ts）。
 *
 * 对照源：`G:\Projects\ant-design\components\table\demo\dynamic-settings.tsx`。
 */

export {
  dataSource,
  defaultFooter,
  defaultTitle,
} from './component-token.shared'
export type { RecordType } from './component-token.shared'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import './index.css'
import App from './App.tsx'

// ★ 决策 6（S3 起）：用 antd ConfigProvider 包裹整个 demo 应用。
//   - 让 antd 组件（S3 筛选下拉 Dropdown/Checkbox/Radio/Button 等）正常工作。
//   - 让 antd v6 token（--ant-* CSS variables）输出到 DOM，data-grid F3 样式层据此与 antd 视觉一致。
//   - 默认主题；后续 S30 component-token 会通过 theme.components.Table 动态注入。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </StrictMode>,
)

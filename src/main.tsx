import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './theme/ThemeContext'

// ★ 决策 6（S3 起）：用 antd ConfigProvider 包裹整个 demo 应用。
//   - 让 antd 组件（S3 筛选下拉 Dropdown/Checkbox/Radio/Button 等）正常工作。
//   - 让 antd v6 token（--ant-* CSS variables）输出到 DOM，data-grid F3 样式层据此与 antd 视觉一致。
//
// ★ 任务 T16：ConfigProvider 已内化进 `<ThemeProvider>`（src/theme/ThemeContext.tsx）。
//   ThemeProvider 持有 themeMode + 两 overrides，直接包 ConfigProvider（algorithm + token +
//   components.Table），是 dark/light + 编辑/未编辑的单一真理源。main.tsx 不再自渲染 ConfigProvider
//   （避免双层，外层 token 覆盖会被内层空 theme 重置）。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

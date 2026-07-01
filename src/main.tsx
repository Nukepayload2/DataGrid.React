import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './theme/ThemeContext'
import { VirtualizationProvider } from './demos/VirtualizationContext'

// ThemeProvider 管理全局主题；VirtualizationProvider 管理顶栏虚拟化开关。
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <VirtualizationProvider>
        <App />
      </VirtualizationProvider>
    </ThemeProvider>
  </StrictMode>,
)

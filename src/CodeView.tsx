/** 只读 demo 源码视图。 */
import { useEffect, useRef, useState } from 'react'
import { Button, Tooltip, theme as antdTheme } from 'antd'
import { CheckOutlined, CopyOutlined } from '@ant-design/icons'
import CodeMirrorEditor from './code/CodeMirrorEditor'
import { useTheme } from './theme/ThemeContext'

export interface CodeViewProps {
  code: string
  height?: number | string
  maxHeight?: number | string
  ariaLabel?: string
}

export default function CodeView({
  code,
  height = '70vh',
  maxHeight,
  ariaLabel = '只读源码',
}: CodeViewProps) {
  const { themeMode } = useTheme()
  const { token } = antdTheme.useToken()
  const [copied, setCopied] = useState(false)
  // 复制成功的短暂提示窗口（秒级），到点自动收回。
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const onCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code)
      } else {
        // 兜底：非 HTTPS / 旧浏览器降级。
        const ta = document.createElement('textarea')
        ta.value = code
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      // 复制失败：保持原状（不切勾选）。
    }
  }

  return (
    <div className="code-view-wrap" style={{ position: 'relative' }}>
      <Tooltip title={copied ? '已复制' : '复制'}>
        <Button
          className="code-view-copy"
          size="small"
          type="text"
          aria-label={copied ? '已复制' : '复制源码'}
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={onCopy}
          style={{
            position: 'absolute',
            top: 6,
            insetInlineEnd: 8,
            zIndex: 2,
            color: copied ? token.colorSuccess : token.colorTextSecondary,
            background: token.colorFillTertiary,
            backdropFilter: 'blur(2px)',
          }}
        />
      </Tooltip>
      <CodeMirrorEditor
        value={code}
        readOnly
        dark={themeMode === 'dark'}
        height={height}
        maxHeight={maxHeight}
        ariaLabel={ariaLabel}
      />
    </div>
  )
}

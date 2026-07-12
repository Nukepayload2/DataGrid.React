/** 只读 demo 源码视图。 */
import CodeMirrorEditor from './code/CodeMirrorEditor'
import { useTheme } from './theme/ThemeContext'

export interface CodeViewProps {
  code: string
}

export default function CodeView({ code }: CodeViewProps) {
  const { themeMode } = useTheme()

  return (
    <CodeMirrorEditor
      value={code}
      readOnly
      dark={themeMode === 'dark'}
      height="70vh"
      ariaLabel="只读源码"
    />
  )
}
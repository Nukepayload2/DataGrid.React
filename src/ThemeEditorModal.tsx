/** 顶栏主题编辑器的 Modal 壳层。 */
import { Modal } from 'antd'
import { ThemeEditorPanel } from './demos/theme-editor'

export interface ThemeEditorModalProps {
  open: boolean
  onClose: () => void
}

export default function ThemeEditorModal({
  open,
  onClose,
}: ThemeEditorModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="主题编辑器"
      width={1100}
      footer={null}
      styles={{ body: { maxHeight: '80vh', overflow: 'auto' } }}
    >
      <ThemeEditorPanel />
    </Modal>
  )
}

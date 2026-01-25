import { useUIStore } from '../../stores/uiStore'
import { cn } from '../../lib/utils'
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const styles = {
  success: 'bg-status-success/20 border-status-success/30 text-status-success',
  error: 'bg-status-error/20 border-status-error/30 text-status-error',
  warning: 'bg-status-warning/20 border-status-warning/30 text-status-warning',
  info: 'bg-pastel-blue/20 border-pastel-blue/30 text-pastel-blue',
}

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

function Toast({ id, type, message, onClose }) {
  const Icon = icons[type] || Info

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm',
        'fade-in pointer-events-auto',
        styles[type]
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium text-white">{message}</p>
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

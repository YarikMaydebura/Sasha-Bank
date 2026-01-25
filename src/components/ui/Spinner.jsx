import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
}

export function Spinner({ size = 'md', className }) {
  return (
    <Loader2
      className={cn('animate-spin text-pastel-purple', sizes[size], className)}
    />
  )
}

export function LoadingScreen({ message }) {
  return (
    <div className="fixed inset-0 bg-bg-dark/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <Spinner size="xl" />
      {message && (
        <p className="mt-4 text-pastel-purple-light">{message}</p>
      )}
    </div>
  )
}

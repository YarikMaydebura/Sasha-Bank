import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '../../lib/utils'
import { CoinBadge } from '../ui/Badge'
import { NotificationBell } from '../ui/NotificationBell'
import { useUserStore } from '../../stores/userStore'

export function Header({
  title,
  showBack = false,
  showBalance = true,
  showNotifications = true,
  rightAction,
  className,
}) {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-bg-dark/80 backdrop-blur-md border-b border-pastel-purple/10',
        'px-4 py-3 pt-safe',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-bg-card text-pastel-purple-light transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {title && (
            <h1 className="text-lg font-semibold text-white truncate">
              {title}
            </h1>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightAction}
          {showNotifications && user && <NotificationBell />}
          {showBalance && user && (
            <CoinBadge amount={user.balance} size="md" animated />
          )}
        </div>
      </div>
    </header>
  )
}

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '../../stores/notificationStore'
import { useUserStore } from '../../stores/userStore'

export function NotificationBell() {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const { unreadCount, init, cleanup } = useNotificationStore()

  useEffect(() => {
    if (user?.id) {
      init(user.id)
    }

    return () => {
      cleanup()
    }
  }, [user?.id, init, cleanup])

  const handleClick = () => {
    navigate('/notifications')
  }

  return (
    <button
      onClick={handleClick}
      className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
      aria-label="Notifications"
    >
      <Bell className="w-6 h-6 text-white" />

      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-lg">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

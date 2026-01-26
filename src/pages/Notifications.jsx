import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, CheckCheck, Trash2, Bell, Gift, AlertCircle } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { BottomNav } from '../components/layout/BottomNav'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useNotificationStore } from '../stores/notificationStore'
import { useUserStore } from '../stores/userStore'
import { timeAgo } from '../lib/utils'

const notificationIcons = {
  gift_received: Gift,
  punishment_assigned: AlertCircle,
  mission_confirmed: Check,
  favor_fulfilled: Gift,
  ability_used: CheckCheck,
  trade_request: Gift,
  risk_result: AlertCircle,
  admin_message: Bell,
  system: Bell,
}

const notificationColors = {
  gift_received: 'text-green-500',
  punishment_assigned: 'text-red-500',
  mission_confirmed: 'text-blue-500',
  favor_fulfilled: 'text-pink-500',
  ability_used: 'text-purple-500',
  trade_request: 'text-yellow-500',
  risk_result: 'text-orange-500',
  admin_message: 'text-indigo-500',
  system: 'text-gray-500',
}

function NotificationItem({ notification, onMarkAsRead, onDelete }) {
  const Icon = notificationIcons[notification.type] || Bell
  const colorClass = notificationColors[notification.type] || 'text-gray-500'

  const timeAgoText = timeAgo(notification.created_at)

  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all ${
        notification.is_read
          ? 'bg-white/5 border-white/10'
          : 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`p-2 rounded-full bg-white/10 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-white text-sm">{notification.title}</h3>
            {!notification.is_read && (
              <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0 mt-1" />
            )}
          </div>

          <p className="text-white/80 text-sm mb-2">{notification.message}</p>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-white/50">{timeAgoText}</span>

            <div className="flex items-center gap-2">
              {!notification.is_read && (
                <button
                  onClick={() => onMarkAsRead(notification.id)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  Mark as read
                </button>
              )}

              <button
                onClick={() => onDelete(notification.id)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4 text-white/50 hover:text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Notifications() {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const {
    notifications,
    unreadCount,
    isLoading,
    init,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotificationStore()

  useEffect(() => {
    if (user?.id) {
      init(user.id)
    }
  }, [user?.id, init])

  const handleMarkAllAsRead = async () => {
    if (user?.id) {
      await markAllAsRead(user.id)
    }
  }

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      if (user?.id) {
        await clearAll(user.id)
      }
    }
  }

  return (
    <PageWrapper>
      <Header title="Notifications" />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="p-6 space-y-4">
          {/* Header Actions */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>

            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark all read
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear all
                </Button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
                <Bell className="w-10 h-10 text-white/30" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No notifications</h3>
              <p className="text-white/60">You're all caught up!</p>
            </div>
          )}

          {/* Notifications List */}
          {!isLoading && notifications.length > 0 && (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </PageWrapper>
  )
}

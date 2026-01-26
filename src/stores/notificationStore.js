import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useNotificationStore = create((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  subscription: null,

  // Initialize notifications for a user
  init: async (userId) => {
    if (!userId) return

    set({ isLoading: true })

    try {
      // Fetch initial notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const unreadCount = data.filter((n) => !n.is_read).length

      set({
        notifications: data || [],
        unreadCount,
        isLoading: false,
        error: null,
      })

      // Set up real-time subscription
      get().subscribeToNotifications(userId)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      set({ isLoading: false, error: error.message })
    }
  },

  // Subscribe to real-time notification updates
  subscribeToNotifications: (userId) => {
    // Unsubscribe from previous subscription if exists
    const { subscription } = get()
    if (subscription) {
      subscription.unsubscribe()
    }

    // Create new subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New notification received:', payload.new)
          const { notifications, unreadCount } = get()

          set({
            notifications: [payload.new, ...notifications],
            unreadCount: unreadCount + 1,
          })

          // Optional: Play notification sound
          // new Audio('/notification.mp3').play().catch(() => {})
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Notification updated:', payload.new)
          const { notifications } = get()

          const updated = notifications.map((n) =>
            n.id === payload.new.id ? payload.new : n
          )

          const unreadCount = updated.filter((n) => !n.is_read).length

          set({
            notifications: updated,
            unreadCount,
          })
        }
      )
      .subscribe()

    set({ subscription: channel })
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error

      const { notifications } = get()
      const updated = notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )

      const unreadCount = updated.filter((n) => !n.is_read).length

      set({
        notifications: updated,
        unreadCount,
      })
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (userId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error

      const { notifications } = get()
      const updated = notifications.map((n) => ({ ...n, is_read: true }))

      set({
        notifications: updated,
        unreadCount: 0,
      })
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      const { notifications } = get()
      const updated = notifications.filter((n) => n.id !== notificationId)
      const unreadCount = updated.filter((n) => !n.is_read).length

      set({
        notifications: updated,
        unreadCount,
      })
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  },

  // Clear all notifications
  clearAll: async (userId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)

      if (error) throw error

      set({
        notifications: [],
        unreadCount: 0,
      })
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  },

  // Cleanup subscription
  cleanup: () => {
    const { subscription } = get()
    if (subscription) {
      subscription.unsubscribe()
    }
    set({
      notifications: [],
      unreadCount: 0,
      subscription: null,
    })
  },
}))

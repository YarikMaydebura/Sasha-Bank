import { create } from 'zustand'
import { storage } from '../lib/utils'
import { saveSession, clearSession, restoreSession, hasRole } from '../lib/auth'

const USER_STORAGE_KEY = 'sasha_bank_user'

export const useUserStore = create((set, get) => ({
  // User state
  user: null,
  isLoading: true,
  error: null,

  // Initialize from session
  init: async () => {
    set({ isLoading: true })

    try {
      // Try to restore session
      const user = await restoreSession()

      if (user) {
        // Save to both storage methods for backward compatibility
        storage.set(USER_STORAGE_KEY, user)
        set({ user, isLoading: false, error: null })
      } else {
        // Try old localStorage method as fallback
        const stored = storage.get(USER_STORAGE_KEY)
        if (stored) {
          set({ user: stored, isLoading: false })
        } else {
          set({ isLoading: false })
        }
      }
    } catch (error) {
      console.error('Session init error:', error)
      set({ isLoading: false, error: error.message })
    }
  },

  // Set user (after registration or login)
  setUser: (user) => {
    storage.set(USER_STORAGE_KEY, user)
    saveSession(user)
    set({ user, error: null })
  },

  // Update balance (optimistic update)
  updateBalance: (newBalance) => {
    const { user } = get()
    if (user) {
      const updated = { ...user, balance: newBalance }
      storage.set(USER_STORAGE_KEY, updated)
      set({ user: updated })
    }
  },

  // Update user data
  updateUser: (updates) => {
    const { user } = get()
    if (user) {
      const updated = { ...user, ...updates }
      storage.set(USER_STORAGE_KEY, updated)
      set({ user: updated })
    }
  },

  // Logout
  logout: () => {
    storage.remove(USER_STORAGE_KEY)
    clearSession()
    set({ user: null })
  },

  // Set error
  setError: (error) => set({ error }),

  // Clear error
  clearError: () => set({ error: null }),

  // Set loading
  setLoading: (isLoading) => set({ isLoading }),

  // Check if user is admin (V2 - uses role field)
  isAdmin: () => {
    const { user } = get()
    return user?.role === 'admin' || user?.is_admin || false
  },

  // Check if user is bartender or admin (V2)
  isBartender: () => {
    const { user } = get()
    return hasRole(user, 'bartender')
  },

  // Check if user has required role (V2)
  hasRole: (requiredRole) => {
    const { user } = get()
    return hasRole(user, requiredRole)
  },
}))

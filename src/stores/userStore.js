import { create } from 'zustand'
import { storage } from '../lib/utils'

const USER_STORAGE_KEY = 'sasha_bank_user'

export const useUserStore = create((set, get) => ({
  // User state
  user: null,
  isLoading: true,
  error: null,

  // Initialize from localStorage
  init: () => {
    const stored = storage.get(USER_STORAGE_KEY)
    if (stored) {
      set({ user: stored, isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },

  // Set user (after registration or login)
  setUser: (user) => {
    storage.set(USER_STORAGE_KEY, user)
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
    set({ user: null })
  },

  // Set error
  setError: (error) => set({ error }),

  // Clear error
  clearError: () => set({ error: null }),

  // Set loading
  setLoading: (isLoading) => set({ isLoading }),

  // Check if user is admin
  isAdmin: () => get().user?.is_admin || false,
}))

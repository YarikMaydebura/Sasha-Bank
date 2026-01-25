import { create } from 'zustand'

export const useUIStore = create((set, get) => ({
  // Toast state
  toasts: [],

  // Modal state
  activeModal: null,
  modalData: null,

  // Loading state
  isLoading: false,
  loadingMessage: '',

  // Show toast notification
  showToast: (type, message, duration = 3000) => {
    const id = Date.now()
    const toast = { id, type, message }

    set(state => ({
      toasts: [...state.toasts, toast]
    }))

    // Auto-remove after duration
    setTimeout(() => {
      set(state => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }))
    }, duration)

    return id
  },

  // Remove specific toast
  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },

  // Clear all toasts
  clearToasts: () => set({ toasts: [] }),

  // Open modal
  openModal: (modalName, data = null) => {
    set({ activeModal: modalName, modalData: data })
  },

  // Close modal
  closeModal: () => {
    set({ activeModal: null, modalData: null })
  },

  // Set loading
  setLoading: (isLoading, message = '') => {
    set({ isLoading, loadingMessage: message })
  },

  // Helper to show success toast
  success: (message) => get().showToast('success', message),

  // Helper to show error toast
  error: (message) => get().showToast('error', message),

  // Helper to show info toast
  info: (message) => get().showToast('info', message),

  // Helper to show warning toast
  warning: (message) => get().showToast('warning', message),
}))

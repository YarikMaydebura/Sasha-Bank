import { create } from 'zustand'
import { storage } from '../lib/utils'

const COOLDOWNS_KEY = 'sasha_bank_cooldowns'

export const useGameStore = create((set, get) => ({
  // Cooldowns
  cooldowns: {},

  // Active game states
  activeTrivia: null,
  activeBoxRound: null,

  // Initialize cooldowns from storage
  initCooldowns: () => {
    const stored = storage.get(COOLDOWNS_KEY)
    if (stored) {
      // Filter out expired cooldowns
      const now = Date.now()
      const valid = Object.fromEntries(
        Object.entries(stored).filter(([_, expiry]) => expiry > now)
      )
      storage.set(COOLDOWNS_KEY, valid)
      set({ cooldowns: valid })
    }
  },

  // Set cooldown for a game type
  setCooldown: (gameType, durationMs) => {
    const expiry = Date.now() + durationMs
    set(state => {
      const updated = { ...state.cooldowns, [gameType]: expiry }
      storage.set(COOLDOWNS_KEY, updated)
      return { cooldowns: updated }
    })
  },

  // Check if cooldown is active
  isOnCooldown: (gameType) => {
    const expiry = get().cooldowns[gameType]
    if (!expiry) return false
    return Date.now() < expiry
  },

  // Get remaining cooldown time in seconds
  getCooldownRemaining: (gameType) => {
    const expiry = get().cooldowns[gameType]
    if (!expiry) return 0
    const remaining = Math.max(0, expiry - Date.now())
    return Math.ceil(remaining / 1000)
  },

  // Clear cooldown
  clearCooldown: (gameType) => {
    set(state => {
      const updated = { ...state.cooldowns }
      delete updated[gameType]
      storage.set(COOLDOWNS_KEY, updated)
      return { cooldowns: updated }
    })
  },

  // Trivia game state
  startTrivia: (questions) => {
    set({
      activeTrivia: {
        questions,
        currentIndex: 0,
        answers: [],
        startTime: Date.now()
      }
    })
  },

  answerTrivia: (answerIndex) => {
    set(state => {
      if (!state.activeTrivia) return state
      return {
        activeTrivia: {
          ...state.activeTrivia,
          answers: [...state.activeTrivia.answers, answerIndex],
          currentIndex: state.activeTrivia.currentIndex + 1
        }
      }
    })
  },

  endTrivia: () => {
    set({ activeTrivia: null })
  },

  // Box round state
  setActiveBoxRound: (round) => {
    set({ activeBoxRound: round })
  },

  clearActiveBoxRound: () => {
    set({ activeBoxRound: null })
  },
}))

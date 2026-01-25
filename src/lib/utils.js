import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes intelligently
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Generate unique ID
export function generateId() {
  return crypto.randomUUID()
}

// Generate QR code value for user
export function generateQRCode() {
  return `user_${generateId().slice(0, 8)}`
}

// Generate order code (A1, A2, ... B1, etc.)
let orderCounter = 0
export function generateOrderCode() {
  const letter = String.fromCharCode(65 + Math.floor(orderCounter / 100))
  const number = (orderCounter % 100) + 1
  orderCounter++
  return `${letter}${number}`
}

// Format coin amount with emoji
export function formatCoins(amount) {
  return `${amount}🪙`
}

// Get time ago string
export function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Shuffle array
export function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Pick random items from array
export function pickRandom(array, count = 1) {
  const shuffled = shuffleArray(array)
  return count === 1 ? shuffled[0] : shuffled.slice(0, count)
}

// Weighted random selection
export function weightedRandom(items, weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) return items[i]
  }

  return items[items.length - 1]
}

// Local storage helpers
export const storage = {
  get(key) {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.error('Failed to remove from localStorage:', e)
    }
  }
}

// Constants
export const CONSTANTS = {
  STARTING_COINS: 10,
  MIN_BALANCE: 1,
  TRIVIA_COST: 1,
  TRIVIA_WIN_REWARD: 2,
  TRIVIA_COOLDOWN_MS: 5 * 60 * 1000, // 5 minutes
  GAME_COOLDOWN_MS: 3 * 60 * 1000, // 3 minutes
  BOX_MIN_BID: 3,
  BOX_MIN_PLAYERS: 3,
  BOX_BIDDING_TIME: 60, // seconds
  LOTTERY_COST: 10,
  TRADE_MIN: 1,
  TRADE_MAX: 5,
}

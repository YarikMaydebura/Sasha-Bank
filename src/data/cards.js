/**
 * Sasha Bank v2.0 - Cards System
 *
 * Cards can be won from:
 * - Risk station (10% chance)
 * - Mission rewards
 * - Lottery prizes
 * - Market purchases (future)
 * - Admin grants
 *
 * Each card can be used once
 */

export const cards = [
  // ============================================
  // SOCIAL CARDS (Common) - Fun interactions
  // ============================================
  {
    id: 'hug',
    name: 'Hug Card',
    emoji: '🤗',
    description: 'Get a hug from anyone at the party',
    rarity: 'common',
    category: 'social',
    requires_target: true,
    requires_admin: false,
  },
  {
    id: 'paparazzi',
    name: 'Paparazzi',
    emoji: '📸',
    description: 'Force a photo with anyone',
    rarity: 'common',
    category: 'social',
    requires_target: true,
    requires_admin: false,
  },
  {
    id: 'high_five',
    name: 'High Five',
    emoji: '🙌',
    description: 'Get an epic high five from someone',
    rarity: 'common',
    category: 'social',
    requires_target: true,
    requires_admin: false,
  },
  {
    id: 'dance',
    name: 'Dance Partner',
    emoji: '💃',
    description: 'Make someone dance with you',
    rarity: 'common',
    category: 'social',
    requires_target: true,
    requires_admin: false,
  },

  // ============================================
  // ATTACK CARDS (Rare) - Offensive actions
  // ============================================
  {
    id: 'steal',
    name: 'Steal',
    emoji: '💰',
    description: 'Steal 3 coins from anyone',
    rarity: 'rare',
    category: 'attack',
    requires_target: true,
    requires_admin: false,
    effect: 'steal_coins',
    effect_value: 3,
  },
  {
    id: 'sabotage',
    name: 'Sabotage',
    emoji: '💣',
    description: 'Force someone to skip their next mission reward',
    rarity: 'rare',
    category: 'attack',
    requires_target: true,
    requires_admin: false,
    effect: 'skip_mission',
  },
  {
    id: 'prank',
    name: 'Prank Card',
    emoji: '🎭',
    description: 'Assign a silly task to someone',
    rarity: 'rare',
    category: 'attack',
    requires_target: true,
    requires_admin: true,
  },

  // ============================================
  // DEFENSE CARDS (Rare) - Protective actions
  // ============================================
  {
    id: 'shield',
    name: 'Shield',
    emoji: '🛡️',
    description: 'Block the next incoming attack or punishment',
    rarity: 'rare',
    category: 'defense',
    requires_target: false,
    requires_admin: false,
    effect: 'immunity_shield',
    effect_duration: 600000, // 10 minutes
  },
  {
    id: 'reverse',
    name: 'Reverse',
    emoji: '🔄',
    description: 'Reflect the next attack back to sender',
    rarity: 'rare',
    category: 'defense',
    requires_target: false,
    requires_admin: false,
    effect: 'reverse_attack',
  },

  // ============================================
  // EPIC CARDS - High value cards
  // ============================================
  {
    id: 'swap',
    name: 'Swap',
    emoji: '🔁',
    description: 'Swap balances with anyone',
    rarity: 'epic',
    category: 'wild',
    requires_target: true,
    requires_admin: false,
    effect: 'swap_balance',
  },
  {
    id: 'dj_power',
    name: 'DJ Power',
    emoji: '🎧',
    description: 'Request any song to be played next',
    rarity: 'epic',
    category: 'social',
    requires_target: false,
    requires_admin: true,
    effect: 'song_request',
  },
  {
    id: 'double_reward',
    name: 'Double Reward',
    emoji: '💎',
    description: 'Your next mission gives 2x coins',
    rarity: 'epic',
    category: 'blessing',
    requires_target: false,
    requires_admin: false,
    effect: 'double_mission_reward',
  },
  {
    id: 'teleport',
    name: 'Teleport',
    emoji: '✨',
    description: 'Instantly gain 5 coins',
    rarity: 'epic',
    category: 'blessing',
    requires_target: false,
    requires_admin: false,
    effect: 'instant_coins',
    effect_value: 5,
  },

  // ============================================
  // LEGENDARY CARDS - Ultra rare
  // ============================================
  {
    id: 'mystery',
    name: 'Mystery Box',
    emoji: '🎁',
    description: 'Random effect: could be amazing or terrible',
    rarity: 'legendary',
    category: 'wild',
    requires_target: false,
    requires_admin: true,
    effect: 'mystery',
  },
  {
    id: 'lucky',
    name: 'Lucky Charm',
    emoji: '🍀',
    description: 'Next 3 Risk attempts are free and have better odds',
    rarity: 'legendary',
    category: 'blessing',
    requires_target: false,
    requires_admin: false,
    effect: 'lucky_streak',
    effect_value: 3,
  },
  {
    id: 'chaos',
    name: 'Chaos Card',
    emoji: '🌪️',
    description: 'Shuffle 5 random coins between 3 random people',
    rarity: 'legendary',
    category: 'wild',
    requires_target: false,
    requires_admin: true,
    effect: 'chaos',
  },
  {
    id: 'time_freeze',
    name: 'Time Freeze',
    emoji: '⏱️',
    description: 'Pause all cooldowns for 5 minutes',
    rarity: 'legendary',
    category: 'blessing',
    requires_target: false,
    requires_admin: false,
    effect: 'freeze_cooldowns',
    effect_duration: 300000, // 5 minutes
  },
  {
    id: 'wild_card',
    name: 'Wild Card',
    emoji: '🃏',
    description: 'Copy any card effect from anyone',
    rarity: 'legendary',
    category: 'wild',
    requires_target: true,
    requires_admin: false,
    effect: 'copy_card',
  },
]

// Rarity configuration with colors and probabilities
export const cardRarities = {
  common: {
    name: 'Common',
    color: '#9CA3AF', // gray
    probability: 0.50, // 50%
    glow: 'rgba(156, 163, 175, 0.3)',
  },
  rare: {
    name: 'Rare',
    color: '#3B82F6', // blue
    probability: 0.30, // 30%
    glow: 'rgba(59, 130, 246, 0.4)',
  },
  epic: {
    name: 'Epic',
    color: '#8B5CF6', // purple
    probability: 0.15, // 15%
    glow: 'rgba(139, 92, 246, 0.5)',
  },
  legendary: {
    name: 'Legendary',
    color: '#F59E0B', // gold
    probability: 0.05, // 5%
    glow: 'rgba(245, 158, 11, 0.6)',
  },
}

// Card categories for filtering/display
export const cardCategories = {
  social: { name: 'Social', emoji: '🎉', color: '#EC4899' },
  attack: { name: 'Attack', emoji: '⚔️', color: '#EF4444' },
  defense: { name: 'Defense', emoji: '🛡️', color: '#10B981' },
  blessing: { name: 'Blessing', emoji: '✨', color: '#8B5CF6' },
  wild: { name: 'Wild', emoji: '🌟', color: '#F59E0B' },
}

/**
 * Get random card based on rarity probabilities
 * @returns {object} Random card
 */
export function getRandomCard() {
  const random = Math.random()
  let cumulativeProbability = 0
  let selectedRarity = 'common'

  // Determine rarity based on probabilities
  for (const [rarity, config] of Object.entries(cardRarities)) {
    cumulativeProbability += config.probability
    if (random <= cumulativeProbability) {
      selectedRarity = rarity
      break
    }
  }

  // Get all cards of selected rarity
  const cardsOfRarity = cards.filter((c) => c.rarity === selectedRarity)

  // Return random card from that rarity
  return cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)]
}

/**
 * Get card by ID
 * @param {string} cardId
 * @returns {object|null}
 */
export function getCardById(cardId) {
  return cards.find((c) => c.id === cardId) || null
}

/**
 * Get cards by category
 * @param {string} category
 * @returns {array}
 */
export function getCardsByCategory(category) {
  return cards.filter((c) => c.category === category)
}

/**
 * Get cards by rarity
 * @param {string} rarity
 * @returns {array}
 */
export function getCardsByRarity(rarity) {
  return cards.filter((c) => c.rarity === rarity)
}

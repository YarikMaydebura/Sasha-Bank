/**
 * Hidden QR Codes - V3.0
 * 10 hidden QR codes around the venue
 * Each can be scanned by max 3 people (first-come, first-served)
 * Random rewards: coins, cards, or traps
 */

export const hiddenQRCodes = [
  {
    id: 'hidden_1',
    name: 'Lucky Find',
    emoji: '🍀',
    location_hint: 'Behind the potted plant',
    max_scans: 3,
    reward_type: 'coins',
    reward_amount: 5,
    message: 'Lucky you! Found some hidden treasure!'
  },
  {
    id: 'hidden_2',
    name: 'Secret Stash',
    emoji: '💰',
    location_hint: 'Under the couch cushion',
    max_scans: 3,
    reward_type: 'coins',
    reward_amount: 6,
    message: 'You found a secret coin stash!'
  },
  {
    id: 'hidden_3',
    name: 'Shield Guardian',
    emoji: '🛡️',
    location_hint: 'Near the emergency exit',
    max_scans: 3,
    reward_type: 'card',
    reward_card_id: 'shield',
    message: 'A protective Shield card appears!'
  },
  {
    id: 'hidden_4',
    name: 'Sneaky Coins',
    emoji: '🪙',
    location_hint: 'Inside the coat closet',
    max_scans: 3,
    reward_type: 'coins',
    reward_amount: 3,
    message: 'Some sneaky coins were hiding here!'
  },
  {
    id: 'hidden_5',
    name: 'The Trap',
    emoji: '💀',
    location_hint: 'Behind the photo backdrop',
    max_scans: 3,
    reward_type: 'trap',
    reward_amount: -2,
    message: 'Oh no! It was a trap! -2 coins'
  },
  {
    id: 'hidden_6',
    name: 'Golden Discovery',
    emoji: '✨',
    location_hint: 'Under the birthday cake table',
    max_scans: 3,
    reward_type: 'coins',
    reward_amount: 4,
    message: 'Golden coins sparkle as you discover them!'
  },
  {
    id: 'hidden_7',
    name: 'Thief Card',
    emoji: '🦹',
    location_hint: 'Behind the speaker',
    max_scans: 3,
    reward_type: 'card',
    reward_card_id: 'steal',
    message: 'A powerful Steal card emerges from the shadows!'
  },
  {
    id: 'hidden_8',
    name: 'Minor Mishap',
    emoji: '😅',
    location_hint: 'Under the bar counter',
    max_scans: 3,
    reward_type: 'trap',
    reward_amount: -1,
    message: 'Oops! Small mishap cost you 1 coin'
  },
  {
    id: 'hidden_9',
    name: 'Generous Gift',
    emoji: '🎁',
    location_hint: 'Near the window sill',
    max_scans: 3,
    reward_type: 'coins',
    reward_amount: 4,
    message: 'A generous gift was waiting for you!'
  },
  {
    id: 'hidden_10',
    name: 'Jackpot Spot',
    emoji: '🎰',
    location_hint: 'Behind the birthday decorations',
    max_scans: 3,
    reward_type: 'coins',
    reward_amount: 6,
    message: 'JACKPOT! You found the best hidden spot!'
  }
]

/**
 * Get hidden QR by ID
 */
export function getHiddenQRById(qrId) {
  return hiddenQRCodes.find(q => q.id === qrId)
}

/**
 * Check if QR is a hidden QR
 */
export function isHiddenQR(qrId) {
  return qrId.startsWith('hidden_')
}

/**
 * Get total possible rewards summary
 */
export function getRewardsSummary() {
  const coins = hiddenQRCodes
    .filter(q => q.reward_type === 'coins')
    .reduce((sum, q) => sum + q.reward_amount, 0)

  const traps = hiddenQRCodes
    .filter(q => q.reward_type === 'trap')
    .reduce((sum, q) => sum + q.reward_amount, 0)

  const cards = hiddenQRCodes.filter(q => q.reward_type === 'card').length

  return {
    total_coins: coins,
    total_traps: traps,
    total_cards: cards
  }
}

export default hiddenQRCodes

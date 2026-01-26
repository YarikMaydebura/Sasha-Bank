// Physical Risk Cards for Sasha Bank V2
// These match the physical card deck used at the party

export const physicalRiskCards = [
  // REWARDS - Coin gains
  {
    id: 'R1',
    name: 'Jackpot',
    type: 'reward',
    emoji: '💰',
    description: 'Win 5 coins!',
    coin_change: 5,
    level: 3
  },
  {
    id: 'R2',
    name: 'Big Win',
    type: 'reward',
    emoji: '⭐',
    description: 'Win 3 coins!',
    coin_change: 3,
    level: 2
  },
  {
    id: 'R3',
    name: 'Nice',
    type: 'reward',
    emoji: '✨',
    description: 'Win 2 coins!',
    coin_change: 2,
    level: 1
  },
  {
    id: 'R4',
    name: 'Small Win',
    type: 'reward',
    emoji: '🌟',
    description: 'Win 1 coin!',
    coin_change: 1,
    level: 1
  },

  // DARES - Tasks to complete
  {
    id: 'D1',
    name: 'Pushups',
    type: 'dare',
    emoji: '💪',
    description: 'Do 10 pushups right now!',
    level: 1
  },
  {
    id: 'D2',
    name: 'Dance Solo',
    type: 'dare',
    emoji: '💃',
    description: 'Dance solo for 20 seconds!',
    level: 1
  },
  {
    id: 'D3',
    name: 'Sing',
    type: 'dare',
    emoji: '🎤',
    description: 'Sing 15 seconds of any song out loud!',
    level: 1
  },
  {
    id: 'D4',
    name: 'Joke',
    type: 'dare',
    emoji: '😂',
    description: 'Tell a joke to the group!',
    level: 1
  },
  {
    id: 'D5',
    name: 'Compliment',
    type: 'dare',
    emoji: '💐',
    description: 'Give a dramatic compliment to a stranger!',
    level: 1
  },
  {
    id: 'D6',
    name: 'Spin',
    type: 'dare',
    emoji: '🌀',
    description: 'Spin around 5 times then walk straight!',
    level: 1
  },
  {
    id: 'D7',
    name: 'Accent',
    type: 'dare',
    emoji: '🗣️',
    description: 'Speak in a funny accent for 1 minute!',
    level: 2
  },
  {
    id: 'D8',
    name: 'Freeze Dance',
    type: 'dare',
    emoji: '🧊',
    description: 'Dance until the music stops, then freeze!',
    level: 2
  },
  {
    id: 'D9',
    name: 'Impressions',
    type: 'dare',
    emoji: '🎭',
    description: 'Do 3 celebrity impressions!',
    level: 2
  },
  {
    id: 'D10',
    name: 'Speed Story',
    type: 'dare',
    emoji: '⚡',
    description: 'Tell your life story in 30 seconds!',
    level: 2
  },

  // DRINKS - Drinking challenges
  {
    id: 'DR1',
    name: 'Sip',
    type: 'drink',
    emoji: '🍺',
    description: 'Take a sip of your drink!',
    level: 1
  },
  {
    id: 'DR2',
    name: 'Double Sip',
    type: 'drink',
    emoji: '🍺🍺',
    description: 'Take TWO sips!',
    level: 1
  },
  {
    id: 'DR3',
    name: 'Shot',
    type: 'drink',
    emoji: '🥃',
    description: 'Take a shot!',
    level: 2
  },
  {
    id: 'DR4',
    name: 'Chug',
    type: 'drink',
    emoji: '🍻',
    description: 'Chug your drink for 5 seconds!',
    level: 2
  },

  // SOCIAL - Interaction tasks
  {
    id: 'S1',
    name: 'Make Friend',
    type: 'social',
    emoji: '🤝',
    description: 'Introduce yourself to someone new! (+1 coin)',
    coin_change: 1,
    level: 1
  },
  {
    id: 'S2',
    name: 'Cheers',
    type: 'social',
    emoji: '🥂',
    description: 'Get 3+ people to cheers with you! (+2 coins)',
    coin_change: 2,
    level: 2
  },
  {
    id: 'S3',
    name: 'Birthday Wish',
    type: 'social',
    emoji: '🎂',
    description: 'Wish Sasha happy birthday creatively! (+2 coins)',
    coin_change: 2,
    level: 1
  },
  {
    id: 'S4',
    name: 'Group Photo',
    type: 'social',
    emoji: '📸',
    description: 'Take a group photo with 5+ people! (+3 coins)',
    coin_change: 3,
    level: 2
  },

  // PUNISHMENTS - Coin losses
  {
    id: 'P1',
    name: 'Oops',
    type: 'punishment',
    emoji: '💀',
    description: 'Lose 1 coin!',
    coin_change: -1,
    level: 1
  },
  {
    id: 'P2',
    name: 'Bad Luck',
    type: 'punishment',
    emoji: '🎃',
    description: 'Lose 2 coins!',
    coin_change: -2,
    level: 2
  },
  {
    id: 'P3',
    name: 'Robbery',
    type: 'punishment',
    emoji: '🦹',
    description: 'Lose 3 coins!',
    coin_change: -3,
    level: 3
  },

  // SPECIAL - Wild effects
  {
    id: 'SP1',
    name: 'Immunity',
    type: 'special',
    emoji: '🛡️',
    description: 'Immunity shield activated! Cannot lose coins for 10 minutes.',
    special: 'immunity_shield',
    level: 3
  },
  {
    id: 'SP2',
    name: 'Double Reward',
    type: 'special',
    emoji: '🎁',
    description: 'Next mission gives 2x coins!',
    special: 'double_reward',
    level: 2
  },
  {
    id: 'SP3',
    name: 'Free Drink',
    type: 'special',
    emoji: '🍹',
    description: 'Get a free drink from the bar!',
    special: 'free_drink',
    level: 2
  },
  {
    id: 'SP4',
    name: 'Wild Card',
    type: 'special',
    emoji: '🃏',
    description: 'Choose any card from the deck!',
    special: 'choose_card',
    level: 3
  },
]

// Get card by ID
export function getCardById(cardId) {
  return physicalRiskCards.find(card => card.id === cardId)
}

// Get all cards by type
export function getCardsByType(type) {
  return physicalRiskCards.filter(card => card.type === type)
}

// Get all cards by level
export function getCardsByLevel(level) {
  return physicalRiskCards.filter(card => card.level === level)
}

// Card type colors for UI
export const cardTypeColors = {
  reward: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  dare: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
  drink: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400' },
  social: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400' },
  punishment: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400' },
  special: { bg: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-400' },
}

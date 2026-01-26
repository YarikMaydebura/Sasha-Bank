export const abilities = [
  {
    id: 'skip_punishment',
    name: 'Skip Punishment',
    emoji: '🛡️',
    description: 'Auto-skip your next punishment without penalty',
    price: 3,
    category: 'defense',
    effect: 'skip_punishment',
  },
  {
    id: 'choose_song',
    name: 'Song Request',
    emoji: '🎵',
    description: 'Request any song to be played at the party',
    price: 2,
    category: 'fun',
    effect: 'song_request',
  },
  {
    id: 'immunity_shield',
    name: 'Immunity Shield',
    emoji: '🛡️',
    description: 'Block incoming punishments for 10 minutes',
    price: 4,
    category: 'defense',
    effect: 'immunity_10min',
  },
  {
    id: 'double_reward',
    name: '2x Reward',
    emoji: '💎',
    description: 'Your next mission gives 2x coins',
    price: 3,
    category: 'boost',
    effect: 'double_reward',
  },
]

export const abilityCategories = [
  { id: 'defense', name: 'Defense', color: '#3b82f6' },
  { id: 'boost', name: 'Boost', color: '#8b5cf6' },
  { id: 'fun', name: 'Fun', color: '#ec4899' },
]

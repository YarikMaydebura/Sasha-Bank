/**
 * Guest Personality Traits
 * Selected during registration, used for auto-assigning relevant missions
 */

export const guestTraits = [
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    emoji: '🦋',
    description: 'Loves meeting new people and making connections',
    color: '#EC4899',
  },
  {
    id: 'party_starter',
    name: 'Party Starter',
    emoji: '🎉',
    description: 'Gets the party going and keeps energy high',
    color: '#F59E0B',
  },
  {
    id: 'quiet_observer',
    name: 'Quiet Observer',
    emoji: '🤫',
    description: 'Prefers watching and listening, thoughtful presence',
    color: '#8B5CF6',
  },
  {
    id: 'photographer',
    name: 'Photographer',
    emoji: '📸',
    description: 'Always capturing moments and memories',
    color: '#3B82F6',
  },
  {
    id: 'dancer',
    name: 'Dancer',
    emoji: '💃',
    description: "Can't stop moving to the beat",
    color: '#EF4444',
  },
  {
    id: 'funny_person',
    name: 'Funny Person',
    emoji: '😂',
    description: 'Makes everyone laugh',
    color: '#10B981',
  },
  {
    id: 'helper',
    name: 'Helper',
    emoji: '🤝',
    description: 'Always lending a hand',
    color: '#6366F1',
  },
  {
    id: 'adventurer',
    name: 'Adventurer',
    emoji: '🌟',
    description: 'Tries everything new',
    color: '#F97316',
  },
]

/**
 * Mission templates for each trait
 * Auto-assigned when user selects their trait
 */
export const traitMissions = {
  social_butterfly: [
    {
      title: 'Meet 5 new people',
      description: 'Introduce yourself to 5 guests you haven\'t met before',
      reward: 10,
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      title: 'Start a group conversation',
      description: 'Get 4+ people talking about something fun',
      reward: 8,
      verification: 'witness',
      requires_confirmation: true,
    },
    {
      title: 'Exchange contact info',
      description: 'Exchange social media or phone numbers with 3 new friends',
      reward: 6,
      verification: 'honor',
      requires_confirmation: false,
    },
  ],
  party_starter: [
    {
      title: 'Get people dancing',
      description: 'Get at least 5 people on the dance floor',
      reward: 10,
      verification: 'witness',
      requires_confirmation: true,
    },
    {
      title: 'Start a toast',
      description: 'Lead a toast for Sasha',
      reward: 8,
      verification: 'witness',
      requires_confirmation: true,
    },
    {
      title: 'Suggest a party game',
      description: 'Organize a group activity or game',
      reward: 7,
      verification: 'honor',
      requires_confirmation: false,
    },
  ],
  quiet_observer: [
    {
      title: 'Share a thoughtful compliment',
      description: 'Give someone a meaningful compliment',
      reward: 6,
      verification: 'target',
      requires_confirmation: true,
    },
    {
      title: 'Listen to someone\'s story',
      description: 'Have a deep conversation with someone',
      reward: 7,
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      title: 'Notice something special',
      description: 'Point out something beautiful or interesting happening',
      reward: 5,
      verification: 'honor',
      requires_confirmation: false,
    },
  ],
  photographer: [
    {
      title: 'Take 10 candid photos',
      description: 'Capture spontaneous moments throughout the party',
      reward: 10,
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      title: 'Group photo',
      description: 'Organize and take a group photo of 8+ people',
      reward: 8,
      verification: 'witness',
      requires_confirmation: true,
    },
    {
      title: 'Best shot of Sasha',
      description: 'Capture an amazing photo of the birthday person',
      reward: 7,
      verification: 'honor',
      requires_confirmation: false,
    },
  ],
  dancer: [
    {
      title: 'Dance for 3 songs straight',
      description: 'Keep moving without a break',
      reward: 8,
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      title: 'Teach someone a move',
      description: 'Show someone your signature dance move',
      reward: 7,
      verification: 'target',
      requires_confirmation: true,
    },
    {
      title: 'Dance battle',
      description: 'Challenge someone to a friendly dance-off',
      reward: 10,
      verification: 'witness',
      requires_confirmation: true,
    },
  ],
  funny_person: [
    {
      title: 'Make 5 people laugh',
      description: 'Spread joy with your humor',
      reward: 8,
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      title: 'Tell your best joke',
      description: 'Share your funniest joke with a group',
      reward: 6,
      verification: 'witness',
      requires_confirmation: true,
    },
    {
      title: 'Funny photo challenge',
      description: 'Take the silliest photo of the night',
      reward: 7,
      verification: 'honor',
      requires_confirmation: false,
    },
  ],
  helper: [
    {
      title: 'Help set up or clean',
      description: 'Assist with party setup or cleanup',
      reward: 10,
      verification: 'witness',
      requires_confirmation: true,
    },
    {
      title: 'Get someone a drink',
      description: 'Bring a drink to someone who needs it',
      reward: 5,
      verification: 'target',
      requires_confirmation: true,
    },
    {
      title: 'Introduce two people',
      description: 'Help two people meet each other',
      reward: 7,
      verification: 'honor',
      requires_confirmation: false,
    },
  ],
  adventurer: [
    {
      title: 'Try every station',
      description: 'Visit Bar, Risk, Trivia, and Lottery',
      reward: 12,
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      title: 'Challenge yourself',
      description: 'Do something outside your comfort zone',
      reward: 10,
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      title: 'Start a new tradition',
      description: 'Create a fun moment that could become a party tradition',
      reward: 8,
      verification: 'witness',
      requires_confirmation: true,
    },
  ],
}

/**
 * Get missions for a specific trait
 * @param {string} traitId
 * @returns {array}
 */
export function getMissionsForTrait(traitId) {
  return traitMissions[traitId] || []
}

/**
 * Get trait by ID
 * @param {string} traitId
 * @returns {object|null}
 */
export function getTraitById(traitId) {
  return guestTraits.find((t) => t.id === traitId) || null
}

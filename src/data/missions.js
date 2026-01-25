// Mission templates for Sasha Bank
// is_personalized: true = contains {NAME} placeholder
// verification: 'honor' (self-report), 'witness' (any person), 'target' (specific person confirms)

export const missionTemplates = [
  // Generic Easy (+1 coin) - No verification needed
  {
    id: 'g1',
    text: 'Give a genuine compliment to someone you just met',
    is_personalized: false,
    difficulty: 'easy',
    reward: 1,
    verification: 'honor',
    category: 'social'
  },
  {
    id: 'g2',
    text: 'Find someone wearing the same color as you, take a selfie together',
    is_personalized: false,
    difficulty: 'easy',
    reward: 1,
    verification: 'honor',
    category: 'social'
  },
  {
    id: 'g3',
    text: 'Learn someone new\'s name and where they\'re from',
    is_personalized: false,
    difficulty: 'easy',
    reward: 1,
    verification: 'honor',
    category: 'social'
  },
  {
    id: 'g4',
    text: 'High-five 5 different people',
    is_personalized: false,
    difficulty: 'easy',
    reward: 1,
    verification: 'honor',
    category: 'social'
  },
  {
    id: 'g5',
    text: 'Find someone with the same zodiac sign as you',
    is_personalized: false,
    difficulty: 'easy',
    reward: 1,
    verification: 'honor',
    category: 'social'
  },
  {
    id: 'g6',
    text: 'Wish Sasha happy birthday in a creative way',
    is_personalized: false,
    difficulty: 'easy',
    reward: 1,
    verification: 'honor',
    category: 'party'
  },
  {
    id: 'g7',
    text: 'Find out someone\'s go-to karaoke song',
    is_personalized: false,
    difficulty: 'easy',
    reward: 1,
    verification: 'honor',
    category: 'social'
  },
  {
    id: 'g8',
    text: 'Do a "cheers" with 3 different people',
    is_personalized: false,
    difficulty: 'easy',
    reward: 1,
    verification: 'honor',
    category: 'drink'
  },

  // Generic Fun (+2 coins) - Witness verification
  {
    id: 'g9',
    text: 'Photobomb someone\'s picture without them noticing',
    is_personalized: false,
    difficulty: 'fun',
    reward: 2,
    verification: 'witness',
    category: 'party'
  },
  {
    id: 'g10',
    text: 'Get someone to teach you a dance move, then do it',
    is_personalized: false,
    difficulty: 'fun',
    reward: 2,
    verification: 'witness',
    category: 'party'
  },
  {
    id: 'g11',
    text: 'Start a "cheers" chain of 4+ people',
    is_personalized: false,
    difficulty: 'fun',
    reward: 2,
    verification: 'witness',
    category: 'party'
  },
  {
    id: 'g12',
    text: 'Tell a joke that makes at least 2 people laugh',
    is_personalized: false,
    difficulty: 'fun',
    reward: 2,
    verification: 'witness',
    category: 'social'
  },
  {
    id: 'g13',
    text: 'Trade an accessory with someone for 10 minutes',
    is_personalized: false,
    difficulty: 'fun',
    reward: 2,
    verification: 'witness',
    category: 'social'
  },
  {
    id: 'g14',
    text: 'Get 3 people to do a group pose for a photo',
    is_personalized: false,
    difficulty: 'fun',
    reward: 2,
    verification: 'witness',
    category: 'party'
  },
  {
    id: 'g15',
    text: 'Make up a secret handshake with a stranger',
    is_personalized: false,
    difficulty: 'fun',
    reward: 2,
    verification: 'witness',
    category: 'social'
  },

  // Generic Bold (+3 coins)
  {
    id: 'g16',
    text: 'Lead a toast to Sasha (at least 5 people join)',
    is_personalized: false,
    difficulty: 'bold',
    reward: 3,
    verification: 'witness',
    category: 'bold'
  },
  {
    id: 'g17',
    text: 'Sing Happy Birthday to Sasha solo',
    is_personalized: false,
    difficulty: 'bold',
    reward: 3,
    verification: 'witness',
    category: 'bold'
  },
  {
    id: 'g18',
    text: 'Start a conga line with 3+ people',
    is_personalized: false,
    difficulty: 'bold',
    reward: 3,
    verification: 'witness',
    category: 'bold'
  },

  // Personalized - Games (+2 coins)
  {
    id: 'p1',
    text: 'Beat {NAME} in Rock Paper Scissors (best of 3)',
    is_personalized: true,
    difficulty: 'fun',
    reward: 2,
    verification: 'target',
    category: 'game'
  },
  {
    id: 'p2',
    text: 'Challenge {NAME} to a staring contest (10 seconds)',
    is_personalized: true,
    difficulty: 'fun',
    reward: 2,
    verification: 'target',
    category: 'game'
  },
  {
    id: 'p3',
    text: 'Thumb war with {NAME}',
    is_personalized: true,
    difficulty: 'fun',
    reward: 2,
    verification: 'target',
    category: 'game'
  },

  // Personalized - Social (+1-2 coins)
  {
    id: 'p4',
    text: 'Find out {NAME}\'s favorite movie',
    is_personalized: true,
    difficulty: 'easy',
    reward: 1,
    verification: 'target',
    category: 'social'
  },
  {
    id: 'p5',
    text: 'Ask {NAME} about their best travel memory',
    is_personalized: true,
    difficulty: 'easy',
    reward: 1,
    verification: 'target',
    category: 'social'
  },
  {
    id: 'p6',
    text: 'Discover {NAME}\'s hidden talent',
    is_personalized: true,
    difficulty: 'fun',
    reward: 1,
    verification: 'target',
    category: 'social'
  },
  {
    id: 'p7',
    text: 'Learn how {NAME} knows Sasha',
    is_personalized: true,
    difficulty: 'easy',
    reward: 1,
    verification: 'target',
    category: 'social'
  },
  {
    id: 'p8',
    text: 'Take a selfie with {NAME}',
    is_personalized: true,
    difficulty: 'fun',
    reward: 2,
    verification: 'target',
    category: 'social'
  },
  {
    id: 'p9',
    text: 'Get {NAME} to dance with you for 10 seconds',
    is_personalized: true,
    difficulty: 'fun',
    reward: 2,
    verification: 'target',
    category: 'party'
  },
  {
    id: 'p10',
    text: 'Make {NAME} laugh (genuinely!)',
    is_personalized: true,
    difficulty: 'fun',
    reward: 2,
    verification: 'target',
    category: 'social'
  },

  // Personalized - Drinks (+2 coins)
  {
    id: 'p11',
    text: 'Do a "cheers" with {NAME}',
    is_personalized: true,
    difficulty: 'fun',
    reward: 2,
    verification: 'target',
    category: 'drink'
  },
  {
    id: 'p12',
    text: 'Take a shot with {NAME}',
    is_personalized: true,
    difficulty: 'fun',
    reward: 2,
    verification: 'target',
    category: 'drink'
  },
]

// Get missions by type
export function getGenericMissions() {
  return missionTemplates.filter(m => !m.is_personalized)
}

export function getPersonalizedMissions() {
  return missionTemplates.filter(m => m.is_personalized)
}

export function getMissionsByDifficulty(difficulty) {
  return missionTemplates.filter(m => m.difficulty === difficulty)
}

// Generate mission text with name
export function generateMissionText(template, targetName) {
  return template.text.replace('{NAME}', targetName)
}

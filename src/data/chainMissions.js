/**
 * Chain Missions (Scavenger Hunt) - V3.0
 * 5 chains × 5 steps = 25 QR codes
 * Reward: 8 coins for completing a chain
 */

export const chainMissions = [
  {
    id: 'kitchen_explorer',
    name: 'Kitchen Explorer',
    emoji: '🍳',
    description: 'Explore the kitchen area and find all hidden spots',
    reward: 8,
    steps: [
      {
        step: 1,
        qr_id: 'chain_kitchen_1',
        hint: 'Start at the fridge - look for something magnetic',
        location: 'Near the refrigerator'
      },
      {
        step: 2,
        qr_id: 'chain_kitchen_2',
        hint: 'Where do dirty dishes go to get clean?',
        location: 'Near the dishwasher or sink'
      },
      {
        step: 3,
        qr_id: 'chain_kitchen_3',
        hint: 'Check where the snacks are stored',
        location: 'Snack cabinet or pantry'
      },
      {
        step: 4,
        qr_id: 'chain_kitchen_4',
        hint: 'Something is brewing here...',
        location: 'Coffee/tea station'
      },
      {
        step: 5,
        qr_id: 'chain_kitchen_5',
        hint: 'The final clue is where we serve food',
        location: 'Serving counter or table'
      }
    ]
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    emoji: '🦋',
    description: 'Meet specific people and collect their signatures',
    reward: 8,
    steps: [
      {
        step: 1,
        qr_id: 'chain_social_1',
        hint: 'Find someone wearing something blue',
        location: 'Ask around'
      },
      {
        step: 2,
        qr_id: 'chain_social_2',
        hint: 'Find someone who arrived in the last 30 minutes',
        location: 'Ask recent arrivals'
      },
      {
        step: 3,
        qr_id: 'chain_social_3',
        hint: 'Find the tallest person at the party',
        location: 'Look around'
      },
      {
        step: 4,
        qr_id: 'chain_social_4',
        hint: 'Find someone who knows Sasha the longest',
        location: 'Ask about friendships'
      },
      {
        step: 5,
        qr_id: 'chain_social_5',
        hint: 'Find Sasha herself for the final stamp!',
        location: 'Birthday girl'
      }
    ]
  },
  {
    id: 'snack_hunter',
    name: 'Snack Hunter',
    emoji: '🍿',
    description: 'Find all the hidden snack stations',
    reward: 8,
    steps: [
      {
        step: 1,
        qr_id: 'chain_snack_1',
        hint: 'Sweet treats are hiding near something comfortable',
        location: 'Near seating area'
      },
      {
        step: 2,
        qr_id: 'chain_snack_2',
        hint: 'Salty snacks are close to where drinks flow',
        location: 'Near bar/drinks area'
      },
      {
        step: 3,
        qr_id: 'chain_snack_3',
        hint: 'Healthy options are near the window',
        location: 'Window area'
      },
      {
        step: 4,
        qr_id: 'chain_snack_4',
        hint: 'Special treats are hidden in the corner',
        location: 'Corner of room'
      },
      {
        step: 5,
        qr_id: 'chain_snack_5',
        hint: 'The grand snack finale is at the main table',
        location: 'Main food table'
      }
    ]
  },
  {
    id: 'mystery_trail',
    name: 'Mystery Trail',
    emoji: '🔍',
    description: 'Follow the riddles to uncover the mystery',
    reward: 8,
    steps: [
      {
        step: 1,
        qr_id: 'chain_mystery_1',
        hint: 'I reflect your image but am not a mirror. Find me near the entrance.',
        location: 'Shiny surface near door'
      },
      {
        step: 2,
        qr_id: 'chain_mystery_2',
        hint: 'I make light but am not the sun. Look up!',
        location: 'Near a lamp or light fixture'
      },
      {
        step: 3,
        qr_id: 'chain_mystery_3',
        hint: 'Words live here but no one speaks. Check the bookshelf.',
        location: 'Bookshelf or magazine rack'
      },
      {
        step: 4,
        qr_id: 'chain_mystery_4',
        hint: 'I keep things cold but my heart is warm. Back to the kitchen!',
        location: 'Fridge magnet or nearby'
      },
      {
        step: 5,
        qr_id: 'chain_mystery_5',
        hint: 'The mystery ends where celebrations begin - find the birthday decorations!',
        location: 'Birthday decoration area'
      }
    ]
  },
  {
    id: 'night_owl',
    name: 'Night Owl Quest',
    emoji: '🦉',
    description: 'Complete time-based challenges throughout the party',
    reward: 8,
    steps: [
      {
        step: 1,
        qr_id: 'chain_owl_1',
        hint: 'Dance floor is calling - find the DJ station',
        location: 'Music/DJ area'
      },
      {
        step: 2,
        qr_id: 'chain_owl_2',
        hint: 'Where do party photos happen?',
        location: 'Photo area or backdrop'
      },
      {
        step: 3,
        qr_id: 'chain_owl_3',
        hint: 'Find the coziest spot to sit',
        location: 'Comfortable seating area'
      },
      {
        step: 4,
        qr_id: 'chain_owl_4',
        hint: 'Check near the games station',
        location: 'Game table or activity area'
      },
      {
        step: 5,
        qr_id: 'chain_owl_5',
        hint: 'The night ends where it began - return to the entrance',
        location: 'Entrance area'
      }
    ]
  }
]

/**
 * Get chain by ID
 */
export function getChainById(chainId) {
  return chainMissions.find(c => c.id === chainId)
}

/**
 * Get step by QR code ID
 */
export function getStepByQRId(qrId) {
  for (const chain of chainMissions) {
    const step = chain.steps.find(s => s.qr_id === qrId)
    if (step) {
      return { chain, step }
    }
  }
  return null
}

/**
 * Check if QR is a chain QR
 */
export function isChainQR(qrId) {
  return qrId.startsWith('chain_')
}

export default chainMissions

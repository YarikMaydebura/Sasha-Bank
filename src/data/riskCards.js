// Risk card effects for Sasha Bank
// tier: 1, 2, 3 corresponds to bet amount
// probability: relative weight for random selection

export const riskCards = [
  // LUCKY CARDS - Coin gains
  {
    id: 'lucky1',
    type: 'lucky',
    effect: 'JACKPOT',
    display_text: 'JACKPOT! +3 coins!',
    coin_change: 3,
    emoji: '⭐⭐⭐',
    probability: 0.05
  },
  {
    id: 'lucky2',
    type: 'lucky',
    effect: 'NICE_WIN',
    display_text: 'Nice win! +2 coins!',
    coin_change: 2,
    emoji: '⭐⭐',
    probability: 0.10
  },
  {
    id: 'lucky3',
    type: 'lucky',
    effect: 'SMALL_WIN',
    display_text: 'Small win! +1 coin!',
    coin_change: 1,
    emoji: '⭐',
    probability: 0.15
  },

  // DRINK CARDS - No coin change, just drink
  {
    id: 'drink1',
    type: 'drink',
    effect: 'SIP',
    display_text: 'Take a sip of your drink!',
    coin_change: 0,
    emoji: '🍺',
    probability: 0.10
  },
  {
    id: 'drink2',
    type: 'drink',
    effect: 'DOUBLE_SIP',
    display_text: 'Take TWO sips!',
    coin_change: 0,
    emoji: '🍺🍺',
    probability: 0.08
  },
  {
    id: 'drink3',
    type: 'drink',
    effect: 'SHOT',
    display_text: 'Take a shot! (or finish your drink)',
    coin_change: 0,
    emoji: '🥃',
    probability: 0.05
  },

  // DARE CARDS - Do task or drink + lose bet
  {
    id: 'dare1',
    type: 'dare',
    effect: 'PUSHUPS',
    display_text: 'Do 10 PUSHUPS right now!',
    task: 'Do 10 pushups',
    coin_change: 0,
    emoji: '💪',
    probability: 0.08
  },
  {
    id: 'dare2',
    type: 'dare',
    effect: 'DANCE',
    display_text: 'DANCE for 15 seconds! (no music needed)',
    task: 'Dance for 15 seconds',
    coin_change: 0,
    emoji: '💃',
    probability: 0.08
  },
  {
    id: 'dare3',
    type: 'dare',
    effect: 'SING',
    display_text: 'SING 10 seconds of any song out loud!',
    task: 'Sing for 10 seconds',
    coin_change: 0,
    emoji: '🎤',
    probability: 0.06
  },
  {
    id: 'dare4',
    type: 'dare',
    effect: 'JOKE',
    display_text: 'Tell a JOKE to the nearest group!',
    task: 'Tell a joke',
    coin_change: 0,
    emoji: '😂',
    probability: 0.06
  },
  {
    id: 'dare5',
    type: 'dare',
    effect: 'COMPLIMENT',
    display_text: 'Give an EXAGGERATED compliment to a stranger!',
    task: 'Give dramatic compliment',
    coin_change: 0,
    emoji: '🙆',
    probability: 0.06
  },
  {
    id: 'dare6',
    type: 'dare',
    effect: 'SPIN',
    display_text: 'Spin around 5 times then walk straight!',
    task: 'Spin and walk',
    coin_change: 0,
    emoji: '🌀',
    probability: 0.05
  },

  // DRINK & DARE CARDS - Both for bonus coins
  {
    id: 'dd1',
    type: 'drink_dare',
    effect: 'SHOT_STORY',
    display_text: 'Take a SHOT, then tell your most embarrassing story!',
    task: 'Shot + embarrassing story',
    coin_change: 3,
    emoji: '🥃💬',
    probability: 0.03
  },
  {
    id: 'dd2',
    type: 'drink_dare',
    effect: 'SIP_JUMPING',
    display_text: 'Take a SIP, then do 20 jumping jacks!',
    task: 'Sip + 20 jumping jacks',
    coin_change: 2,
    emoji: '🍺💪',
    probability: 0.04
  },
  {
    id: 'dd3',
    type: 'drink_dare',
    effect: 'SHOT_SERENADE',
    display_text: 'Take a SHOT, then SERENADE the nearest person!',
    task: 'Shot + serenade someone',
    coin_change: 4,
    emoji: '🥃🎤',
    probability: 0.02
  },

  // SOCIAL CARDS - Interact for coins
  {
    id: 'social1',
    type: 'social',
    effect: 'MAKE_FRIEND',
    display_text: 'Introduce yourself to someone new! (+1 coin)',
    coin_change: 1,
    emoji: '🤝',
    probability: 0.05
  },
  {
    id: 'social2',
    type: 'social',
    effect: 'CHEERS',
    display_text: 'Get 3+ people to CHEERS with you! (+2 coins)',
    coin_change: 2,
    emoji: '🥂',
    probability: 0.04
  },
  {
    id: 'social3',
    type: 'social',
    effect: 'BIRTHDAY_WISH',
    display_text: 'Wish SASHA happy birthday creatively! (+2 coins)',
    coin_change: 2,
    emoji: '🎉',
    probability: 0.04
  },

  // UNLUCKY CARDS - Coin losses
  {
    id: 'unlucky1',
    type: 'unlucky',
    effect: 'OOPS',
    display_text: 'Oops! -1 coin (or drink to cancel)',
    coin_change: -1,
    emoji: '💀',
    can_drink_cancel: true,
    probability: 0.08
  },
  {
    id: 'unlucky2',
    type: 'unlucky',
    effect: 'BAD_LUCK',
    display_text: 'Bad luck! -2 coins (or take a SHOT to cancel)',
    coin_change: -2,
    emoji: '💀💀',
    can_drink_cancel: true,
    probability: 0.05
  },
  {
    id: 'unlucky3',
    type: 'unlucky',
    effect: 'GENEROUS',
    display_text: 'Give 1 coin to the next person you see!',
    coin_change: -1,
    emoji: '💸',
    special: 'give_to_next',
    probability: 0.04
  },

  // SPECIAL CARDS - Wild effects
  {
    id: 'special1',
    type: 'special',
    effect: 'IMMUNITY',
    display_text: 'IMMUNITY! Can\'t lose coins for 15 minutes!',
    coin_change: 0,
    emoji: '🛡️',
    special: 'immunity',
    probability: 0.02
  },
  {
    id: 'special2',
    type: 'special',
    effect: 'SWAP',
    display_text: 'SWAP your balance with the nearest person!',
    coin_change: 0,
    emoji: '🔄',
    special: 'swap',
    probability: 0.02
  },
  {
    id: 'special3',
    type: 'special',
    effect: 'DOUBLE_NOTHING',
    display_text: 'DOUBLE OR NOTHING! Flip a coin: Heads +4, Tails -2',
    coin_change: 0,
    emoji: '🎁',
    special: 'coin_flip',
    probability: 0.02
  },
]

// Draw a random card using weighted probability
export function drawRiskCard() {
  const totalWeight = riskCards.reduce((sum, card) => sum + card.probability, 0)
  let random = Math.random() * totalWeight

  for (const card of riskCards) {
    random -= card.probability
    if (random <= 0) return card
  }

  return riskCards[riskCards.length - 1]
}

// Get cards by type
export function getCardsByType(type) {
  return riskCards.filter(card => card.type === type)
}

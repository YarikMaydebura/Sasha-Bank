export const photoPrompts = [
  {
    id: 'selfie_with_birthday',
    text: 'Take a selfie with the birthday girl!',
    emoji: '🎂',
  },
  {
    id: 'group_photo',
    text: 'Get 5+ people in one photo',
    emoji: '👥',
  },
  {
    id: 'silly_face',
    text: 'Make the silliest face you can',
    emoji: '😜',
  },
  {
    id: 'dance_move',
    text: 'Capture someone doing their best dance move',
    emoji: '💃',
  },
  {
    id: 'favorite_drink',
    text: 'Photo with your favorite drink from the bar',
    emoji: '🍹',
  },
  {
    id: 'new_friend',
    text: 'Photo with someone you just met tonight',
    emoji: '🤝',
  },
  {
    id: 'party_decorations',
    text: 'Find the coolest party decoration',
    emoji: '🎈',
  },
  {
    id: 'food_photo',
    text: 'Artistic shot of the party food',
    emoji: '🍕',
  },
  {
    id: 'action_shot',
    text: 'Capture someone mid-action (jumping, dancing, etc)',
    emoji: '⚡',
  },
  {
    id: 'mirror_selfie',
    text: 'Take a mirror selfie',
    emoji: '🪞',
  },
  {
    id: 'shoes',
    text: 'Photo of the coolest shoes at the party',
    emoji: '👟',
  },
  {
    id: 'laugh',
    text: 'Capture someone laughing',
    emoji: '😂',
  },
  {
    id: 'toast',
    text: 'Photo of people toasting',
    emoji: '🥂',
  },
  {
    id: 'pets',
    text: 'Find a pet at the party (if any)',
    emoji: '🐾',
  },
  {
    id: 'outside',
    text: 'Take a photo outside the party venue',
    emoji: '🌙',
  },
]

export function getRandomPrompt() {
  return photoPrompts[Math.floor(Math.random() * photoPrompts.length)]
}

/**
 * Guest Traits Database for V3.0 Mission System
 * 23 guests with personal facts for trait-based mission generation
 */

export const guests = [
  {
    name: 'Catherine',
    traits: {
      country: 'Germany',
      name_starts: 'C',
      unique: 'Dates a Dutch guy, met him while throwing trash'
    }
  },
  {
    name: 'Inbal',
    traits: {
      hobby: 'Set card game',
      unique: 'Best Set player in the world'
    }
  },
  {
    name: 'Jess',
    traits: {
      role: 'Fizz organizer',
      unique: 'Organizes activities at The Fizz'
    }
  },
  {
    name: 'Laura',
    traits: {
      city: 'Amsterdam',
      study: 'Law',
      studied_in: 'Leiden'
    }
  },
  {
    name: 'Michelle',
    traits: {
      city: 'The Hague',
      study: 'Law',
      country_origin: 'Slovakia',
      grew_up: 'USA'
    }
  },
  {
    name: 'Nadia',
    traits: {
      study: 'AI',
      exchange: 'Korea',
      minor: 'Law'
    }
  },
  {
    name: 'Ralou',
    traits: {
      skill: 'Many languages',
      country_origin: 'Greece',
      lived_in: ['Spain', 'Netherlands']
    }
  },
  {
    name: 'Ryan',
    traits: {
      work: 'Company',
      dream: 'Wanted to be a teacher'
    }
  },
  {
    name: 'Adela',
    traits: {
      country_origin: 'Slovakia',
      study: 'AI',
      university: 'Delft'
    }
  },
  {
    name: 'Diteng',
    traits: {
      knowledge: 'Biology expert',
      unique: "Knows most about biology but doesn't study it"
    }
  },
  {
    name: 'Gen',
    traits: {
      hobby: 'Board games',
      location: 'The Fizz',
      unique: 'Ask how to spell his name'
    }
  },
  {
    name: 'Ivan',
    traits: {
      country: 'Bulgaria',
      likes: "Fisherman's Friend candies"
    }
  },
  {
    name: 'Jelke',
    traits: {
      unique: 'Forgot clothes in locker, left without money for entire day'
    }
  },
  {
    name: 'Kathryn',
    traits: {
      unique: 'Has the best story about the shaker'
    }
  },
  {
    name: 'Lynn',
    traits: {
      education: 'Circus school',
      unique: 'Studied in a circus school'
    }
  },
  {
    name: 'Maksim',
    traits: {
      hobby: 'Nature',
      unique: 'Hobby is spending time in nature'
    }
  },
  {
    name: 'Matiss',
    traits: {
      achievement: 'Thesis publication',
      unique: 'Went to a conference with his thesis'
    }
  },
  {
    name: 'Raphael',
    traits: {
      unique: "Got stuck in Netherlands, couldn't go to Istanbul on time"
    }
  },
  {
    name: 'Sonya',
    traits: {
      sport: 'Ice skating',
      unique: 'Used to do ice skating'
    }
  },
  {
    name: 'Veronika',
    traits: {
      lived_in: 'Australia'
    }
  },
  {
    name: 'Uliana',
    traits: {
      unique: 'Showed Sasha the best Belarusian restaurant in Netherlands'
    }
  },
  {
    name: 'Janka',
    traits: {
      study: 'Psychology',
      unique: 'Only person studying psychology at the party'
    }
  },
  {
    name: 'Aleksandra',
    nickname: 'Sasha',
    is_birthday: true,
    traits: {
      sport: 'Rhythmic gymnastics',
      role: 'Birthday girl'
    }
  }
]

/**
 * Generate mission text based on guest trait
 */
export function generateSimpleMission(guest) {
  const missions = []
  const traits = guest.traits

  // V3.0: Trait missions reward 10 coins (was 5)
  if (traits.country) {
    missions.push({
      text: `Find someone from ${traits.country}`,
      answer: guest.name,
      reward: 10
    })
  }

  if (traits.country_origin) {
    missions.push({
      text: `Find someone originally from ${traits.country_origin}`,
      answer: guest.name,
      reward: 10
    })
  }

  if (traits.study) {
    missions.push({
      text: `Find someone who studies ${traits.study}`,
      answer: guest.name,
      reward: 10
    })
  }

  if (traits.hobby) {
    missions.push({
      text: `Find someone whose hobby is ${traits.hobby}`,
      answer: guest.name,
      reward: 10
    })
  }

  if (traits.sport) {
    missions.push({
      text: `Find someone who did ${traits.sport}`,
      answer: guest.name,
      reward: 10
    })
  }

  if (traits.city) {
    missions.push({
      text: `Find someone who lives in ${traits.city}`,
      answer: guest.name,
      reward: 10
    })
  }

  if (traits.unique) {
    missions.push({
      text: `Find someone who: ${traits.unique}`,
      answer: guest.name,
      reward: 10
    })
  }

  return missions
}

/**
 * Generate hard mission (2 traits) for higher reward
 */
export function generateHardMission(guest1, guest2) {
  const trait1 = Object.entries(guest1.traits)[0]
  const trait2 = Object.entries(guest2.traits)[0]

  if (trait1 && trait2) {
    return {
      text: `Find 2 people: one who ${formatTrait(trait1)} AND one who ${formatTrait(trait2)}`,
      answers: [guest1.name, guest2.name],
      reward: 10
    }
  }
  return null
}

function formatTrait([key, value]) {
  const formats = {
    country: `is from ${value}`,
    country_origin: `is originally from ${value}`,
    study: `studies ${value}`,
    hobby: `loves ${value}`,
    sport: `did ${value}`,
    city: `lives in ${value}`,
    unique: value,
    skill: `has ${value}`,
    work: `works at a ${value}`,
    education: `studied at ${value}`,
  }
  return formats[key] || value
}

/**
 * Birthday missions for Sasha
 */
export const birthdayMissions = [
  { text: 'Give Sasha a hug', reward: 5, verification: 'witness' },
  { text: 'Take a selfie with Sasha', reward: 5, verification: 'photo' },
  { text: 'Wish Sasha happy birthday in a creative way', reward: 5, verification: 'witness' },
  { text: 'Learn one thing about rhythmic gymnastics from Sasha', reward: 5, verification: 'honor' },
  { text: 'Share your favorite memory with Sasha', reward: 5, verification: 'honor' },
  { text: 'Dance with Sasha for 30 seconds', reward: 5, verification: 'witness' },
  { text: 'Give Sasha a compliment', reward: 5, verification: 'honor' },
]

/**
 * Get random simple missions for a user
 */
export function getRandomSimpleMissions(count = 2, excludeNames = []) {
  const availableGuests = guests.filter(g => !excludeNames.includes(g.name) && !g.is_birthday)
  const shuffled = availableGuests.sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, count)

  const missions = []
  for (const guest of selected) {
    const guestMissions = generateSimpleMission(guest)
    if (guestMissions.length > 0) {
      // Pick random mission from available for this guest
      const randomMission = guestMissions[Math.floor(Math.random() * guestMissions.length)]
      missions.push(randomMission)
    }
  }

  return missions
}

/**
 * Get random birthday mission
 */
export function getRandomBirthdayMission() {
  return birthdayMissions[Math.floor(Math.random() * birthdayMissions.length)]
}

export default guests

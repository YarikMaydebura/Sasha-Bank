import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Mission templates for each trait
const traitMissions = {
  social_butterfly: [
    {
      id: 'social_butterfly_1',
      title: 'Meet 5 new people',
      reward: 10,
      difficulty: 'easy',
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      id: 'social_butterfly_2',
      title: 'Start a group conversation',
      reward: 8,
      difficulty: 'medium',
      verification: 'witness',
      requires_confirmation: true,
    },
    {
      id: 'social_butterfly_3',
      title: 'Exchange contact info with 3 new friends',
      reward: 6,
      difficulty: 'easy',
      verification: 'honor',
      requires_confirmation: false,
    },
  ],
  party_starter: [
    {
      id: 'party_starter_1',
      title: 'Get 5 people on the dance floor',
      reward: 10,
      difficulty: 'medium',
      verification: 'witness',
      requires_confirmation: true,
    },
    {
      id: 'party_starter_2',
      title: 'Lead a toast or cheer',
      reward: 8,
      difficulty: 'medium',
      verification: 'witness',
      requires_confirmation: true,
    },
    {
      id: 'party_starter_3',
      title: 'Start a party game',
      reward: 10,
      difficulty: 'hard',
      verification: 'witness',
      requires_confirmation: true,
    },
  ],
  quiet_observer: [
    {
      id: 'quiet_observer_1',
      title: 'Find and talk to another quiet guest',
      reward: 8,
      difficulty: 'medium',
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      id: 'quiet_observer_2',
      title: 'Capture 3 candid photos',
      reward: 10,
      difficulty: 'easy',
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      id: 'quiet_observer_3',
      title: 'Help someone behind the scenes',
      reward: 8,
      difficulty: 'medium',
      verification: 'honor',
      requires_confirmation: false,
    },
  ],
  photographer: [
    {
      id: 'photographer_1',
      title: 'Take 10 photos of guests',
      reward: 10,
      difficulty: 'easy',
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      id: 'photographer_2',
      title: 'Get a group photo of 8+ people',
      reward: 10,
      difficulty: 'medium',
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      id: 'photographer_3',
      title: 'Capture the best moment of the party',
      reward: 12,
      difficulty: 'hard',
      verification: 'honor',
      requires_confirmation: false,
    },
  ],
  dancer: [
    {
      id: 'dancer_1',
      title: 'Dance for 3 different songs',
      reward: 8,
      difficulty: 'easy',
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      id: 'dancer_2',
      title: 'Teach someone a dance move',
      reward: 10,
      difficulty: 'medium',
      verification: 'witness',
      requires_confirmation: true,
    },
    {
      id: 'dancer_3',
      title: 'Get the whole room dancing',
      reward: 15,
      difficulty: 'hard',
      verification: 'witness',
      requires_confirmation: true,
    },
  ],
  funny_person: [
    {
      id: 'funny_person_1',
      title: 'Make 5 different people laugh',
      reward: 10,
      difficulty: 'medium',
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      id: 'funny_person_2',
      title: 'Tell a joke to a group',
      reward: 8,
      difficulty: 'medium',
      verification: 'witness',
      requires_confirmation: true,
    },
    {
      id: 'funny_person_3',
      title: 'Start a funny story chain',
      reward: 10,
      difficulty: 'hard',
      verification: 'witness',
      requires_confirmation: true,
    },
  ],
  helper: [
    {
      id: 'helper_1',
      title: 'Help set up or clean up',
      reward: 10,
      difficulty: 'easy',
      verification: 'witness',
      requires_confirmation: true,
    },
    {
      id: 'helper_2',
      title: 'Introduce 2 people who should meet',
      reward: 8,
      difficulty: 'medium',
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      id: 'helper_3',
      title: 'Help someone in need',
      reward: 12,
      difficulty: 'medium',
      verification: 'honor',
      requires_confirmation: false,
    },
  ],
  adventurer: [
    {
      id: 'adventurer_1',
      title: 'Try every game at the party',
      reward: 15,
      difficulty: 'hard',
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      id: 'adventurer_2',
      title: 'Do something you normally wouldn\'t',
      reward: 12,
      difficulty: 'hard',
      verification: 'honor',
      requires_confirmation: false,
    },
    {
      id: 'adventurer_3',
      title: 'Complete a dare successfully',
      reward: 10,
      difficulty: 'medium',
      verification: 'witness',
      requires_confirmation: true,
    },
  ],
}

async function fixExistingUsers() {
  console.log('🔧 Fixing existing users without traits/missions...\n')

  // Get all users
  const { data: allUsers, error: usersError } = await supabase
    .from('users')
    .select('id, name')
    .order('created_at')

  if (usersError) {
    console.error('❌ Error fetching users:', usersError.message)
    return
  }

  console.log(`Found ${allUsers?.length || 0} total users\n`)

  // Get users who already have traits
  const { data: usersWithTraits, error: traitsError } = await supabase
    .from('guest_traits')
    .select('user_id')

  if (traitsError) {
    console.error('❌ Error fetching traits:', traitsError.message)
    return
  }

  const userIdsWithTraits = new Set(usersWithTraits?.map((t) => t.user_id) || [])

  // Filter users without traits
  const usersWithoutTraits = allUsers.filter((u) => !userIdsWithTraits.has(u.id))

  console.log(`Found ${usersWithoutTraits.length} users without traits\n`)

  if (usersWithoutTraits.length === 0) {
    console.log('✅ All users already have traits!')
    return
  }

  for (const user of usersWithoutTraits) {
    // Randomly assign a trait
    const traits = [
      'social_butterfly',
      'quiet_observer',
      'party_starter',
      'photographer',
      'dancer',
      'funny_person',
      'helper',
      'adventurer',
    ]
    const randomTrait = traits[Math.floor(Math.random() * traits.length)]

    console.log(`Assigning trait "${randomTrait}" to ${user.name}...`)

    // Insert trait
    const { error: traitError } = await supabase.from('guest_traits').insert({
      user_id: user.id,
      trait_category: randomTrait,
    })

    if (traitError) {
      console.error(`  ❌ Failed to assign trait: ${traitError.message}`)
      continue
    }

    // Get missions for this trait
    const missions = traitMissions[randomTrait] || []
    const selectedMissions = missions.slice(0, 3)

    // Insert missions with CORRECT field names
    const missionsToInsert = selectedMissions.map((mission) => ({
      user_id: user.id,
      template_id: mission.id,
      generated_text: mission.title,
      reward: mission.reward,
      difficulty: mission.difficulty || 'medium',
      verification: mission.verification,
      requires_confirmation: mission.requires_confirmation || false,
      trait_category: randomTrait,
      status: 'assigned',
    }))

    const { error: missionsError } = await supabase
      .from('user_missions')
      .insert(missionsToInsert)

    if (missionsError) {
      console.error(`  ❌ Failed to assign missions: ${missionsError.message}`)
      continue
    }

    console.log(`  ✅ Assigned ${missionsToInsert.length} missions\n`)
  }

  console.log('\n✅ All existing users fixed!')
  console.log('\nSummary:')
  console.log(`  Total users: ${allUsers.length}`)
  console.log(`  Users fixed: ${usersWithoutTraits.length}`)
  console.log(`  Users already had traits: ${userIdsWithTraits.size}`)
}

fixExistingUsers().catch(console.error)

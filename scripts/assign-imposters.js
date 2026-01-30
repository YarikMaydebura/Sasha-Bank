import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Assign 2 random users as imposters with secret steal missions
 * Run: node scripts/assign-imposters.js
 *
 * Options:
 *   --force    Remove existing imposters and assign new ones
 */
async function assignImposters() {
  const forceReassign = process.argv.includes('--force')

  console.log('🥷 Sasha Bank - Imposter Assignment\n')

  try {
    // Get all non-admin users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .eq('is_admin', false)

    if (usersError) throw usersError

    if (!users || users.length < 3) {
      console.log('❌ Need at least 3 registered users to assign imposters')
      console.log(`   Current users: ${users?.length || 0}`)
      return
    }

    console.log(`📋 Found ${users.length} registered users`)

    // Check if imposters already assigned
    const { data: existingImposters } = await supabase
      .from('user_missions')
      .select('id, user_id')
      .eq('is_secret', true)
      .eq('status', 'assigned')

    if (existingImposters && existingImposters.length >= 2) {
      const imposterIds = existingImposters.map(i => i.user_id)
      const imposterNames = users.filter(u => imposterIds.includes(u.id)).map(u => u.name)

      if (!forceReassign) {
        console.log('\n⏭️  Imposters already assigned!')
        console.log(`   Current imposters: ${imposterNames.join(', ')}`)
        console.log('\n   To reassign, run: node scripts/assign-imposters.js --force')
        return
      }

      // Force reassign - delete existing
      console.log('\n🔄 Force reassign enabled - removing existing imposters...')
      for (const existing of existingImposters) {
        await supabase.from('user_missions').delete().eq('id', existing.id)
      }
      console.log('   Removed existing imposter missions')
    }

    // Shuffle users and pick 2 random imposters
    const shuffled = [...users].sort(() => Math.random() - 0.5)
    const imposters = shuffled.slice(0, 2)

    console.log(`\n🎭 Selected imposters:`)

    // Assign steal missions to each imposter
    for (const imposter of imposters) {
      // Pick a random victim (not the imposter themselves and not another imposter)
      const potentialVictims = users.filter(u =>
        u.id !== imposter.id &&
        !imposters.some(i => i.id === u.id)
      )

      // If all non-imposters are valid victims
      const victim = potentialVictims.length > 0
        ? potentialVictims[Math.floor(Math.random() * potentialVictims.length)]
        : users.find(u => u.id !== imposter.id) // fallback

      // Create secret steal mission (requires V3 migrations to be run first!)
      const { error: missionError } = await supabase.from('user_missions').insert({
        user_id: imposter.id,
        generated_text: `🥷 SECRET MISSION: Steal coins from ${victim.name}! Scan their QR code to attempt.`,
        reward: 5,
        status: 'assigned',
        verification: 'qr',
        is_secret: true,
        target_user_id: victim.id
      })

      if (missionError) {
        console.log(`   ❌ ${imposter.name}: Failed - ${missionError.message}`)
      } else {
        console.log(`   ✅ ${imposter.name} → target: ${victim.name}`)
      }
    }

    console.log('\n🎉 Imposters assigned successfully!')
    console.log('\n📝 How it works:')
    console.log('   - Imposters see a "SECRET MISSION" in their missions list')
    console.log('   - They must scan their target\'s QR code to attempt steal')
    console.log('   - Victim gets 10 seconds to DODGE')
    console.log('   - If victim has Shield card, steal is auto-blocked')
    console.log('   - Successful steal: +5 coins for imposter, -5 for victim')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

assignImposters()

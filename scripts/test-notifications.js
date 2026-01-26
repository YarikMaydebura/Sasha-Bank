import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const testNotifications = [
  {
    type: 'gift_received',
    title: '🎁 Gift Received!',
    message: 'Sasha sent you a Mojito! Enjoy your drink at the bar.',
    data: { drink_id: 'mojito', from_user: 'Sasha' }
  },
  {
    type: 'punishment_assigned',
    title: '😈 New Punishment!',
    message: 'Dance solo for 30 seconds! You have 30 minutes to complete it.',
    data: { punishment_id: 'dance_solo', deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString() }
  },
  {
    type: 'mission_confirmed',
    title: '✅ Mission Complete!',
    message: 'You completed "Dance with a stranger" and earned 5 coins!',
    data: { mission_id: 'dance_stranger', reward: 5 }
  },
  {
    type: 'favor_fulfilled',
    title: '👑 Sasha Favor',
    message: 'Sasha fulfilled your favor request: Hug! Time to collect it!',
    data: { favor_id: 'hug' }
  },
  {
    type: 'ability_used',
    title: '⚡ Ability Activated',
    message: 'Your Skip Punishment card has been activated! Next punishment will be skipped.',
    data: { ability_id: 'skip_punishment' }
  },
  {
    type: 'risk_result',
    title: '🎲 Risk Result',
    message: 'You drew "Truth or Dare" card! Complete the dare or pay 1 coin to skip.',
    data: { card_id: 'truth_dare', level: 2 }
  },
  {
    type: 'admin_message',
    title: '📢 Admin Announcement',
    message: 'Party games starting in 10 minutes! Get ready for some fun!',
    data: { priority: 'high' }
  },
  {
    type: 'system',
    title: '🎉 Welcome!',
    message: 'Welcome to Sasha Bank V2! Check out the new notifications system.',
    data: { version: '2.0' }
  }
]

async function createTestNotifications() {
  console.log('🔔 Creating test notifications\n')
  console.log('=' .repeat(60) + '\n')

  // Get Yarik's user ID
  const { data: yarik, error: yarikError } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', 'Yarik')
    .single()

  if (yarikError || !yarik) {
    console.log('❌ Could not find Yarik:', yarikError?.message)
    return
  }

  console.log(`📝 Creating ${testNotifications.length} notifications for ${yarik.name}...\n`)

  let successCount = 0
  let errorCount = 0

  for (const notification of testNotifications) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: yarik.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          is_read: false
        })

      if (error) {
        console.log(`❌ ${notification.title}`)
        console.log(`   Error: ${error.message}`)
        errorCount++
      } else {
        console.log(`✅ ${notification.title}`)
        successCount++
      }
    } catch (err) {
      console.log(`❌ ${notification.title}`)
      console.log(`   Error: ${err.message}`)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Created ${successCount} notifications`)
  if (errorCount > 0) {
    console.log(`❌ Failed ${errorCount} notifications`)
  }

  // Count total notifications
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', yarik.id)

  console.log(`📊 Total notifications for ${yarik.name}: ${count}`)
  console.log(`\n🔔 Open the app and check the bell icon!\n`)
}

createTestNotifications().catch(console.error)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkDatabase() {
  console.log('🔍 Checking Sasha Bank V2 Database\n')
  console.log('=' .repeat(60) + '\n')

  const requiredTables = {
    'V2 Tables': [
      'risk_sessions',
      'notifications',
      'user_abilities',
      'purchased_favors',
      'assigned_punishments',
      'gift_drinks',
      'song_requests',
    ],
    'V1 Tables': [
      'users',
      'transactions',
      'bar_orders',
      'user_missions',
      'lottery_tickets',
      'trivia_sessions',
      'box_rounds',
      'box_bids',
      'box_queue',
      'trade_requests',
    ]
  }

  let allGood = true

  for (const [category, tables] of Object.entries(requiredTables)) {
    console.log(`📋 ${category}:`)
    console.log('-'.repeat(60))

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`❌ ${table.padEnd(25)} - NOT FOUND`)
          console.log(`   Error: ${error.message}`)
          allGood = false
        } else {
          console.log(`✅ ${table.padEnd(25)} - EXISTS (${count || 0} rows)`)
        }
      } catch (err) {
        console.log(`❌ ${table.padEnd(25)} - ERROR`)
        console.log(`   ${err.message}`)
        allGood = false
      }
    }
    console.log('')
  }

  // Check users table for V2 columns
  console.log('📋 Users Table V2 Columns:')
  console.log('-'.repeat(60))

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, pin_hash, role, free_drinks_used, has_double_reward, has_immunity_shield')
      .limit(1)

    if (error) {
      console.log('❌ Could not check users table columns')
      console.log(`   Error: ${error.message}`)
      allGood = false
    } else {
      const columns = ['pin_hash', 'role', 'free_drinks_used', 'has_double_reward', 'has_immunity_shield']

      if (users && users.length > 0) {
        const user = users[0]
        columns.forEach(col => {
          const exists = col in user
          console.log(`${exists ? '✅' : '❌'} ${col}`)
        })
      } else {
        console.log('⚠️  No users in database yet, cannot verify columns')
        console.log('   (This is OK if database was just cleared)')
      }
    }
  } catch (err) {
    console.log('❌ Error checking users columns:', err.message)
    allGood = false
  }

  console.log('\n' + '=' .repeat(60))

  if (allGood) {
    console.log('✅ Database is complete and ready!')
    console.log('🚀 V2 authentication system is ready to use\n')
  } else {
    console.log('❌ Some tables or columns are missing')
    console.log('📝 Please run the migration: supabase/migration_v2.sql\n')
  }
}

checkDatabase().catch(console.error)

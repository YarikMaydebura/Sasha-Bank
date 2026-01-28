import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function clearOldUsers() {
  console.log('🧹 Clearing old users from previous versions...\n')

  const oldUserNames = ['Yarik', 'Sasha', 'TestGuest', 'Max']

  for (const name of oldUserNames) {
    console.log(`Deleting user: ${name}...`)

    // Get user ID first
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('name', name)
      .maybeSingle()

    if (!user) {
      console.log(`  ℹ️  User "${name}" not found, skipping...\n`)
      continue
    }

    // Delete user (cascade will handle related records)
    const { error } = await supabase.from('users').delete().eq('id', user.id)

    if (error) {
      console.error(`  ❌ Failed to delete ${name}:`, error.message)
    } else {
      console.log(`  ✅ Deleted ${name}\n`)
    }
  }

  console.log('✅ All old users cleared!')
  console.log('\nNote: Related data (missions, cards, transactions, etc.) were also deleted due to CASCADE.')
}

clearOldUsers().catch(console.error)

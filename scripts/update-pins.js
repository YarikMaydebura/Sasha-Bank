import { createClient } from '@supabase/supabase-js'
import CryptoJS from 'crypto-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

function hashPIN(pin) {
  return CryptoJS.SHA256(pin).toString()
}

async function updatePins() {
  console.log('🔐 Updating PINs for Yarik and Sasha\n')
  console.log('=' .repeat(60) + '\n')

  const updates = [
    { name: 'Yarik', newPin: '2314' },
    { name: 'Sasha', newPin: '4352' }
  ]

  for (const { name, newPin } of updates) {
    try {
      const newPinHash = hashPIN(newPin)

      const { data, error } = await supabase
        .from('users')
        .update({ pin_hash: newPinHash })
        .eq('name', name)
        .select()
        .single()

      if (error) {
        console.log(`❌ Failed to update ${name}:`, error.message)
      } else {
        console.log(`✅ ${name}'s PIN updated to: ${newPin}`)
        console.log(`   New PIN hash: ${newPinHash.substring(0, 20)}...`)
      }
    } catch (err) {
      console.log(`❌ Error updating ${name}:`, err.message)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ PIN update complete!\n')
  console.log('📝 New credentials:')
  console.log('   Yarik: 2314')
  console.log('   Sasha: 4352\n')
}

updatePins().catch(console.error)

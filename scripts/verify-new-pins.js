import { createClient } from '@supabase/supabase-js'
import CryptoJS from 'crypto-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

function hashPIN(pin) {
  return CryptoJS.SHA256(pin).toString()
}

function verifyPIN(inputPIN, storedHash) {
  return hashPIN(inputPIN) === storedHash
}

async function verifyPins() {
  console.log('🧪 Verifying new PINs\n')
  console.log('=' .repeat(60) + '\n')

  const tests = [
    { name: 'Yarik', correctPin: '2314', wrongPin: '1234' },
    { name: 'Sasha', correctPin: '4352', wrongPin: '5678' }
  ]

  for (const { name, correctPin, wrongPin } of tests) {
    console.log(`Testing ${name}:`)
    console.log('-'.repeat(60))

    try {
      // Get user
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, pin_hash')
        .eq('name', name)
        .single()

      if (error) {
        console.log(`❌ Could not find ${name}:`, error.message)
        continue
      }

      // Test correct PIN
      const correctTest = verifyPIN(correctPin, user.pin_hash)
      if (correctTest) {
        console.log(`✅ Correct PIN (${correctPin}) - ACCEPTED`)
      } else {
        console.log(`❌ Correct PIN (${correctPin}) - REJECTED (this is wrong!)`)
      }

      // Test old/wrong PIN
      const wrongTest = verifyPIN(wrongPin, user.pin_hash)
      if (!wrongTest) {
        console.log(`✅ Old PIN (${wrongPin}) - REJECTED (correct behavior)`)
      } else {
        console.log(`❌ Old PIN (${wrongPin}) - ACCEPTED (this is wrong!)`)
      }

      console.log('')
    } catch (err) {
      console.log(`❌ Error testing ${name}:`, err.message)
    }
  }

  console.log('='.repeat(60))
  console.log('✅ Verification complete!\n')
}

verifyPins().catch(console.error)

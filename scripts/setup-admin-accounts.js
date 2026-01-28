import { createClient } from '@supabase/supabase-js'
import CryptoJS from 'crypto-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const STARTING_COINS = 10

// Hash PIN with SHA-256
function hashPIN(pin) {
  return CryptoJS.SHA256(pin).toString()
}

async function setupAdminAccounts() {
  console.log('👑 Setting up admin accounts...\n')

  // Admin 1: Yarik (Host)
  const yarikPIN = '2314'
  const yarikPINHash = hashPIN(yarikPIN)
  const yarikQR = crypto.randomUUID()

  console.log('Creating Yarik (Host Admin)...')
  console.log(`  PIN: ${yarikPIN}`)
  console.log(`  Role: admin (host)`)

  const { data: yarik, error: yarikError } = await supabase
    .from('users')
    .insert({
      name: 'Yarik',
      pin_hash: yarikPINHash,
      balance: STARTING_COINS,
      qr_code: yarikQR,
      role: 'admin',
      free_drinks_used: 0,
    })
    .select()
    .single()

  if (yarikError) {
    console.error('  ❌ Failed to create Yarik:', yarikError.message)
  } else {
    console.log('  ✅ Yarik created successfully!')

    // Create initial transaction
    await supabase.from('transactions').insert({
      to_user_id: yarik.id,
      amount: STARTING_COINS,
      type: 'registration',
      description: 'Welcome to Sasha Bank! (Host Admin)',
    })
  }

  console.log()

  // Admin 2: Sasha (Birthday Person)
  const sashaPIN = '4352'
  const sashaPINHash = hashPIN(sashaPIN)
  const sashaQR = crypto.randomUUID()

  console.log('Creating Sasha (Birthday Person Admin)...')
  console.log(`  PIN: ${sashaPIN}`)
  console.log(`  Role: admin (birthday person)`)

  const { data: sasha, error: sashaError } = await supabase
    .from('users')
    .insert({
      name: 'Sasha',
      pin_hash: sashaPINHash,
      balance: STARTING_COINS,
      qr_code: sashaQR,
      role: 'admin',
      free_drinks_used: 0,
    })
    .select()
    .single()

  if (sashaError) {
    console.error('  ❌ Failed to create Sasha:', sashaError.message)
  } else {
    console.log('  ✅ Sasha created successfully!')

    // Create initial transaction
    await supabase.from('transactions').insert({
      to_user_id: sasha.id,
      amount: STARTING_COINS,
      type: 'registration',
      description: 'Welcome to Sasha Bank! (Birthday Person Admin)',
    })
  }

  console.log()
  console.log('=' .repeat(60))
  console.log('✅ Admin accounts setup complete!')
  console.log()
  console.log('Login Credentials:')
  console.log('-' .repeat(60))
  console.log('👤 Yarik (Host)')
  console.log('   PIN: 2314')
  console.log('   Role: Admin')
  console.log()
  console.log('🎂 Sasha (Birthday Person)')
  console.log('   PIN: 4352')
  console.log('   Role: Admin')
  console.log('-' .repeat(60))
  console.log()
  console.log('Both accounts have:')
  console.log('  - Admin access to /admin dashboard')
  console.log('  - Starting balance: 10 coins')
  console.log('  - Unique QR codes')
  console.log('  - Free drinks: 2 available')
}

setupAdminAccounts().catch(console.error)

import { createClient } from '@supabase/supabase-js'
import CryptoJS from 'crypto-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const STARTING_COINS = 100

// Auth functions (duplicated inline for testing)
function hashPIN(pin) {
  return CryptoJS.SHA256(pin).toString()
}

function verifyPIN(inputPIN, storedHash) {
  return hashPIN(inputPIN) === storedHash
}

async function checkUserExists(name) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, pin_hash, role')
    .eq('name', name.trim())
    .maybeSingle()

  if (error) throw error
  return data
}

async function registerUser(name, pin) {
  const pinHash = hashPIN(pin)
  const qrCode = crypto.randomUUID()

  const isAdmin = ['Yarik', 'Sasha'].includes(name.trim())

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      name: name.trim(),
      pin_hash: pinHash,
      balance: STARTING_COINS,
      qr_code: qrCode,
      role: isAdmin ? 'admin' : 'guest',
      free_drinks_used: 0,
    })
    .select()
    .single()

  if (error) throw error

  await supabase.from('transactions').insert({
    to_user_id: user.id,
    amount: STARTING_COINS,
    type: 'registration',
    description: 'Welcome to Sasha Bank!',
  })

  return user
}

async function loginUser(name, pin) {
  const existingUser = await checkUserExists(name)

  if (!existingUser) {
    throw new Error('User not found')
  }

  if (!existingUser.pin_hash) {
    throw new Error('User needs to create a PIN')
  }

  if (!verifyPIN(pin, existingUser.pin_hash)) {
    throw new Error('Incorrect PIN')
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', existingUser.id)
    .single()

  if (error) throw error

  return user
}

async function testAuth() {
  console.log('🧪 Testing V2 Authentication System\n')
  console.log('=' .repeat(60) + '\n')

  const testUsers = [
    { name: 'Yarik', pin: '1234', shouldBeAdmin: true },
    { name: 'Sasha', pin: '5678', shouldBeAdmin: true },
    { name: 'TestGuest', pin: '9999', shouldBeAdmin: false }
  ]

  for (const testUser of testUsers) {
    console.log(`\n📝 Testing user: ${testUser.name}`)
    console.log('-'.repeat(60))

    try {
      // Step 1: Check if user exists
      console.log('1️⃣  Checking if user exists...')
      const existing = await checkUserExists(testUser.name)

      if (existing) {
        console.log(`   ⚠️  User already exists: ${existing.name} (role: ${existing.role})`)

        // Try to login
        console.log('\n2️⃣  Testing login...')
        try {
          const user = await loginUser(testUser.name, testUser.pin)
          console.log('   ✅ Login successful!')
          console.log(`   User ID: ${user.id}`)
          console.log(`   Role: ${user.role}`)
          console.log(`   Balance: ${user.balance} coins`)
          console.log(`   Free drinks used: ${user.free_drinks_used}`)
        } catch (loginError) {
          console.log(`   ❌ Login failed: ${loginError.message}`)
        }
      } else {
        // Step 2: Register new user
        console.log('   ✅ User does not exist, creating...')
        console.log('\n2️⃣  Registering user...')
        const user = await registerUser(testUser.name, testUser.pin)

        console.log('   ✅ Registration successful!')
        console.log(`   User ID: ${user.id}`)
        console.log(`   Name: ${user.name}`)
        console.log(`   Role: ${user.role}`)
        console.log(`   Balance: ${user.balance} coins`)
        console.log(`   Free drinks used: ${user.free_drinks_used}`)
        console.log(`   Has PIN: ${user.pin_hash ? 'Yes' : 'No'}`)
        console.log(`   QR Code: ${user.qr_code}`)

        // Verify role
        const expectedRole = testUser.shouldBeAdmin ? 'admin' : 'guest'
        if (user.role === expectedRole) {
          console.log(`   ✅ Role correct: ${user.role}`)
        } else {
          console.log(`   ❌ Role incorrect: expected ${expectedRole}, got ${user.role}`)
        }

        // Step 3: Test login with correct PIN
        console.log('\n3️⃣  Testing login with correct PIN...')
        const loginUser1 = await loginUser(testUser.name, testUser.pin)
        console.log('   ✅ Login successful!')

        // Step 4: Test login with wrong PIN
        console.log('\n4️⃣  Testing login with wrong PIN...')
        try {
          await loginUser(testUser.name, '0000')
          console.log('   ❌ Login should have failed but succeeded!')
        } catch (error) {
          if (error.message === 'Incorrect PIN') {
            console.log('   ✅ Login correctly rejected wrong PIN')
          } else {
            console.log(`   ❌ Unexpected error: ${error.message}`)
          }
        }
      }

      // Step 5: Verify database record
      console.log('\n5️⃣  Verifying database record...')
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('name', testUser.name)
        .single()

      if (error) {
        console.log(`   ❌ Could not fetch user: ${error.message}`)
      } else {
        console.log('   ✅ User found in database')
        console.log(`   - pin_hash: ${dbUser.pin_hash ? '✅' : '❌'}`)
        console.log(`   - role: ${dbUser.role} ${dbUser.role ? '✅' : '❌'}`)
        console.log(`   - free_drinks_used: ${dbUser.free_drinks_used} ${dbUser.free_drinks_used === 0 ? '✅' : '❌'}`)
        console.log(`   - has_double_reward: ${dbUser.has_double_reward === false ? '✅' : '❌'}`)
        console.log(`   - has_immunity_shield: ${dbUser.has_immunity_shield === false ? '✅' : '❌'}`)
        console.log(`   - qr_code: ${dbUser.qr_code ? '✅' : '❌'}`)
      }

      // Step 6: Check transaction was created
      console.log('\n6️⃣  Checking initial transaction...')
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('to_user_id', dbUser.id)
        .eq('type', 'registration')

      if (txError) {
        console.log(`   ❌ Could not fetch transaction: ${txError.message}`)
      } else if (transactions && transactions.length > 0) {
        console.log('   ✅ Registration transaction created')
        console.log(`   - Amount: ${transactions[0].amount} coins`)
        console.log(`   - Description: ${transactions[0].description}`)
      } else {
        console.log('   ❌ No registration transaction found')
      }

    } catch (error) {
      console.log(`\n❌ Error testing ${testUser.name}:`, error.message)
      console.error(error)
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60))
  console.log('📊 Summary')
  console.log('='.repeat(60))

  const { data: allUsers, error: countError } = await supabase
    .from('users')
    .select('name, role, balance, free_drinks_used')

  if (!countError && allUsers) {
    console.log(`\n👥 Total users: ${allUsers.length}`)
    allUsers.forEach(u => {
      console.log(`   - ${u.name.padEnd(15)} | Role: ${u.role.padEnd(10)} | Balance: ${u.balance} coins`)
    })
  }

  console.log('\n✅ Authentication system test complete!\n')
}

testAuth().catch(console.error)

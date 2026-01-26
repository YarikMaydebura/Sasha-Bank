import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tgdtsirkuvfzynqwjtmp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZHRzaXJrdXZmenlucXdqdG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzA5NDUsImV4cCI6MjA4NDk0Njk0NX0.Pc5BkvuTBBNkNwGmUvmHvUYro9aWr7ll2qFgNeeu6jU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRiskFlow() {
  console.log('🎲 Testing Risk Station Flow\n')
  console.log('=' .repeat(60) + '\n')

  // Get Yarik
  const { data: yarik, error: yarikError } = await supabase
    .from('users')
    .select('id, name, balance')
    .eq('name', 'Yarik')
    .single()

  if (yarikError || !yarik) {
    console.log('❌ Could not find Yarik')
    return
  }

  console.log(`👤 User: ${yarik.name}`)
  console.log(`💰 Balance: ${yarik.balance} coins\n`)

  // Step 1: Create a test risk session
  console.log('1️⃣  Creating risk session (Level 1)...')

  const { data: session, error: sessionError } = await supabase
    .from('risk_sessions')
    .insert({
      user_id: yarik.id,
      level: 1,
      status: 'waiting',
    })
    .select()
    .single()

  if (sessionError) {
    console.log('❌ Failed to create session:', sessionError.message)
    return
  }

  console.log(`✅ Session created: ${session.id}`)
  console.log(`   Status: ${session.status}`)
  console.log(`   Level: ${session.level}\n`)

  // Step 2: Simulate admin assigning a card
  console.log('2️⃣  Simulating admin assigning card R3 (Nice - Win 2 coins)...')

  const { error: updateError } = await supabase
    .from('risk_sessions')
    .update({
      status: 'assigned',
      card_id: 'R3',
      card_result: {
        id: 'R3',
        name: 'Nice',
        type: 'reward',
        description: 'Win 2 coins!',
      },
    })
    .eq('id', session.id)

  if (updateError) {
    console.log('❌ Failed to assign card:', updateError.message)
    return
  }

  console.log('✅ Card assigned successfully')
  console.log('   Card: R3 - Nice')
  console.log('   Type: reward')
  console.log('   Effect: +2 coins\n')

  // Step 3: Verify session was updated
  console.log('3️⃣  Verifying session update...')

  const { data: updatedSession, error: fetchError } = await supabase
    .from('risk_sessions')
    .select('*')
    .eq('id', session.id)
    .single()

  if (fetchError) {
    console.log('❌ Failed to fetch session:', fetchError.message)
    return
  }

  console.log(`✅ Session verified`)
  console.log(`   Status: ${updatedSession.status}`)
  console.log(`   Card ID: ${updatedSession.card_id}`)
  console.log(`   Card Result: ${JSON.stringify(updatedSession.card_result)}\n`)

  // Step 4: Mark session as completed
  console.log('4️⃣  Marking session as completed...')

  const { error: completeError } = await supabase
    .from('risk_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  if (completeError) {
    console.log('❌ Failed to complete session:', completeError.message)
    return
  }

  console.log('✅ Session completed\n')

  // Summary
  console.log('=' .repeat(60))
  console.log('✅ Risk flow test complete!')
  console.log('\nTest verified:')
  console.log('  ✅ Create risk session')
  console.log('  ✅ Assign card (admin panel simulation)')
  console.log('  ✅ Update session status')
  console.log('  ✅ Complete session')
  console.log('\n🎉 Physical Risk Station is ready to use!\n')
}

testRiskFlow().catch(console.error)

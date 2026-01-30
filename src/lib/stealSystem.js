import { supabase } from './supabase'

const STEAL_AMOUNT = 5
const STEAL_TIMEOUT_SECONDS = 10
const MIN_VICTIM_BALANCE = 1

/**
 * Initiate a steal attempt
 * Creates a pending steal_attempt record and sends notification to victim
 */
export async function initiateSteal(attackerId, victimId, missionId = null) {
  console.log(`🦹 Initiating steal: ${attackerId} -> ${victimId}`)

  // Check if victim has a shield card (auto-block)
  const { shieldBlocked, shieldCardId } = await checkAndUseShieldCard(victimId)
  if (shieldBlocked) {
    return {
      success: false,
      blocked: true,
      reason: 'shield',
      message: 'Victim had a Shield card! Steal blocked!'
    }
  }

  // Create steal attempt with expiration
  const expiresAt = new Date(Date.now() + STEAL_TIMEOUT_SECONDS * 1000)

  const { data: attempt, error } = await supabase
    .from('steal_attempts')
    .insert({
      attacker_id: attackerId,
      victim_id: victimId,
      mission_id: missionId,
      amount: STEAL_AMOUNT,
      status: 'pending',
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create steal attempt:', error)
    return { success: false, error: error.message }
  }

  // Send notification to victim (triggers popup)
  await supabase.from('notifications').insert({
    user_id: victimId,
    type: 'steal_incoming',
    title: '🚨 INCOMING STEAL!',
    message: `Someone is trying to steal ${STEAL_AMOUNT} coins! DODGE NOW!`,
    data: {
      attempt_id: attempt.id,
      attacker_id: attackerId,
      amount: STEAL_AMOUNT,
      expires_at: expiresAt.toISOString()
    }
  })

  return {
    success: true,
    attemptId: attempt.id,
    expiresAt
  }
}

/**
 * Process a successful dodge (victim clicked DODGE in time)
 */
export async function processDodge(attemptId) {
  console.log(`🏃 Processing dodge for attempt ${attemptId}`)

  // Update steal attempt status
  const { data: attempt, error: updateError } = await supabase
    .from('steal_attempts')
    .update({ status: 'dodged' })
    .eq('id', attemptId)
    .eq('status', 'pending') // Only if still pending
    .select('attacker_id, victim_id')
    .single()

  if (updateError || !attempt) {
    console.error('Failed to process dodge:', updateError)
    return { success: false, error: 'Steal already processed or expired' }
  }

  // Notify attacker of failed steal
  await supabase.from('notifications').insert({
    user_id: attempt.attacker_id,
    type: 'steal_failed',
    title: '😅 Steal Failed!',
    message: 'Your target dodged the steal attempt!',
    data: { attempt_id: attemptId, reason: 'dodged' }
  })

  // Notify victim of successful dodge
  await supabase.from('notifications').insert({
    user_id: attempt.victim_id,
    type: 'dodge_success',
    title: '🏃 You Dodged!',
    message: 'You successfully dodged the steal attempt!',
    data: { attempt_id: attemptId }
  })

  return { success: true, message: 'Dodge successful!' }
}

/**
 * Process a successful steal (timeout expired without dodge)
 */
export async function processStealSuccess(attemptId) {
  console.log(`💰 Processing successful steal for attempt ${attemptId}`)

  // Get attempt details
  const { data: attempt, error: fetchError } = await supabase
    .from('steal_attempts')
    .select('*, attacker:attacker_id(name, balance), victim:victim_id(name, balance)')
    .eq('id', attemptId)
    .single()

  if (fetchError || !attempt) {
    console.error('Failed to fetch steal attempt:', fetchError)
    return { success: false, error: 'Steal attempt not found' }
  }

  // Only process if still pending
  if (attempt.status !== 'pending') {
    return { success: false, error: 'Steal already processed' }
  }

  // Calculate actual steal amount (victim must keep at least 1 coin)
  const victimBalance = attempt.victim?.balance || 0
  const maxSteal = Math.max(0, victimBalance - MIN_VICTIM_BALANCE)
  const actualSteal = Math.min(STEAL_AMOUNT, maxSteal)

  if (actualSteal <= 0) {
    // Victim too poor to steal from
    await supabase
      .from('steal_attempts')
      .update({ status: 'failed', amount: 0 })
      .eq('id', attemptId)

    await supabase.from('notifications').insert({
      user_id: attempt.attacker_id,
      type: 'steal_failed',
      title: '😅 Steal Failed!',
      message: 'Target is too poor to steal from!',
      data: { attempt_id: attemptId, reason: 'broke' }
    })

    return { success: false, error: 'Victim too poor' }
  }

  // Transfer coins
  const newVictimBalance = victimBalance - actualSteal
  const newAttackerBalance = (attempt.attacker?.balance || 0) + actualSteal

  // Update victim balance
  await supabase
    .from('users')
    .update({ balance: newVictimBalance })
    .eq('id', attempt.victim_id)

  // Update attacker balance
  await supabase
    .from('users')
    .update({ balance: newAttackerBalance })
    .eq('id', attempt.attacker_id)

  // Update steal attempt
  await supabase
    .from('steal_attempts')
    .update({ status: 'success', amount: actualSteal })
    .eq('id', attemptId)

  // Create transaction records
  await supabase.from('transactions').insert([
    {
      from_user_id: attempt.victim_id,
      to_user_id: attempt.attacker_id,
      amount: actualSteal,
      type: 'steal',
      description: `🦹 Stolen by ${attempt.attacker?.name || 'Unknown'}`
    }
  ])

  // Notify both parties
  await supabase.from('notifications').insert([
    {
      user_id: attempt.attacker_id,
      type: 'steal_success',
      title: '🦹 Steal Successful!',
      message: `You stole ${actualSteal} coins from ${attempt.victim?.name || 'someone'}!`,
      data: { attempt_id: attemptId, amount: actualSteal }
    },
    {
      user_id: attempt.victim_id,
      type: 'stolen_from',
      title: '💸 You Were Robbed!',
      message: `Someone stole ${actualSteal} coins from you!`,
      data: { attempt_id: attemptId, amount: actualSteal }
    }
  ])

  return { success: true, amount: actualSteal }
}

/**
 * Check if victim has a shield card and use it
 */
async function checkAndUseShieldCard(userId) {
  // Check for unused shield card
  const { data: shieldCard, error } = await supabase
    .from('user_cards')
    .select('id')
    .eq('user_id', userId)
    .eq('card_id', 'shield')
    .eq('status', 'owned')
    .limit(1)
    .single()

  if (error || !shieldCard) {
    return { shieldBlocked: false, shieldCardId: null }
  }

  // Use the shield card
  await supabase
    .from('user_cards')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('id', shieldCard.id)

  // Notify user that shield was used
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'shield_used',
    title: '🛡️ Shield Activated!',
    message: 'Your Shield card automatically blocked a steal attempt!',
    data: { card_id: shieldCard.id }
  })

  return { shieldBlocked: true, shieldCardId: shieldCard.id }
}

/**
 * Assign steal mission to imposters (admin function)
 */
export async function assignStealMission(attackerId, victimId) {
  // Create secret mission
  const { data: mission, error } = await supabase
    .from('user_missions')
    .insert({
      user_id: attackerId,
      generated_text: `🦹 SECRET: Steal ${STEAL_AMOUNT} coins from your target!`,
      reward: STEAL_AMOUNT,
      difficulty: 'hard',
      verification: 'target',
      requires_confirmation: true,
      is_secret: true,
      target_user_id: victimId,
      status: 'assigned'
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to assign steal mission:', error)
    return { success: false, error: error.message }
  }

  // Notify the imposter (secretly)
  await supabase.from('notifications').insert({
    user_id: attackerId,
    type: 'secret_mission',
    title: '🦹 Secret Imposter Mission!',
    message: 'Check your missions - you have a secret steal assignment!',
    data: { mission_id: mission.id, is_secret: true }
  })

  return { success: true, missionId: mission.id }
}

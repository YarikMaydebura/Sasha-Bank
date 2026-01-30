import { supabase } from './supabase'

const REVIVE_AMOUNT = 10
const MIN_BALANCE = 0

/**
 * Ensures a balance value is never negative
 * @param {number} balance - The balance to check
 * @returns {number} - The balance, clamped to 0 minimum
 */
export function ensureNonNegative(balance) {
  return Math.max(balance, MIN_BALANCE)
}

/**
 * Check if user hit 0 balance and apply one-time revive
 * V3.0: Revive is one-time only. If already revived, show "Game Over"
 *
 * @param {string} userId - User ID
 * @param {number} currentBalance - Current balance after deduction
 * @returns {Promise<{revived: boolean, gameOver: boolean, newBalance: number}>}
 */
export async function checkAndApplyRevive(userId, currentBalance) {
  // Ensure balance is never negative
  const safeBalance = ensureNonNegative(currentBalance)

  // Only check revive if balance is exactly 0
  if (safeBalance !== MIN_BALANCE) {
    return { revived: false, gameOver: false, newBalance: safeBalance }
  }

  console.log(`🚨 User ${userId} hit 0 balance - checking revive status`)

  // Check if user has already been revived
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('has_revived')
    .eq('id', userId)
    .single()

  if (fetchError) {
    console.error('Failed to check revive status:', fetchError)
    return { revived: false, gameOver: false, newBalance: safeBalance }
  }

  // If already revived, game over - can only earn via missions, donations, hidden QRs
  if (user?.has_revived) {
    console.log(`💀 User ${userId} already revived - GAME OVER`)

    // Create notification for game over
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'game_over',
      title: '💀 Game Over!',
      message: 'No more revives! Earn coins from missions, donations, or hidden QR codes.',
      data: { reason: 'already_revived' },
    })

    return { revived: false, gameOver: true, newBalance: 0 }
  }

  // Apply one-time revive
  console.log(`✨ User ${userId} gets one-time revive!`)

  const { error: updateError } = await supabase
    .from('users')
    .update({
      balance: REVIVE_AMOUNT,
      has_revived: true
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Failed to apply revive:', updateError)
    return { revived: false, gameOver: false, newBalance: safeBalance }
  }

  // Create transaction record
  await supabase.from('transactions').insert({
    to_user_id: userId,
    amount: REVIVE_AMOUNT,
    type: 'revive',
    description: '✨ One-time revive! Make it count!',
  })

  // Create notification
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'revive',
    title: '✨ REVIVED!',
    message: `You've been revived with ${REVIVE_AMOUNT} coins! This is your only chance - no more revives!`,
    data: { amount: REVIVE_AMOUNT },
  })

  return { revived: true, gameOver: false, newBalance: REVIVE_AMOUNT }
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use checkAndApplyRevive instead
 */
export async function checkAndApplyBailout(userId, currentBalance) {
  const result = await checkAndApplyRevive(userId, currentBalance)
  return {
    bailoutApplied: result.revived,
    newBalance: result.newBalance
  }
}

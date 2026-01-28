import { supabase } from './supabase'

const BAILOUT_AMOUNT = 10
const MIN_BALANCE = 0

/**
 * Check if user hit 0 balance and apply automatic bailout
 * @param {string} userId - User ID
 * @param {number} currentBalance - Current balance after deduction
 * @returns {Promise<{bailoutApplied: boolean, newBalance: number}>}
 */
export async function checkAndApplyBailout(userId, currentBalance) {
  // Only bailout if balance is exactly 0 (not negative)
  if (currentBalance !== MIN_BALANCE) {
    return { bailoutApplied: false, newBalance: currentBalance }
  }

  console.log(`🚨 User ${userId} hit 0 balance - applying bailout`)

  // Update balance
  const newBalance = BAILOUT_AMOUNT

  const { error: updateError } = await supabase
    .from('users')
    .update({ balance: newBalance })
    .eq('id', userId)

  if (updateError) {
    console.error('Failed to apply bailout:', updateError)
    return { bailoutApplied: false, newBalance: currentBalance }
  }

  // Create transaction record
  await supabase.from('transactions').insert({
    to_user_id: userId,
    amount: BAILOUT_AMOUNT,
    type: 'bailout',
    description: '🆘 Emergency bailout - never give up!',
  })

  // Create notification
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'bailout',
    title: '🆘 Emergency Rescue!',
    message: `You received ${BAILOUT_AMOUNT} coins bailout. Keep playing!`,
    data: { amount: BAILOUT_AMOUNT },
  })

  return { bailoutApplied: true, newBalance }
}

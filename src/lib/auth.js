import CryptoJS from 'crypto-js'
import { supabase } from './supabase'
import { CONSTANTS } from './utils'

// Hash PIN with SHA-256 (simple for party app)
export function hashPIN(pin) {
  return CryptoJS.SHA256(pin).toString()
}

// Verify PIN
export function verifyPIN(inputPIN, storedHash) {
  return hashPIN(inputPIN) === storedHash
}

// Check if user exists by name
export async function checkUserExists(name) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, pin_hash, role')
    .eq('name', name.trim())
    .maybeSingle()

  if (error) throw error
  return data
}

// Register new user with PIN
export async function registerUser(name, pin, traitId = null) {
  const pinHash = hashPIN(pin)
  const qrCode = crypto.randomUUID()

  // Determine role based on name
  const isAdmin = ['Yarik', 'Sasha'].includes(name.trim())

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      name: name.trim(),
      pin_hash: pinHash,
      balance: CONSTANTS.STARTING_COINS,
      qr_code: qrCode,
      role: isAdmin ? 'admin' : 'guest',
      free_drinks_used: 0,
    })
    .select()
    .single()

  if (error) throw error

  // Create initial transaction
  await supabase.from('transactions').insert({
    to_user_id: user.id,
    amount: CONSTANTS.STARTING_COINS,
    type: 'registration',
    description: 'Welcome to Sasha Bank!',
  })

  // If trait selected, create guest trait record and assign missions
  if (traitId) {
    // Dynamically import to avoid circular dependencies
    const { getMissionsForTrait, getTraitById } = await import('../data/traits')
    const trait = getTraitById(traitId)

    if (trait) {
      // Create guest trait record
      await supabase.from('guest_traits').insert({
        user_id: user.id,
        trait_category: traitId,
        trait_emoji: trait.emoji,
        trait_description: trait.description,
      })

      // Get and assign trait missions
      const traitMissions = getMissionsForTrait(traitId)

      if (traitMissions.length > 0) {
        const missionsToInsert = traitMissions.map((mission) => ({
          user_id: user.id,
          title: mission.title,
          description: mission.description,
          reward: mission.reward,
          verification: mission.verification,
          requires_confirmation: mission.requires_confirmation,
          trait_category: traitId,
          type: 'main',
          status: 'active',
        }))

        await supabase.from('user_missions').insert(missionsToInsert)
      }
    }
  }

  return user
}

// Login existing user
export async function loginUser(name, pin) {
  // Check if user exists
  const existingUser = await checkUserExists(name)

  if (!existingUser) {
    throw new Error('User not found')
  }

  if (!existingUser.pin_hash) {
    throw new Error('User needs to create a PIN')
  }

  // Verify PIN
  if (!verifyPIN(pin, existingUser.pin_hash)) {
    throw new Error('Incorrect PIN')
  }

  // Fetch full user data
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', existingUser.id)
    .single()

  if (error) throw error

  return user
}

// Session management
const SESSION_KEY = 'sasha_bank_session'
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export function saveSession(user) {
  const session = {
    user_id: user.id,
    name: user.name,
    role: user.role,
    timestamp: Date.now(),
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getSession() {
  const sessionData = localStorage.getItem(SESSION_KEY)
  if (!sessionData) return null

  try {
    const session = JSON.parse(sessionData)

    // Check if session expired
    if (Date.now() - session.timestamp > SESSION_DURATION) {
      clearSession()
      return null
    }

    return session
  } catch {
    clearSession()
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

// Restore session and fetch fresh user data
export async function restoreSession() {
  const session = getSession()
  if (!session) return null

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user_id)
      .single()

    if (error) throw error

    return user
  } catch (error) {
    console.error('Session restore error:', error)
    clearSession()
    return null
  }
}

// Role checking
export function hasRole(user, requiredRole) {
  const roleHierarchy = {
    guest: 0,
    bartender: 1,
    admin: 2,
  }

  const userLevel = roleHierarchy[user?.role] || 0
  const requiredLevel = roleHierarchy[requiredRole] || 0

  return userLevel >= requiredLevel
}

// Check if user is admin
export function isAdmin(user) {
  return user?.role === 'admin'
}

// Check if user is bartender or admin
export function isBartender(user) {
  return user?.role === 'bartender' || user?.role === 'admin'
}

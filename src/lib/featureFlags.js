/**
 * Feature Flags for Sasha Bank v2.0
 *
 * Toggle these flags to enable/disable new features during rollout.
 * Set to false during development/testing, then gradually enable in production.
 */

export const FEATURE_FLAGS = {
  // Cards System - Win and use animated cards (DJ Power, Shield, Steal, etc.)
  CARDS_SYSTEM: false,

  // Poker System - Multiplayer poker with buy-in and admin-selected winners
  POKER_SYSTEM: false,

  // Photo Prompt System - Auto-send photo challenges every 20 minutes
  PHOTO_SYSTEM: false,

  // Trait-based Missions - Auto-assign missions based on guest personality traits
  TRAIT_MISSIONS: false,

  // New QR Scan Menu - Fixed purple screen bug with action menu
  NEW_QR_MENU: false,
}

/**
 * Check if a feature is enabled
 * @param {keyof FEATURE_FLAGS} feature - Feature flag name
 * @returns {boolean}
 */
export function isFeatureEnabled(feature) {
  return FEATURE_FLAGS[feature] === true
}

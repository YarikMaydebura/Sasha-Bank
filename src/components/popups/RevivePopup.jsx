import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useUserStore } from '../../stores/userStore'
import { cn } from '../../lib/utils'

const REVIVE_AMOUNT = 10

/**
 * RevivePopup - V3.0
 * Shows when user balance hits 0
 * - First time (has_revived = false): Revive popup with +10 coins
 * - Already revived (has_revived = true): Game Over popup
 *
 * Detects balance=0 directly from user store (no notifications needed)
 */
export function RevivePopup() {
  const { user, updateBalance, updateUser } = useUserStore()
  const [showPopup, setShowPopup] = useState(false)
  const [popupType, setPopupType] = useState(null) // 'revive' | 'gameover'
  const [processing, setProcessing] = useState(false)
  const [hasCheckedThisZero, setHasCheckedThisZero] = useState(false)

  // Watch for balance hitting 0
  useEffect(() => {
    if (!user) return

    // Only trigger when balance is exactly 0 and we haven't checked this instance yet
    if (user.balance === 0 && !showPopup && !hasCheckedThisZero) {
      setHasCheckedThisZero(true)

      // Determine which popup to show
      if (user.has_revived) {
        setPopupType('gameover')
      } else {
        setPopupType('revive')
      }
      setShowPopup(true)
    }

    // Reset the check flag when balance goes above 0
    if (user.balance > 0) {
      setHasCheckedThisZero(false)
    }
  }, [user?.balance, user?.has_revived, showPopup, hasCheckedThisZero])

  // Handle revive
  async function handleRevive() {
    if (!user || processing) return

    setProcessing(true)

    try {
      // Update balance and has_revived in database
      const newBalance = REVIVE_AMOUNT
      await supabase
        .from('users')
        .update({
          balance: newBalance,
          has_revived: true
        })
        .eq('id', user.id)

      // Create transaction record
      await supabase.from('transactions').insert({
        to_user_id: user.id,
        amount: REVIVE_AMOUNT,
        type: 'revive',
        description: 'One-time revive bonus'
      })

      // Update local state
      updateBalance(newBalance)
      updateUser({ has_revived: true })

      setShowPopup(false)
      setPopupType(null)
    } catch (error) {
      console.error('Error during revive:', error)
    } finally {
      setProcessing(false)
    }
  }

  // Handle game over close
  function handleGameOverClose() {
    setShowPopup(false)
    setPopupType(null)
  }

  if (!showPopup || !popupType) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
      {popupType === 'revive' ? (
        // Revive Popup
        <div className={cn(
          'rounded-3xl p-8 max-w-sm mx-4 text-center shadow-2xl border-4',
          'bg-gradient-to-br from-slate-900 to-slate-800 border-green-500',
          'animate-bounce-in'
        )}>
          {/* Icon */}
          <div className="text-8xl mb-4">💀</div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-white mb-2">
            YOU'RE BROKE!
          </h2>

          {/* Message */}
          <p className="text-slate-300 text-lg mb-6">
            Don't worry, everyone gets<br />
            <span className="text-white font-bold">ONE second chance!</span>
          </p>

          {/* Revive Button */}
          <button
            onClick={handleRevive}
            disabled={processing}
            className={cn(
              'w-full py-4 rounded-xl text-xl font-bold mb-4',
              'bg-gradient-to-r from-green-500 to-green-600',
              'hover:from-green-400 hover:to-green-500',
              'active:scale-95 transition-all',
              'shadow-lg shadow-green-500/50',
              processing && 'opacity-50 cursor-not-allowed'
            )}
          >
            {processing ? 'Reviving...' : `🔄 REVIVE (+${REVIVE_AMOUNT}🪙)`}
          </button>

          {/* Warning */}
          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-3">
            <p className="text-yellow-300 text-sm font-medium">
              ⚠️ One-time only! Next time there's no rescue!
            </p>
          </div>
        </div>
      ) : (
        // Game Over Popup
        <div className={cn(
          'rounded-3xl p-8 max-w-sm mx-4 text-center shadow-2xl border-4',
          'bg-gradient-to-br from-red-900 to-red-800 border-red-500'
        )}>
          {/* Icon */}
          <div className="text-8xl mb-4">☠️</div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-white mb-2">
            GAME OVER
          </h2>

          {/* Message */}
          <p className="text-red-200 mb-6">
            You've used your revive already!
          </p>

          {/* How to earn */}
          <div className="bg-slate-800/80 rounded-xl p-4 mb-6 text-left">
            <p className="text-white font-semibold mb-3">Ways to get coins:</p>
            <ul className="text-slate-300 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span>🤝</span> Ask friends for donations
              </li>
              <li className="flex items-center gap-2">
                <span>🎲</span> Win games
              </li>
              <li className="flex items-center gap-2">
                <span>🎯</span> Complete missions
              </li>
              <li className="flex items-center gap-2">
                <span>🔍</span> Find hidden QR codes
              </li>
            </ul>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleGameOverClose}
            className={cn(
              'w-full py-4 rounded-xl text-xl font-bold',
              'bg-gradient-to-r from-slate-600 to-slate-700',
              'hover:from-slate-500 hover:to-slate-600',
              'active:scale-95 transition-all'
            )}
          >
            Continue (0🪙)
          </button>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes bounce-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default RevivePopup

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { supabase } from '../lib/supabase'
import { generateQRCode, CONSTANTS } from '../lib/utils'

export function Welcome() {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const setUser = useUserStore((state) => state.setUser)
  const showToast = useUIStore((state) => state.showToast)

  const handleJoin = async (e) => {
    e.preventDefault()

    if (!name.trim()) {
      showToast('error', 'Please enter your name')
      return
    }

    setIsLoading(true)

    try {
      const qrCode = generateQRCode()

      // Create user in Supabase
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          name: name.trim(),
          balance: CONSTANTS.STARTING_COINS,
          qr_code: qrCode,
          is_admin: false,
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

      // Save user to store
      setUser(user)

      showToast('success', `Welcome, ${user.name}! You received ${CONSTANTS.STARTING_COINS} coins!`)
      navigate('/dashboard')
    } catch (error) {
      console.error('Registration error:', error)

      // Fallback: create local user if Supabase fails
      const localUser = {
        id: crypto.randomUUID(),
        name: name.trim(),
        balance: CONSTANTS.STARTING_COINS,
        qr_code: generateQRCode(),
        is_admin: false,
        created_at: new Date().toISOString(),
      }
      setUser(localUser)
      showToast('warning', 'Offline mode - some features may be limited')
      navigate('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageWrapper className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-sm mx-auto text-center">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-6xl">🏦</span>
          <h1 className="text-3xl font-bold text-pastel-purple-light mt-4">
            SASHA BANK
          </h1>
          <div className="h-0.5 w-16 bg-pastel-purple mx-auto mt-4" />
          <p className="text-slate-400 mt-4">
            February 1st, 2025
            <br />
            The Fizz, Leiden
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleJoin} className="space-y-6">
          <Input
            label="What's your name?"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            autoFocus
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={!name.trim()}
          >
            🎉 JOIN PARTY
          </Button>
        </form>

        <p className="text-slate-500 text-sm mt-6">
          You'll receive <span className="text-coin-gold">{CONSTANTS.STARTING_COINS} coins</span> to start!
        </p>
      </div>
    </PageWrapper>
  )
}

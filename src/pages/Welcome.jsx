import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { checkUserExists, registerUser, loginUser } from '../lib/auth'
import { guestTraits } from '../data/traits'
import { CONSTANTS, cn } from '../lib/utils'

export function Welcome() {
  const [step, setStep] = useState('name') // 'name', 'create_pin', 'select_trait', 'enter_pin'
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [selectedTrait, setSelectedTrait] = useState(null)
  const [existingUser, setExistingUser] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const setUser = useUserStore((state) => state.setUser)
  const showToast = useUIStore((state) => state.showToast)

  const handleNameSubmit = async (e) => {
    e.preventDefault()

    if (!name.trim()) {
      showToast('error', 'Please enter your name')
      return
    }

    setIsLoading(true)

    try {
      // Check if user exists
      const user = await checkUserExists(name)

      if (user) {
        // User exists - need to login
        if (!user.pin_hash) {
          // V1 user - needs to create PIN
          setExistingUser(user)
          setStep('create_pin')
          showToast('info', 'Welcome back! Please create a PIN to secure your account')
        } else {
          // V2 user - login
          setExistingUser(user)
          setStep('enter_pin')
        }
      } else {
        // New user - create PIN
        setStep('create_pin')
      }
    } catch (error) {
      console.error('Name check error:', error)
      showToast('error', 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePINCreated = (e) => {
    e.preventDefault()

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      showToast('error', 'PIN must be 4 digits')
      return
    }

    if (pin !== confirmPin) {
      showToast('error', 'PINs do not match')
      return
    }

    // If existing user, register immediately
    if (existingUser) {
      handleCreateAccount()
    } else {
      // New user - go to trait selection
      setStep('select_trait')
    }
  }

  const handleTraitSelected = () => {
    if (!selectedTrait) {
      showToast('error', 'Please select your personality type')
      return
    }

    handleCreateAccount()
  }

  const handleCreateAccount = async () => {
    setIsLoading(true)

    try {
      // Register new user with trait
      const user = await registerUser(name, pin, selectedTrait?.id)

      setUser(user)
      showToast('success', `Welcome, ${user.name}! You received ${CONSTANTS.STARTING_COINS} coins!`)
      navigate('/dashboard')
    } catch (error) {
      console.error('Registration error:', error)
      showToast('error', error.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      showToast('error', 'PIN must be 4 digits')
      return
    }

    setIsLoading(true)

    try {
      const user = await loginUser(name, pin)

      setUser(user)
      showToast('success', `Welcome back, ${user.name}!`)
      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      showToast('error', error.message === 'Incorrect PIN' ? 'Incorrect PIN' : 'Login failed')
      setPin('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'select_trait') {
      setStep('create_pin')
      setSelectedTrait(null)
    } else {
      setStep('name')
      setPin('')
      setConfirmPin('')
      setExistingUser(null)
      setSelectedTrait(null)
    }
  }

  const handlePINInput = (value, setter) => {
    // Only allow digits and max 4 characters
    const sanitized = value.replace(/\D/g, '').slice(0, 4)
    setter(sanitized)
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

        {/* Step 1: Enter Name */}
        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="space-y-6">
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
              🎉 CONTINUE
            </Button>

            <p className="text-slate-500 text-sm mt-6">
              {existingUser ? 'Welcome back!' : `You'll receive ${CONSTANTS.STARTING_COINS} coins to start!`}
            </p>
          </form>
        )}

        {/* Step 2: Create PIN */}
        {step === 'create_pin' && (
          <form onSubmit={handlePINCreated} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                {existingUser ? 'Secure Your Account' : 'Create a PIN'}
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                {existingUser
                  ? 'Create a 4-digit PIN to secure your account'
                  : 'Easy to remember (like 2025 or 1234)'}
              </p>
            </div>

            <Input
              label="Create 4-digit PIN"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="••••"
              value={pin}
              onChange={(e) => handlePINInput(e.target.value, setPin)}
              maxLength={4}
              autoFocus
            />

            <Input
              label="Confirm PIN"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => handlePINInput(e.target.value, setConfirmPin)}
              maxLength={4}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={pin.length !== 4 || confirmPin.length !== 4}
            >
              {existingUser ? '✓ CREATE ACCOUNT' : '→ NEXT'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="lg"
              fullWidth
              onClick={handleBack}
            >
              ← Back
            </Button>
          </form>
        )}

        {/* Step 3: Select Trait (New Users Only) */}
        {step === 'select_trait' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                What's your party style?
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                This helps us give you fun missions!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {guestTraits.map((trait) => (
                <Card
                  key={trait.id}
                  hoverable
                  onClick={() => setSelectedTrait(trait)}
                  className={cn(
                    'cursor-pointer transition-all',
                    selectedTrait?.id === trait.id
                      ? 'ring-2 ring-purple-500 bg-purple-500/20'
                      : 'hover:bg-white/5'
                  )}
                  style={{
                    borderColor: selectedTrait?.id === trait.id ? trait.color : undefined,
                  }}
                >
                  <div className="text-center py-2">
                    <span className="text-3xl block mb-2">{trait.emoji}</span>
                    <p className="text-white text-sm font-medium">{trait.name}</p>
                    <p className="text-slate-400 text-xs mt-1">{trait.description}</p>
                  </div>
                </Card>
              ))}
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleTraitSelected}
              loading={isLoading}
              disabled={!selectedTrait}
            >
              ✓ CREATE ACCOUNT
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="lg"
              fullWidth
              onClick={handleBack}
            >
              ← Back
            </Button>
          </div>
        )}

        {/* Step 4: Enter PIN (Existing User Login) */}
        {step === 'enter_pin' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Welcome back, {name}! 👋
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Enter your 4-digit PIN
              </p>
            </div>

            <Input
              label="PIN"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="••••"
              value={pin}
              onChange={(e) => handlePINInput(e.target.value, setPin)}
              maxLength={4}
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={pin.length !== 4}
            >
              ✓ LOGIN
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="lg"
              fullWidth
              onClick={handleBack}
            >
              ← Back
            </Button>

            <p className="text-slate-500 text-xs mt-4">
              Forgot PIN? Ask an admin for help
            </p>
          </form>
        )}
      </div>
    </PageWrapper>
  )
}

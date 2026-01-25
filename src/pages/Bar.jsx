import { useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { drinks, drinkCategories } from '../data/drinks'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { supabase } from '../lib/supabase'
import { generateOrderCode } from '../lib/utils'
import { cn } from '../lib/utils'

export function Bar() {
  const [selectedDrink, setSelectedDrink] = useState(null)
  const [orderCode, setOrderCode] = useState(null)
  const [isOrdering, setIsOrdering] = useState(false)
  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  const handleOrder = async () => {
    if (!selectedDrink || !user) return

    // Check balance
    if (user.balance < selectedDrink.price) {
      showToast('error', "Not enough coins!")
      return
    }

    setIsOrdering(true)

    try {
      const code = generateOrderCode()

      // Create bar order
      const { error: orderError } = await supabase.from('bar_orders').insert({
        user_id: user.id,
        drink_id: selectedDrink.id,
        drink_name: selectedDrink.name,
        price: selectedDrink.price,
        order_code: code,
        status: 'pending',
      })

      if (orderError) throw orderError

      // Deduct coins if not free
      if (selectedDrink.price > 0) {
        const newBalance = user.balance - selectedDrink.price

        const { error: balanceError } = await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', user.id)

        if (balanceError) throw balanceError

        // Log transaction
        await supabase.from('transactions').insert({
          from_user_id: user.id,
          amount: selectedDrink.price,
          type: 'bar_order',
          description: `Ordered ${selectedDrink.name}`,
        })

        updateBalance(newBalance)
      }

      setOrderCode(code)
      showToast('success', 'Order placed!')
    } catch (error) {
      console.error('Order error:', error)
      showToast('error', 'Failed to place order')
    } finally {
      setIsOrdering(false)
    }
  }

  const groupedDrinks = drinkCategories.map((category) => ({
    ...category,
    drinks: drinks.filter((d) => d.category === category.id),
  }))

  return (
    <>
      <Header title="Bar Menu" showBack showBalance />

      <PageWrapper className="pt-0 pb-8">
        <p className="text-pastel-purple-light text-sm mb-6">
          🍸 What would you like?
        </p>

        {/* Menu grouped by category */}
        {groupedDrinks.map((category) => (
          <div key={category.id} className="mb-6">
            <h3
              className="text-sm font-semibold uppercase tracking-wide mb-3"
              style={{ color: category.color }}
            >
              {category.name}
            </h3>

            <div className="space-y-2">
              {category.drinks.map((drink) => (
                <DrinkItem
                  key={drink.id}
                  drink={drink}
                  onSelect={() => setSelectedDrink(drink)}
                  disabled={drink.price > user?.balance}
                />
              ))}
            </div>
          </div>
        ))}
      </PageWrapper>

      {/* Confirm Order Modal */}
      <Modal
        isOpen={!!selectedDrink && !orderCode}
        onClose={() => setSelectedDrink(null)}
        title="Order Confirmation"
      >
        {selectedDrink && (
          <div className="text-center">
            <span className="text-6xl block mb-4">{selectedDrink.emoji}</span>
            <h3 className="text-xl font-semibold text-white">
              {selectedDrink.name}
            </h3>
            <p className="text-coin-gold text-2xl font-bold mt-2">
              {selectedDrink.price === 0 ? 'FREE' : `${selectedDrink.price}🪙`}
            </p>

            {selectedDrink.price > 0 && (
              <p className="text-slate-400 text-sm mt-4">
                Your balance: {user?.balance}🪙 → {user?.balance - selectedDrink.price}🪙
              </p>
            )}

            <div className="flex flex-col gap-3 mt-6">
              <Button
                variant="gold"
                fullWidth
                onClick={handleOrder}
                loading={isOrdering}
              >
                ✓ CONFIRM ORDER
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setSelectedDrink(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Order Success Modal */}
      <Modal
        isOpen={!!orderCode}
        onClose={() => {
          setOrderCode(null)
          setSelectedDrink(null)
        }}
        showClose={false}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-status-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-status-success text-3xl">✓</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Order Placed!
          </h3>
          <p className="text-slate-400 mb-6">Your order code:</p>

          <div className="bg-bg-card rounded-xl py-6 px-8 mb-6">
            <span className="text-4xl font-mono font-bold text-white">
              #{orderCode}
            </span>
          </div>

          <p className="text-slate-400 text-sm mb-6">
            Show this to the bartender
          </p>

          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              setOrderCode(null)
              setSelectedDrink(null)
            }}
          >
            Done
          </Button>
        </div>
      </Modal>
    </>
  )
}

function DrinkItem({ drink, onSelect, disabled }) {
  return (
    <Card
      hoverable={!disabled}
      onClick={disabled ? undefined : onSelect}
      className={cn(
        'flex items-center gap-4',
        disabled && 'opacity-50'
      )}
    >
      <span className="text-3xl">{drink.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-white font-medium">{drink.name}</h4>
          {drink.popular && (
            <Badge variant="pink" size="sm">⭐ Popular</Badge>
          )}
        </div>
        <p className="text-slate-400 text-sm truncate">{drink.description}</p>
      </div>
      <span className={cn(
        'font-bold',
        drink.price === 0 ? 'text-status-success' : 'text-coin-gold'
      )}>
        {drink.price === 0 ? 'FREE' : `${drink.price}🪙`}
      </span>
    </Card>
  )
}

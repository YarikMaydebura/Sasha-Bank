import { useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { supabase } from '../lib/supabase'
import { drinks } from '../data/drinks'
import { punishments, punishmentDifficulties } from '../data/punishments'
import { favors } from '../data/favors'
import { abilities, abilityCategories } from '../data/abilities'
import { generateOrderCode, cn } from '../lib/utils'

const tabs = [
  { id: 'gifts', label: 'Gifts', icon: '🎁' },
  { id: 'punishments', label: 'Punishments', icon: '😈' },
  { id: 'favors', label: 'Favors', icon: '👑' },
  { id: 'abilities', label: 'Abilities', icon: '⚡' },
]

export function Market() {
  const [activeTab, setActiveTab] = useState('gifts')
  const user = useUserStore((state) => state.user)

  if (!user) return null

  return (
    <>
      <Header title="Market" showBack showBalance />

      <PageWrapper className="pt-0">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'gifts' && <GiftsTab />}
        {activeTab === 'punishments' && <PunishmentsTab />}
        {activeTab === 'favors' && <FavorsTab />}
        {activeTab === 'abilities' && <AbilitiesTab />}
      </PageWrapper>
    </>
  )
}

// Gifts Tab: Send drinks to others
function GiftsTab() {
  const [selectedDrink, setSelectedDrink] = useState(null)
  const [selectedRecipient, setSelectedRecipient] = useState(null)
  const [users, setUsers] = useState([])
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showUserSelect, setShowUserSelect] = useState(false)
  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .neq('id', user.id)
      .order('name')
    setUsers(data || [])
  }

  const handleSelectDrink = (drink) => {
    setSelectedDrink(drink)
    fetchUsers()
    setShowUserSelect(true)
  }

  const handleSendGift = async () => {
    if (!selectedDrink || !selectedRecipient || user.balance < selectedDrink.price) return

    setIsSending(true)
    try {
      const code = generateOrderCode()

      // Create bar order for recipient
      await supabase.from('bar_orders').insert({
        user_id: selectedRecipient.id,
        drink_id: selectedDrink.id,
        drink_name: selectedDrink.name,
        price: 0, // Free for recipient
        order_code: code,
        status: 'pending',
      })

      // Create gift drink record
      await supabase.from('gift_drinks').insert({
        from_user_id: user.id,
        to_user_id: selectedRecipient.id,
        drink_id: selectedDrink.id,
        drink_name: selectedDrink.name,
        price: selectedDrink.price,
        order_code: code,
        message: message || null,
        status: 'pending',
      })

      // Deduct coins from sender
      const newBalance = user.balance - selectedDrink.price
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: selectedDrink.price,
        type: 'gift_drink',
        description: `Gift ${selectedDrink.name} to ${selectedRecipient.name}`,
      })

      updateBalance(newBalance)

      // Notify recipient
      await supabase.from('notifications').insert({
        user_id: selectedRecipient.id,
        type: 'gift_received',
        title: '🎁 Gift Received!',
        message: `${user.name} sent you ${selectedDrink.name}${message ? `: "${message}"` : '!'}`,
        data: { from_user: user.name, drink: selectedDrink.name, code },
      })

      showToast('success', `Gift sent to ${selectedRecipient.name}!`)
      setSelectedDrink(null)
      setSelectedRecipient(null)
      setMessage('')
      setShowUserSelect(false)
    } catch (error) {
      console.error('Error sending gift:', error)
      showToast('error', 'Failed to send gift')
    } finally {
      setIsSending(false)
    }
  }

  const affordableDrinks = drinks.filter(d => d.price > 0 && d.price <= user.balance)

  return (
    <>
      <p className="text-slate-400 text-sm mb-4">
        Send a drink to someone special 🍸
      </p>

      <div className="space-y-2">
        {affordableDrinks.map((drink) => (
          <Card
            key={drink.id}
            hoverable
            onClick={() => handleSelectDrink(drink)}
            className="flex items-center gap-4"
          >
            <span className="text-3xl">{drink.emoji}</span>
            <div className="flex-1">
              <h4 className="text-white font-medium">{drink.name}</h4>
              <p className="text-slate-400 text-sm">{drink.description}</p>
            </div>
            <span className="text-coin-gold font-bold">{drink.price}🪙</span>
          </Card>
        ))}
      </div>

      {affordableDrinks.length === 0 && (
        <div className="text-center py-12">
          <span className="text-5xl block mb-4">💸</span>
          <p className="text-slate-400">Not enough coins to send gifts</p>
        </div>
      )}

      {/* User Selection Modal */}
      <Modal
        isOpen={showUserSelect && !!selectedDrink}
        onClose={() => {
          setShowUserSelect(false)
          setSelectedDrink(null)
          setSelectedRecipient(null)
          setMessage('')
        }}
        title={`Send ${selectedDrink?.name}`}
      >
        {selectedRecipient ? (
          <div>
            <div className="text-center mb-4">
              <span className="text-6xl block mb-2">{selectedDrink.emoji}</span>
              <p className="text-white font-medium">To: {selectedRecipient.name}</p>
              <p className="text-coin-gold font-bold text-xl mt-2">{selectedDrink.price}🪙</p>
            </div>

            <textarea
              className="w-full bg-bg-card border border-white/10 rounded-lg p-3 text-white placeholder-slate-500 text-sm"
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={100}
            />

            <div className="flex gap-3 mt-4">
              <Button
                variant="gold"
                fullWidth
                onClick={handleSendGift}
                loading={isSending}
              >
                Send Gift
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSelectedRecipient(null)}
              >
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-slate-400 text-sm mb-4">Choose recipient:</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((u) => (
                <Card
                  key={u.id}
                  hoverable
                  onClick={() => setSelectedRecipient(u)}
                  className="flex items-center justify-between"
                >
                  <span className="text-white">{u.name}</span>
                  <span className="text-pastel-purple text-sm">→</span>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

// Punishments Tab: Assign punishments to others
function PunishmentsTab() {
  const [selectedPunishment, setSelectedPunishment] = useState(null)
  const [selectedVictim, setSelectedVictim] = useState(null)
  const [users, setUsers] = useState([])
  const [isAssigning, setIsAssigning] = useState(false)
  const [showUserSelect, setShowUserSelect] = useState(false)
  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .neq('id', user.id)
      .order('name')
    setUsers(data || [])
  }

  const handleSelectPunishment = (punishment) => {
    setSelectedPunishment(punishment)
    fetchUsers()
    setShowUserSelect(true)
  }

  const handleAssignPunishment = async () => {
    if (!selectedPunishment || !selectedVictim || user.balance < selectedPunishment.price) return

    setIsAssigning(true)
    try {
      // Deduct coins
      const newBalance = user.balance - selectedPunishment.price
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: selectedPunishment.price,
        type: 'punishment_assign',
        description: `Assigned punishment to ${selectedVictim.name}`,
      })

      updateBalance(newBalance)

      // Create punishment
      await supabase.from('assigned_punishments').insert({
        from_user_id: user.id,
        to_user_id: selectedVictim.id,
        punishment_id: selectedPunishment.id,
        punishment_text: selectedPunishment.description,
        source: 'market',
        status: 'pending',
        deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })

      // Notify victim
      await supabase.from('notifications').insert({
        user_id: selectedVictim.id,
        type: 'punishment_assigned',
        title: '😈 Punishment Assigned!',
        message: `${user.name} assigned you: ${selectedPunishment.name}`,
        data: { from_user: user.name, punishment: selectedPunishment.name },
      })

      showToast('success', `Punishment assigned to ${selectedVictim.name}!`)
      setSelectedPunishment(null)
      setSelectedVictim(null)
      setShowUserSelect(false)
    } catch (error) {
      console.error('Error assigning punishment:', error)
      showToast('error', 'Failed to assign punishment')
    } finally {
      setIsAssigning(false)
    }
  }

  const affordablePunishments = punishments.filter(p => p.price <= user.balance)

  return (
    <>
      <p className="text-slate-400 text-sm mb-4">
        Assign fun challenges to others 😈
      </p>

      <div className="space-y-2">
        {affordablePunishments.map((punishment) => {
          const diffColor = punishmentDifficulties.find(d => d.id === punishment.difficulty)?.color

          return (
            <Card
              key={punishment.id}
              hoverable
              onClick={() => handleSelectPunishment(punishment)}
              className="flex items-center gap-4"
            >
              <span className="text-3xl">{punishment.emoji}</span>
              <div className="flex-1">
                <h4 className="text-white font-medium">{punishment.name}</h4>
                <p className="text-slate-400 text-sm">{punishment.description}</p>
                <Badge
                  size="sm"
                  className="mt-1"
                  style={{ backgroundColor: diffColor }}
                >
                  {punishment.difficulty}
                </Badge>
              </div>
              <span className="text-coin-gold font-bold">{punishment.price}🪙</span>
            </Card>
          )
        })}
      </div>

      {affordablePunishments.length === 0 && (
        <div className="text-center py-12">
          <span className="text-5xl block mb-4">💸</span>
          <p className="text-slate-400">Not enough coins</p>
        </div>
      )}

      {/* User Selection Modal */}
      <Modal
        isOpen={showUserSelect && !!selectedPunishment}
        onClose={() => {
          setShowUserSelect(false)
          setSelectedPunishment(null)
          setSelectedVictim(null)
        }}
        title="Choose Victim"
      >
        {selectedVictim ? (
          <div className="text-center">
            <span className="text-6xl block mb-4">{selectedPunishment.emoji}</span>
            <h3 className="text-xl font-semibold text-white mb-2">
              {selectedPunishment.name}
            </h3>
            <p className="text-slate-400 mb-4">{selectedPunishment.description}</p>
            <p className="text-white mb-2">
              Victim: <span className="text-pastel-purple font-bold">{selectedVictim.name}</span>
            </p>
            <p className="text-coin-gold font-bold text-xl mb-6">{selectedPunishment.price}🪙</p>

            <div className="flex gap-3">
              <Button
                variant="danger"
                fullWidth
                onClick={handleAssignPunishment}
                loading={isAssigning}
              >
                Assign Punishment
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSelectedVictim(null)}
              >
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-slate-400 text-sm mb-4">Choose your victim:</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((u) => (
                <Card
                  key={u.id}
                  hoverable
                  onClick={() => setSelectedVictim(u)}
                  className="flex items-center justify-between"
                >
                  <span className="text-white">{u.name}</span>
                  <span className="text-red-400 text-sm">😈</span>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

// Sasha Favors Tab
function FavorsTab() {
  const [selectedFavor, setSelectedFavor] = useState(null)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  const handlePurchase = async () => {
    if (!selectedFavor || user.balance < selectedFavor.price) return

    setIsPurchasing(true)
    try {
      // Deduct coins
      const newBalance = user.balance - selectedFavor.price
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: selectedFavor.price,
        type: 'favor_purchase',
        description: `Purchased: ${selectedFavor.name}`,
      })

      updateBalance(newBalance)

      // Create favor record
      await supabase.from('purchased_favors').insert({
        user_id: user.id,
        favor_id: selectedFavor.id,
        status: 'pending',
      })

      // Notify admins
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: 'favor_purchased',
          title: '👑 Favor Purchased',
          message: `${user.name} purchased: ${selectedFavor.name}`,
          data: { user_name: user.name, favor: selectedFavor.name },
        }))
        await supabase.from('notifications').insert(notifications)
      }

      showToast('success', `${selectedFavor.name} purchased! Sasha will fulfill it soon 👑`)
      setSelectedFavor(null)
    } catch (error) {
      console.error('Error purchasing favor:', error)
      showToast('error', 'Failed to purchase')
    } finally {
      setIsPurchasing(false)
    }
  }

  const affordableFavors = favors.filter(f => f.price <= user.balance)

  return (
    <>
      <p className="text-slate-400 text-sm mb-4">
        Buy special favors from Sasha 👑
      </p>

      <div className="space-y-2">
        {favors.map((favor) => {
          const canAfford = favor.price <= user.balance

          return (
            <Card
              key={favor.id}
              hoverable={canAfford}
              onClick={canAfford ? () => setSelectedFavor(favor) : undefined}
              className={cn(
                'flex items-center gap-4',
                !canAfford && 'opacity-50'
              )}
            >
              <span className="text-3xl">{favor.emoji}</span>
              <div className="flex-1">
                <h4 className="text-white font-medium">{favor.name}</h4>
                <p className="text-slate-400 text-sm">{favor.description}</p>
              </div>
              <span className="text-coin-gold font-bold">{favor.price}🪙</span>
            </Card>
          )
        })}
      </div>

      {/* Purchase Confirmation Modal */}
      <Modal
        isOpen={!!selectedFavor}
        onClose={() => setSelectedFavor(null)}
        title="Purchase Favor"
      >
        {selectedFavor && (
          <div className="text-center">
            <span className="text-6xl block mb-4">{selectedFavor.emoji}</span>
            <h3 className="text-xl font-semibold text-white mb-2">
              {selectedFavor.name}
            </h3>
            <p className="text-slate-400 mb-4">{selectedFavor.description}</p>
            <p className="text-coin-gold font-bold text-2xl mb-6">{selectedFavor.price}🪙</p>

            <div className="flex flex-col gap-3">
              <Button
                variant="gold"
                fullWidth
                onClick={handlePurchase}
                loading={isPurchasing}
              >
                Purchase
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setSelectedFavor(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

// Abilities Tab
function AbilitiesTab() {
  const [selectedAbility, setSelectedAbility] = useState(null)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  const handlePurchase = async () => {
    if (!selectedAbility || user.balance < selectedAbility.price) return

    setIsPurchasing(true)
    try {
      // Deduct coins
      const newBalance = user.balance - selectedAbility.price
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id)

      await supabase.from('transactions').insert({
        from_user_id: user.id,
        amount: selectedAbility.price,
        type: 'ability_purchase',
        description: `Purchased: ${selectedAbility.name}`,
      })

      updateBalance(newBalance)

      // Create ability record
      await supabase.from('user_abilities').insert({
        user_id: user.id,
        ability_id: selectedAbility.id,
        status: 'owned',
      })

      // Apply special effects immediately for some abilities
      if (selectedAbility.effect === 'immunity_10min') {
        await supabase
          .from('users')
          .update({ has_immunity_shield: true })
          .eq('id', user.id)

        showToast('success', '🛡️ Immunity shield activated for 10 minutes!')

        // Remove after 10 minutes
        setTimeout(async () => {
          await supabase
            .from('users')
            .update({ has_immunity_shield: false })
            .eq('id', user.id)
        }, 10 * 60 * 1000)
      } else if (selectedAbility.effect === 'double_reward') {
        await supabase
          .from('users')
          .update({ has_double_reward: true })
          .eq('id', user.id)
        showToast('success', '💎 Next mission gives 2x coins!')
      } else if (selectedAbility.effect === 'song_request') {
        // Show input for song request
        const song = prompt('Enter song title:')
        if (song) {
          await supabase.from('song_requests').insert({
            user_id: user.id,
            song_title: song,
            status: 'pending',
          })

          // Notify admins
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin')

          if (admins && admins.length > 0) {
            const notifications = admins.map(admin => ({
              user_id: admin.id,
              type: 'song_requested',
              title: '🎵 Song Request',
              message: `${user.name} requested: ${song}`,
              data: { user_name: user.name, song },
            }))
            await supabase.from('notifications').insert(notifications)
          }

          showToast('success', '🎵 Song request sent!')
        }
      } else {
        showToast('success', `${selectedAbility.name} purchased!`)
      }

      setSelectedAbility(null)
    } catch (error) {
      console.error('Error purchasing ability:', error)
      showToast('error', 'Failed to purchase')
    } finally {
      setIsPurchasing(false)
    }
  }

  return (
    <>
      <p className="text-slate-400 text-sm mb-4">
        Buy special ability cards ⚡
      </p>

      <div className="space-y-2">
        {abilities.map((ability) => {
          const canAfford = ability.price <= user.balance
          const category = abilityCategories.find(c => c.id === ability.category)

          return (
            <Card
              key={ability.id}
              hoverable={canAfford}
              onClick={canAfford ? () => setSelectedAbility(ability) : undefined}
              className={cn(
                'flex items-center gap-4',
                !canAfford && 'opacity-50'
              )}
            >
              <span className="text-4xl">{ability.emoji}</span>
              <div className="flex-1">
                <h4 className="text-white font-medium">{ability.name}</h4>
                <p className="text-slate-400 text-sm">{ability.description}</p>
                {category && (
                  <Badge
                    size="sm"
                    className="mt-1"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.name}
                  </Badge>
                )}
              </div>
              <span className="text-coin-gold font-bold">{ability.price}🪙</span>
            </Card>
          )
        })}
      </div>

      {/* Purchase Confirmation Modal */}
      <Modal
        isOpen={!!selectedAbility}
        onClose={() => setSelectedAbility(null)}
        title="Purchase Ability"
      >
        {selectedAbility && (
          <div className="text-center">
            <span className="text-6xl block mb-4">{selectedAbility.emoji}</span>
            <h3 className="text-xl font-semibold text-white mb-2">
              {selectedAbility.name}
            </h3>
            <p className="text-slate-400 mb-4">{selectedAbility.description}</p>
            <p className="text-coin-gold font-bold text-2xl mb-6">{selectedAbility.price}🪙</p>

            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                fullWidth
                onClick={handlePurchase}
                loading={isPurchasing}
              >
                Purchase
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setSelectedAbility(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

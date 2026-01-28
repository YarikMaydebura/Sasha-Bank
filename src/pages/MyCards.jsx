import { useState, useEffect } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { BottomNav } from '../components/layout/BottomNav'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { supabase } from '../lib/supabase'
import { cardRarities, cardCategories, getCardById } from '../data/cards'
import { cn } from '../lib/utils'

export function MyCards() {
  const [userCards, setUserCards] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [showUseCard, setShowUseCard] = useState(false)
  const [users, setUsers] = useState([])
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [isUsing, setIsUsing] = useState(false)
  const [filter, setFilter] = useState('all') // 'all', 'owned', 'used'
  const user = useUserStore((state) => state.user)
  const showToast = useUIStore((state) => state.showToast)

  // Fetch user's cards
  useEffect(() => {
    if (!user) return
    fetchCards()
  }, [user])

  // Subscribe to card changes
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('user-cards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_cards',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCards()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching cards:', error)
      return
    }

    setUserCards(data || [])
  }

  const fetchTargetUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .neq('id', user.id)
      .order('name')

    setUsers(data || [])
  }

  const handleCardClick = (cardRecord) => {
    if (cardRecord.status !== 'owned') return

    setSelectedCard(cardRecord)

    const cardData = getCardById(cardRecord.card_id)
    if (cardData?.requires_target) {
      fetchTargetUsers()
    }
  }

  const handleUseCard = async () => {
    if (!selectedCard) return

    const cardData = getCardById(selectedCard.card_id)

    // Validate target requirement
    if (cardData.requires_target && !selectedTarget) {
      showToast('error', 'Please select a target')
      return
    }

    setIsUsing(true)

    try {
      // Execute card effect
      await executeCardEffect(selectedCard, cardData, selectedTarget)

      // Mark card as used
      await supabase
        .from('user_cards')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          used_on_user_id: selectedTarget?.id || null,
        })
        .eq('id', selectedCard.id)

      // Log usage for admin
      await supabase.from('card_usage_logs').insert({
        user_id: user.id,
        card_id: selectedCard.card_id,
        card_name: selectedCard.card_name,
        target_user_id: selectedTarget?.id || null,
        target_user_name: selectedTarget?.name || null,
        effect_description: `${user.name} used ${cardData.name}${selectedTarget ? ` on ${selectedTarget.name}` : ''}`,
      })

      // Notify target if applicable
      if (selectedTarget && !cardData.requires_admin) {
        await supabase.from('notifications').insert({
          user_id: selectedTarget.id,
          type: 'card_used_on_you',
          title: `${cardData.emoji} Card Used!`,
          message: `${user.name} used "${cardData.name}" on you`,
          data: {
            card_id: cardData.id,
            from_user_name: user.name,
          },
        })
      }

      // Notify admins if required
      if (cardData.requires_admin) {
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin) => ({
            user_id: admin.id,
            type: 'card_admin_action',
            title: `${cardData.emoji} ${cardData.name}`,
            message: `${user.name} used ${cardData.name}${selectedTarget ? ` on ${selectedTarget.name}` : ''}`,
            data: {
              user_id: user.id,
              user_name: user.name,
              card_id: cardData.id,
              target_user_id: selectedTarget?.id,
              target_user_name: selectedTarget?.name,
            },
          }))
          await supabase.from('notifications').insert(notifications)
        }
      }

      showToast('success', `${cardData.emoji} ${cardData.name} used!`)
      setSelectedCard(null)
      setSelectedTarget(null)
      setShowUseCard(false)
      fetchCards()
    } catch (error) {
      console.error('Error using card:', error)
      showToast('error', 'Failed to use card')
    } finally {
      setIsUsing(false)
    }
  }

  const executeCardEffect = async (cardRecord, cardData, target) => {
    const effect = cardData.effect

    switch (effect) {
      case 'steal_coins':
        // Steal coins from target
        if (!target) return

        const stealAmount = cardData.effect_value || 3

        // Get target's balance
        const { data: targetUser } = await supabase
          .from('users')
          .select('balance')
          .eq('id', target.id)
          .single()

        const actualSteal = Math.min(stealAmount, targetUser.balance)

        // Deduct from target
        await supabase
          .from('users')
          .update({ balance: targetUser.balance - actualSteal })
          .eq('id', target.id)

        // Add to current user
        await supabase
          .from('users')
          .update({ balance: user.balance + actualSteal })
          .eq('id', user.id)

        // Create transactions
        await supabase.from('transactions').insert([
          {
            from_user_id: target.id,
            to_user_id: user.id,
            amount: actualSteal,
            type: 'card_steal',
            description: `${user.name} stole ${actualSteal} coins using Steal Card`,
          },
        ])
        break

      case 'swap_balance':
        // Swap balances
        if (!target) return

        const { data: targetUserSwap } = await supabase
          .from('users')
          .select('balance')
          .eq('id', target.id)
          .single()

        await supabase
          .from('users')
          .update({ balance: user.balance })
          .eq('id', target.id)

        await supabase
          .from('users')
          .update({ balance: targetUserSwap.balance })
          .eq('id', user.id)
        break

      case 'instant_coins':
        // Add instant coins
        const coins = cardData.effect_value || 5
        await supabase
          .from('users')
          .update({ balance: user.balance + coins })
          .eq('id', user.id)

        await supabase.from('transactions').insert({
          to_user_id: user.id,
          amount: coins,
          type: 'card_reward',
          description: `Received ${coins} coins from ${cardData.name}`,
        })
        break

      case 'double_mission_reward':
        // Set flag for double reward on next mission
        await supabase
          .from('users')
          .update({ has_double_reward: true })
          .eq('id', user.id)
        break

      case 'immunity_shield':
        // Set immunity shield
        await supabase
          .from('users')
          .update({ has_immunity_shield: true })
          .eq('id', user.id)

        // Auto-remove after duration
        if (cardData.effect_duration) {
          setTimeout(async () => {
            await supabase
              .from('users')
              .update({ has_immunity_shield: false })
              .eq('id', user.id)
          }, cardData.effect_duration)
        }
        break

      case 'song_request':
        // Handled by admin, no automatic effect
        break

      default:
        // Admin-handled or social cards - no automatic effect
        break
    }
  }

  const filteredCards = userCards.filter((card) => {
    if (filter === 'all') return true
    return card.status === filter
  })

  const ownedCount = userCards.filter((c) => c.status === 'owned').length
  const usedCount = userCards.filter((c) => c.status === 'used').length

  if (!user) return null

  return (
    <>
      <Header title="My Cards" showBack showBalance />

      <PageWrapper withNav className="pt-0">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="text-center">
            <div className="text-2xl font-bold text-white">{userCards.length}</div>
            <div className="text-xs text-slate-400">Total</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-green-400">{ownedCount}</div>
            <div className="text-xs text-slate-400">Available</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-slate-500">{usedCount}</div>
            <div className="text-xs text-slate-400">Used</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1 rounded-lg text-sm font-medium transition-all',
              filter === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter('owned')}
            className={cn(
              'px-3 py-1 rounded-lg text-sm font-medium transition-all',
              filter === 'owned'
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            Available
          </button>
          <button
            onClick={() => setFilter('used')}
            className={cn(
              'px-3 py-1 rounded-lg text-sm font-medium transition-all',
              filter === 'used'
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            )}
          >
            Used
          </button>
        </div>

        {/* Cards Grid */}
        {filteredCards.length === 0 ? (
          <Card className="text-center py-8">
            <span className="text-6xl block mb-4">🃏</span>
            <p className="text-slate-400">
              {filter === 'all' ? 'No cards yet' : `No ${filter} cards`}
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Win cards from Risk, missions, or lottery!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredCards.map((cardRecord) => {
              const cardData = getCardById(cardRecord.card_id)
              if (!cardData) return null

              const rarityConfig = cardRarities[cardRecord.rarity]
              const categoryConfig = cardCategories[cardData.category]
              const isOwned = cardRecord.status === 'owned'

              return (
                <Card
                  key={cardRecord.id}
                  hoverable={isOwned}
                  onClick={() => handleCardClick(cardRecord)}
                  className={cn(
                    'relative overflow-hidden transition-all',
                    !isOwned && 'opacity-50'
                  )}
                  style={{
                    borderColor: rarityConfig.color,
                    boxShadow: isOwned ? `0 0 20px ${rarityConfig.glow}` : 'none',
                  }}
                >
                  {/* Rarity badge */}
                  <Badge
                    size="sm"
                    className="absolute top-2 right-2"
                    style={{ backgroundColor: rarityConfig.color }}
                  >
                    {rarityConfig.name}
                  </Badge>

                  {/* Card content */}
                  <div className="text-center pt-6">
                    <span className="text-5xl block mb-2">{cardData.emoji}</span>
                    <h4 className="text-white font-semibold text-sm mb-1">
                      {cardData.name}
                    </h4>
                    <p className="text-slate-400 text-xs mb-2">
                      {cardData.description}
                    </p>

                    {/* Category badge */}
                    <Badge
                      size="sm"
                      style={{ backgroundColor: categoryConfig.color }}
                    >
                      {categoryConfig.emoji} {categoryConfig.name}
                    </Badge>

                    {/* Used indicator */}
                    {!isOwned && (
                      <div className="mt-2 text-xs text-slate-500">
                        Used {new Date(cardRecord.used_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Card Details Modal */}
        <Modal
          isOpen={!!selectedCard && !showUseCard}
          onClose={() => setSelectedCard(null)}
          title="Card Details"
        >
          {selectedCard && (() => {
            const cardData = getCardById(selectedCard.card_id)
            if (!cardData) return null

            const rarityConfig = cardRarities[selectedCard.rarity]
            const categoryConfig = cardCategories[cardData.category]

            return (
              <div className="text-center">
                <span className="text-7xl block mb-4">{cardData.emoji}</span>

                <h3
                  className="text-2xl font-bold mb-2"
                  style={{ color: rarityConfig.color }}
                >
                  {cardData.name}
                </h3>

                <Badge
                  size="md"
                  className="mb-4"
                  style={{ backgroundColor: rarityConfig.color }}
                >
                  {rarityConfig.name}
                </Badge>

                <p className="text-slate-300 mb-4">{cardData.description}</p>

                <Badge style={{ backgroundColor: categoryConfig.color }}>
                  {categoryConfig.emoji} {categoryConfig.name}
                </Badge>

                {cardData.requires_admin && (
                  <p className="text-yellow-400 text-xs mt-4">
                    ⚠️ Requires admin approval
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => setShowUseCard(true)}
                  >
                    Use Card
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => setSelectedCard(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )
          })()}
        </Modal>

        {/* Use Card Modal (Target Selection) */}
        <Modal
          isOpen={showUseCard}
          onClose={() => {
            setShowUseCard(false)
            setSelectedTarget(null)
          }}
          title="Use Card"
        >
          {selectedCard && (() => {
            const cardData = getCardById(selectedCard.card_id)
            if (!cardData) return null

            return (
              <div>
                <div className="text-center mb-6">
                  <span className="text-5xl block mb-2">{cardData.emoji}</span>
                  <h4 className="text-white font-semibold">{cardData.name}</h4>
                </div>

                {cardData.requires_target ? (
                  <>
                    <p className="text-slate-400 text-sm mb-4">Select a target:</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
                      {users.map((u) => (
                        <Card
                          key={u.id}
                          hoverable
                          onClick={() => setSelectedTarget(u)}
                          className={cn(
                            'transition-all',
                            selectedTarget?.id === u.id &&
                              'ring-2 ring-purple-500 bg-purple-500/20'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-white">{u.name}</span>
                            {selectedTarget?.id === u.id && (
                              <span className="text-purple-400">✓</span>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400 text-sm mb-6">
                    Ready to use this card?
                  </p>
                )}

                <div className="flex flex-col gap-3">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleUseCard}
                    loading={isUsing}
                    disabled={cardData.requires_target && !selectedTarget}
                  >
                    Confirm Use
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => {
                      setShowUseCard(false)
                      setSelectedTarget(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )
          })()}
        </Modal>
      </PageWrapper>

      <BottomNav />
    </>
  )
}

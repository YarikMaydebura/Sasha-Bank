import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { cardRarities } from '../../data/cards'
import { cn } from '../../lib/utils'

export function BigCardsSection({ cards = [], cardCount = 0 }) {
  const navigate = useNavigate()

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🃏</span>
          <h2 className="text-lg font-bold text-white">My Cards</h2>
        </div>
        <button
          onClick={() => navigate('/my-cards')}
          className="text-purple-400 text-sm hover:text-purple-300 transition-colors"
        >
          View All ({cardCount})
        </button>
      </div>

      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        {cardCount === 0 ? (
          <div className="text-center py-8">
            <span className="text-5xl block mb-3">🎴</span>
            <p className="text-slate-400 text-sm mb-2">No cards yet</p>
            <p className="text-slate-500 text-xs">
              Win cards from Risk, missions, or lottery!
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {cards.slice(0, 5).map((card, index) => {
                const rarityConfig = cardRarities[card.rarity]

                return (
                  <div
                    key={card.id || index}
                    className={cn(
                      'flex-shrink-0 w-20 h-24 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105',
                      'border-2'
                    )}
                    style={{
                      borderColor: rarityConfig?.color || '#9CA3AF',
                      backgroundColor: `${rarityConfig?.color || '#9CA3AF'}20`,
                      boxShadow: `0 0 15px ${rarityConfig?.glow || 'rgba(156, 163, 175, 0.3)'}`,
                    }}
                    onClick={() => navigate('/my-cards')}
                  >
                    <span className="text-3xl mb-1">{card.card_emoji}</span>
                    <Badge
                      size="sm"
                      className="text-[8px] px-1"
                      style={{ backgroundColor: rarityConfig?.color }}
                    >
                      {card.rarity}
                    </Badge>
                  </div>
                )
              })}

              {cardCount > 5 && (
                <div
                  className="flex-shrink-0 w-20 h-24 rounded-xl flex items-center justify-center bg-white/5 border-2 border-white/10 cursor-pointer hover:bg-white/10 transition-all"
                  onClick={() => navigate('/my-cards')}
                >
                  <div className="text-center">
                    <span className="text-lg font-bold text-white">+{cardCount - 5}</span>
                    <p className="text-[8px] text-slate-400">more</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => navigate('/my-cards')}
                className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-300 text-sm font-medium transition-all"
              >
                Manage Cards
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

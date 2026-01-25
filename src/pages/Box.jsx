import { useState, useEffect } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Timer } from '../components/ui/Timer'
import { Spinner } from '../components/ui/Spinner'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'
import { CONSTANTS, cn } from '../lib/utils'
import { Minus, Plus } from 'lucide-react'

export function Box() {
  const [roundStatus, setRoundStatus] = useState('waiting') // waiting, bidding, ended
  const [queue, setQueue] = useState([])
  const [currentRound, setCurrentRound] = useState(null)
  const [myBid, setMyBid] = useState(CONSTANTS.BOX_MIN_BID)
  const [hasBid, setHasBid] = useState(false)
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const showToast = useUIStore((state) => state.showToast)

  const isInQueue = queue.some((u) => u.id === user?.id)

  useEffect(() => {
    fetchRoundStatus()

    // Subscribe to round changes
    const channel = supabase
      .channel('box-round')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'box_rounds',
        },
        () => fetchRoundStatus()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const fetchRoundStatus = async () => {
    try {
      // Get current round
      const { data: round } = await supabase
        .from('box_rounds')
        .select('*')
        .in('status', ['waiting', 'bidding'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (round) {
        setCurrentRound(round)
        setRoundStatus(round.status)

        // Get queue (bids without amounts yet)
        if (round.status === 'waiting') {
          const { data: bids } = await supabase
            .from('box_bids')
            .select('user_id, users(id, name)')
            .eq('round_id', round.id)

          setQueue(bids?.map((b) => b.users) || [])
        }

        // Check if user has bid
        if (round.status === 'bidding' && user) {
          const { data: existingBid } = await supabase
            .from('box_bids')
            .select('amount')
            .eq('round_id', round.id)
            .eq('user_id', user.id)
            .single()

          if (existingBid) {
            setMyBid(existingBid.amount)
            setHasBid(true)
          }
        }
      } else {
        setRoundStatus('waiting')
        setQueue([])
      }
    } catch (error) {
      console.error('Error fetching round:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinQueue = async () => {
    if (!user || isInQueue) return

    try {
      // Create round if none exists
      let roundId = currentRound?.id
      if (!roundId) {
        const { data: newRound, error } = await supabase
          .from('box_rounds')
          .insert({ status: 'waiting' })
          .select()
          .single()

        if (error) throw error
        roundId = newRound.id
        setCurrentRound(newRound)
      }

      // Join queue (bid with 0 amount for now)
      await supabase.from('box_bids').insert({
        round_id: roundId,
        user_id: user.id,
        amount: 0,
      })

      showToast('success', 'Joined the queue!')
      fetchRoundStatus()
    } catch (error) {
      console.error('Error joining queue:', error)
      showToast('error', 'Failed to join queue')
    }
  }

  const handleLeaveQueue = async () => {
    if (!user || !currentRound) return

    try {
      await supabase
        .from('box_bids')
        .delete()
        .eq('round_id', currentRound.id)
        .eq('user_id', user.id)

      showToast('info', 'Left the queue')
      fetchRoundStatus()
    } catch (error) {
      console.error('Error leaving queue:', error)
    }
  }

  const handlePlaceBid = async () => {
    if (!user || !currentRound || myBid < CONSTANTS.BOX_MIN_BID) return

    if (user.balance < myBid) {
      showToast('error', "Not enough coins!")
      return
    }

    try {
      await supabase
        .from('box_bids')
        .update({ amount: myBid })
        .eq('round_id', currentRound.id)
        .eq('user_id', user.id)

      setHasBid(true)
      showToast('success', `Bid placed: ${myBid}🪙`)
    } catch (error) {
      console.error('Error placing bid:', error)
      showToast('error', 'Failed to place bid')
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="The Box" showBack showBalance />
        <PageWrapper className="flex items-center justify-center">
          <Spinner size="lg" />
        </PageWrapper>
      </>
    )
  }

  return (
    <>
      <Header title="The Box" showBack showBalance />

      <PageWrapper className="pt-0">
        {roundStatus === 'waiting' && (
          <WaitingState
            queue={queue}
            isInQueue={isInQueue}
            minPlayers={CONSTANTS.BOX_MIN_PLAYERS}
            onJoin={handleJoinQueue}
            onLeave={handleLeaveQueue}
          />
        )}

        {roundStatus === 'bidding' && (
          <BiddingState
            bid={myBid}
            setBid={setMyBid}
            hasBid={hasBid}
            minBid={CONSTANTS.BOX_MIN_BID}
            maxBid={user?.balance || 0}
            timeLeft={CONSTANTS.BOX_BIDDING_TIME}
            onPlaceBid={handlePlaceBid}
          />
        )}

        {roundStatus === 'ended' && results && (
          <ResultsState
            results={results}
            isWinner={results.winner_id === user?.id}
            onJoinNext={handleJoinQueue}
          />
        )}
      </PageWrapper>
    </>
  )
}

function WaitingState({ queue, isInQueue, minPlayers, onJoin, onLeave }) {
  return (
    <div className="text-center py-8">
      <span className="text-6xl block mb-4">📦</span>
      <h2 className="text-xl font-semibold text-white mb-2">
        Waiting for players...
      </h2>

      {/* Player count */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {Array.from({ length: minPlayers }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'text-2xl',
              i < queue.length ? 'opacity-100' : 'opacity-30'
            )}
          >
            👤
          </span>
        ))}
        <span className="text-slate-400 ml-2">
          {queue.length}/{minPlayers} players
        </span>
      </div>

      {/* Queue list */}
      {queue.length > 0 && (
        <Card className="mb-6">
          <p className="text-sm text-slate-400 mb-2">In queue:</p>
          <div className="space-y-1">
            {queue.map((u) => (
              <p key={u.id} className="text-white">
                • {u.name} {u.id === queue[0]?.id && '✓'}
              </p>
            ))}
          </div>
        </Card>
      )}

      <p className="text-slate-400 mb-6">
        Round starts when {minPlayers} players join!
      </p>

      {isInQueue ? (
        <Button variant="danger" fullWidth onClick={onLeave}>
          ❌ Leave Queue
        </Button>
      ) : (
        <Button variant="gold" fullWidth onClick={onJoin}>
          📦 Join Queue
        </Button>
      )}
    </div>
  )
}

function BiddingState({ bid, setBid, hasBid, minBid, maxBid, timeLeft, onPlaceBid }) {
  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-status-error font-semibold animate-pulse">
          🔴 ROUND ACTIVE!
        </span>
        <Timer seconds={timeLeft} running />
      </div>

      {/* Mystery box */}
      <Card variant="highlight" className="text-center mb-6">
        <div className="w-24 h-24 bg-pastel-purple/20 rounded-xl flex items-center justify-center mx-auto">
          <span className="text-5xl">❓</span>
        </div>
        <p className="text-slate-400 mt-3">What's inside?</p>
      </Card>

      {/* Bid selector */}
      <Card>
        <p className="text-sm text-pastel-purple-light text-center mb-3">
          Your bid:
        </p>

        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setBid(Math.max(minBid, bid - 1))}
            disabled={bid <= minBid}
            className="p-3 rounded-lg bg-bg-card hover:bg-bg-card-hover disabled:opacity-50"
          >
            <Minus className="w-5 h-5" />
          </button>
          <span className="text-coin-gold text-4xl font-bold w-20 text-center">
            {bid}🪙
          </span>
          <button
            onClick={() => setBid(Math.min(maxBid, bid + 1))}
            disabled={bid >= maxBid}
            className="p-3 rounded-lg bg-bg-card hover:bg-bg-card-hover disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-500 text-xs text-center mb-4">
          Min: {minBid}🪙 | Your balance: {maxBid}🪙
        </p>

        <Button
          variant={hasBid ? 'secondary' : 'gold'}
          fullWidth
          onClick={onPlaceBid}
        >
          {hasBid ? `✓ BID PLACED: ${bid}🪙 (tap to change)` : '✓ PLACE BID'}
        </Button>
      </Card>

      <p className="text-center text-status-warning text-sm mt-4">
        ⚠️ Bids are SECRET until time ends
      </p>
    </div>
  )
}

function ResultsState({ results, isWinner, onJoinNext }) {
  return (
    <div className="text-center py-8">
      <span className="text-5xl block mb-2">🏆</span>
      <h2 className="text-2xl font-bold text-white mb-2">
        {isWinner ? 'YOU WIN!' : 'WINNER'}
      </h2>
      <p className="text-pastel-purple-light text-xl mb-6">
        {results.winner_name} - {results.winning_bid}🪙
      </p>

      {/* All bids */}
      <Card className="mb-6 text-left">
        <p className="text-sm text-slate-400 mb-3">All bids:</p>
        {results.bids.map((b, i) => (
          <div key={b.user_id} className="flex items-center justify-between py-1">
            <span className="text-white">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}{' '}
              {b.name}
            </span>
            <span className={cn(
              'font-bold',
              i === 0 ? 'text-coin-gold' : 'text-slate-400'
            )}>
              {b.amount}🪙
            </span>
          </div>
        ))}
      </Card>

      {isWinner && (
        <p className="text-status-success mb-6">
          🎉 Open the box!
        </p>
      )}

      <div className="space-y-3">
        <Button variant="primary" fullWidth onClick={onJoinNext}>
          🔄 Join Next Round
        </Button>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { BottomNav } from '../components/layout/BottomNav'
import { BalanceCard } from '../components/features/BalanceCard'
import { StationCard } from '../components/features/StationCard'
import { BigCardsSection } from '../components/dashboard/BigCardsSection'
import { BigMissionsSection } from '../components/dashboard/BigMissionsSection'
import { useUserStore } from '../stores/userStore'
import { supabase } from '../lib/supabase'

// Priority stations (top row)
const priorityStations = [
  {
    icon: '🎰',
    title: 'Lottery',
    cost: '10🪙',
    href: '/lottery',
  },
  {
    icon: '🍸',
    title: 'Bar',
    subtitle: 'Order drinks',
    href: '/bar',
  },
]

// Game stations (second row)
const gameStations = [
  {
    icon: '🧠',
    title: 'Sasha Quiz',
    cost: '1🪙',
    href: '/trivia',
  },
  {
    icon: '🎲',
    title: 'Risk',
    cost: '1-3🪙',
    href: '/risk',
  },
]

// Other stations
const otherStations = [
  {
    icon: '🛒',
    title: 'Market',
    subtitle: 'Shop & gifts',
    href: '/market',
  },
  {
    icon: '💱',
    title: 'Trade',
    subtitle: 'Send coins',
    href: '/trade',
  },
]

export function Dashboard() {
  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const isAdmin = useUserStore((state) => state.isAdmin)

  const [userCards, setUserCards] = useState([])
  const [userMissions, setUserMissions] = useState([])

  // Subscribe to balance changes
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('balance-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          updateBalance(payload.new.balance)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, updateBalance])

  // Fetch user's cards
  useEffect(() => {
    if (!user?.id) return
    fetchUserCards()
  }, [user?.id])

  // Fetch user's missions
  useEffect(() => {
    if (!user?.id) return
    fetchUserMissions()
  }, [user?.id])

  // Subscribe to card changes
  useEffect(() => {
    if (!user?.id) return

    const cardsChannel = supabase
      .channel('user-cards-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_cards',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUserCards()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(cardsChannel)
    }
  }, [user?.id])

  // Subscribe to mission changes
  useEffect(() => {
    if (!user?.id) return

    const missionsChannel = supabase
      .channel('user-missions-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_missions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUserMissions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(missionsChannel)
    }
  }, [user?.id])

  const fetchUserCards = async () => {
    const { data, error } = await supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'owned')
      .order('created_at', { ascending: false })

    if (!error) {
      setUserCards(data || [])
    }
  }

  const fetchUserMissions = async () => {
    const { data, error } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error) {
      setUserMissions(data || [])
    }
  }

  if (!user) {
    return null
  }

  return (
    <>
      <Header title={`Hi, ${user.name}! 👋`} showBalance />

      <PageWrapper withNav className="pt-0">
        {/* Balance Card */}
        <div className="mt-4">
          <BalanceCard balance={user.balance} />
        </div>

        {/* Admin Dashboard - Only for admins */}
        {isAdmin() && (
          <div className="mt-6">
            <StationCard
              icon="👑"
              title="Admin Dashboard"
              subtitle="Manage party"
              href="/admin"
              className="w-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30"
            />
          </div>
        )}

        {/* Priority Stations - Lottery & Bar */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
            Quick Actions
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {priorityStations.map((station) => (
              <StationCard
                key={station.href}
                icon={station.icon}
                title={station.title}
                subtitle={station.subtitle}
                cost={station.cost}
                href={station.href}
              />
            ))}
          </div>
        </div>

        {/* Game Stations - Quiz & Risk */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
            Games
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {gameStations.map((station) => (
              <StationCard
                key={station.href}
                icon={station.icon}
                title={station.title}
                subtitle={station.subtitle}
                cost={station.cost}
                href={station.href}
              />
            ))}
          </div>
        </div>

        {/* BIG CARDS SECTION */}
        <BigCardsSection cards={userCards} cardCount={userCards.length} />

        {/* BIG MISSIONS SECTION */}
        <BigMissionsSection missions={userMissions} count={userMissions.length} />

        {/* Other Stations */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
            Other
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {otherStations.map((station) => (
              <StationCard
                key={station.href}
                icon={station.icon}
                title={station.title}
                subtitle={station.subtitle}
                cost={station.cost}
                href={station.href}
              />
            ))}
          </div>
        </div>
      </PageWrapper>

      <BottomNav />
    </>
  )
}

import { useEffect } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { BottomNav } from '../components/layout/BottomNav'
import { BalanceCard } from '../components/features/BalanceCard'
import { StationCard } from '../components/features/StationCard'
import { useUserStore } from '../stores/userStore'
import { supabase } from '../lib/supabase'

const stations = [
  {
    icon: '🍸',
    title: 'Bar',
    subtitle: 'Order drinks',
    href: '/bar',
  },
  {
    icon: '🛒',
    title: 'Market',
    subtitle: 'Shop & gifts',
    href: '/market',
  },
  {
    icon: '🧠',
    title: 'Trivia',
    cost: '1🪙',
    href: '/trivia',
  },
  {
    icon: '🎲',
    title: 'Risk',
    cost: '1-3🪙',
    href: '/risk',
  },
  {
    icon: '📦',
    title: 'The Box',
    cost: '3+🪙',
    href: '/box',
  },
  {
    icon: '🎰',
    title: 'Lottery',
    cost: '10🪙',
    href: '/lottery',
  },
  {
    icon: '🎯',
    title: 'Missions',
    subtitle: 'Complete tasks',
    href: '/missions',
    badge: 3, // TODO: Get from user's missions count
  },
]

export function Dashboard() {
  const user = useUserStore((state) => state.user)
  const updateBalance = useUserStore((state) => state.updateBalance)
  const isAdmin = useUserStore((state) => state.isAdmin)

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

  if (!user) {
    return null
  }

  return (
    <>
      <Header
        title={`Hi, ${user.name}! 👋`}
        showBalance
      />

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

        {/* Stations Section */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
            Stations
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {stations.map((station) => (
              <StationCard
                key={station.href}
                icon={station.icon}
                title={station.title}
                subtitle={station.subtitle}
                cost={station.cost}
                href={station.href}
                badge={station.badge}
              />
            ))}
          </div>
        </div>

        {/* Challenge Table shortcut */}
        <div className="mt-6">
          <StationCard
            icon="🎮"
            title="Challenge Table"
            subtitle="Play bar games"
            href="/games"
            className="w-full"
          />
        </div>
      </PageWrapper>

      <BottomNav />
    </>
  )
}

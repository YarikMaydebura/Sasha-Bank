import { useState, useEffect } from 'react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { Header } from '../../components/layout/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { AdminRiskPanel } from '../../components/admin/AdminRiskPanel'
import { LotteryDrawPanel } from '../../components/admin/LotteryDrawPanel'
// V3.0: PokerPanel removed - Poker is now user-created
import { PhotoGalleryPanel } from '../../components/admin/PhotoGalleryPanel'
import { GuestAskPanel } from '../../components/admin/GuestAskPanel'
import { supabase } from '../../lib/supabase'
import { useUIStore } from '../../stores/uiStore'
// V3.0: Missions are now auto-generated on registration (see guestTraits.js)

const tabs = [
  { id: 'overview', label: 'Overview', icon: '👥' },
  { id: 'risk', label: 'Risk', icon: '🎲' },
  { id: 'bar', label: 'Bar', icon: '🍸' },
  { id: 'lottery', label: 'Lottery', icon: '🎰' },
  // V3.0: Poker removed - now user-created tables
  { id: 'photos', label: 'Photos', icon: '📸' },
  { id: 'guest_ask', label: 'Guest Ask', icon: '🔔' },
]

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [barOrders, setBarOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [coinAdjust, setCoinAdjust] = useState(0)
  const showToast = useUIStore((state) => state.showToast)

  useEffect(() => {
    fetchData()

    // Subscribe to changes
    const channel = supabase
      .channel('admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bar_orders' }, fetchData)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const fetchData = async () => {
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('balance', { ascending: false })

      setUsers(usersData || [])

      // Fetch pending bar orders
      const { data: ordersData } = await supabase
        .from('bar_orders')
        .select('*, users(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      setBarOrders(ordersData || [])
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdjustCoins = async () => {
    if (!selectedUser || coinAdjust === 0) return

    try {
      const newBalance = Math.max(1, selectedUser.balance + coinAdjust)
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', selectedUser.id)

      await supabase.from('transactions').insert({
        [coinAdjust > 0 ? 'to_user_id' : 'from_user_id']: selectedUser.id,
        amount: Math.abs(coinAdjust),
        type: coinAdjust > 0 ? 'admin_award' : 'admin_deduct',
        description: `Admin adjustment`,
      })

      showToast('success', `Updated ${selectedUser.name}'s balance`)
      setSelectedUser(null)
      setCoinAdjust(0)
      fetchData()
    } catch (error) {
      console.error('Error adjusting coins:', error)
      showToast('error', 'Failed to adjust coins')
    }
  }

  const handleMarkServed = async (order) => {
    try {
      await supabase
        .from('bar_orders')
        .update({ status: 'served', served_at: new Date().toISOString() })
        .eq('id', order.id)

      showToast('success', `Order #${order.order_code} served!`)
      fetchData()
    } catch (error) {
      console.error('Error marking order:', error)
      showToast('error', 'Failed to mark order')
    }
  }

  const guestCount = users.filter(u => !u.is_admin).length

  if (isLoading) {
    return (
      <>
        <Header title="👑 Admin Panel" />
        <PageWrapper className="flex items-center justify-center">
          <Spinner size="lg" />
        </PageWrapper>
      </>
    )
  }

  return (
    <>
      <Header title="👑 Admin Panel" showBack />

      <PageWrapper className="pt-0 pb-8">
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
        {activeTab === 'overview' && (
          <>
            {/* Status */}
            <Card className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Guests</p>
                  <p className="text-white text-2xl font-bold">{guestCount}</p>
                </div>
                <Badge variant="success">Live</Badge>
              </div>
            </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            variant="gold"
            onClick={() => setSelectedUser({ id: 'award', name: 'Select user' })}
          >
            ➕ Award
          </Button>
          <Button
            variant="secondary"
            onClick={() => setSelectedUser({ id: 'deduct', name: 'Select user' })}
          >
            ➖ Deduct
          </Button>
        </div>

        {/* V3.0: Missions are auto-generated on registration via guestTraits.js */}

        {/* All Guests */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            All Guests
          </h3>

          <div className="space-y-2">
            {users
              .filter(u => !u.is_admin)
              .map((user) => (
                <Card
                  key={user.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-white">{user.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-coin-gold font-bold">
                      {user.balance}🪙
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                    >
                      [±]
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>
          </>
        )}

        {/* Risk Tab */}
        {activeTab === 'risk' && (
          <AdminRiskPanel />
        )}

        {/* Bar Tab */}
        {activeTab === 'bar' && (
          <>
            {/* Pending Bar Orders */}
            {barOrders.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-white/60">No pending orders</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {barOrders.map((order) => (
                  <Card key={order.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-mono font-bold">
                        #{order.order_code}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {order.users?.name} - {order.drink_name}
                      </p>
                    </div>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleMarkServed(order)}
                    >
                      ✓ Served
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Lottery Tab */}
        {activeTab === 'lottery' && (
          <LotteryDrawPanel />
        )}

        {/* V3.0: Poker tab removed - now user-created tables at /poker */}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <PhotoGalleryPanel />
        )}

        {/* Guest Ask Tab */}
        {activeTab === 'guest_ask' && (
          <GuestAskPanel />
        )}
      </PageWrapper>

      {/* Adjust Coins Modal - V3.0 Enhanced with User Selector */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => {
          setSelectedUser(null)
          setCoinAdjust(0)
        }}
        title={selectedUser?.id === 'award' || selectedUser?.id === 'deduct'
          ? (selectedUser.id === 'award' ? '➕ Award Coins' : '➖ Deduct Coins')
          : `Adjust ${selectedUser?.name}'s Coins`}
      >
        {selectedUser && (
          <div>
            {/* User Selector (for Award/Deduct quick buttons) */}
            {(selectedUser.id === 'award' || selectedUser.id === 'deduct') ? (
              <div className="mb-4">
                <label className="text-slate-400 text-sm mb-2 block">Select User</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  value=""
                  onChange={(e) => {
                    const user = users.find(u => u.id === e.target.value)
                    if (user) {
                      setSelectedUser({
                        ...user,
                        _action: selectedUser.id // remember if award or deduct
                      })
                    }
                  }}
                >
                  <option value="">Select a guest...</option>
                  {users.filter(u => !u.is_admin).map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.balance}🪙)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <p className="text-slate-400 mb-4">
                  Current balance: {selectedUser.balance}🪙
                </p>

                <Input
                  label="Amount (positive to add, negative to deduct)"
                  type="number"
                  value={coinAdjust}
                  onChange={(e) => setCoinAdjust(parseInt(e.target.value) || 0)}
                  placeholder="e.g., 5 or -3"
                />

                <div className="flex gap-3 mt-4">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleAdjustCoins}
                    disabled={coinAdjust === 0}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => {
                      setSelectedUser(null)
                      setCoinAdjust(0)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}

import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Header } from '../components/layout/Header'
import { BottomNav } from '../components/layout/BottomNav'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useUserStore } from '../stores/userStore'
import { useUIStore } from '../stores/uiStore'

export function Profile() {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const isAdmin = useUserStore((state) => state.isAdmin)
  const logout = useUserStore((state) => state.logout)
  const showToast = useUIStore((state) => state.showToast)

  const handleLogout = () => {
    logout()
    showToast('info', 'Goodbye!')
    navigate('/')
  }

  if (!user) return null

  return (
    <>
      <Header title="Profile" showBalance />

      <PageWrapper withNav className="pt-0">
        {/* User info */}
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-pastel-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👤</span>
          </div>
          <h2 className="text-2xl font-bold text-white">{user.name}</h2>
          <p className="text-coin-gold text-lg font-semibold mt-1">
            {user.balance}🪙
          </p>
        </div>

        {/* QR Code */}
        <Card className="text-center">
          <p className="text-slate-400 text-sm mb-4">Your Personal QR Code</p>
          <div className="bg-white p-4 rounded-xl inline-block">
            <QRCodeSVG
              value={`user:${user.id}:${user.qr_code}`}
              size={180}
              level="M"
            />
          </div>
          <p className="text-slate-500 text-xs mt-4">
            Others can scan this to interact with you
          </p>
        </Card>

        {/* Quick links */}
        <div className="space-y-3 mt-6">
          {/* Admin Dashboard - Only for admins */}
          {isAdmin() && (
            <Card hoverable onClick={() => navigate('/admin')}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">👑</span>
                <span className="text-white font-medium">Admin Dashboard</span>
              </div>
            </Card>
          )}

          <Card hoverable onClick={() => navigate('/history')}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📜</span>
              <span className="text-white font-medium">Transaction History</span>
            </div>
          </Card>

          <Card hoverable onClick={() => navigate('/missions')}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <span className="text-white font-medium">My Missions</span>
            </div>
          </Card>
        </div>

        {/* Logout */}
        <div className="mt-8">
          <Button variant="danger" fullWidth onClick={handleLogout}>
            Leave Party
          </Button>
          <p className="text-slate-500 text-xs text-center mt-2">
            This will clear your local data
          </p>
        </div>
      </PageWrapper>

      <BottomNav />
    </>
  )
}

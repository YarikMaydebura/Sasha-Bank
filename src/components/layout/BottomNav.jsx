import { useNavigate, useLocation } from 'react-router-dom'
import { Home, QrCode, Trophy, User } from 'lucide-react'
import { cn } from '../../lib/utils'

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/scan', icon: QrCode, label: 'Scan' },
  { path: '/leaderboard', icon: Trophy, label: 'Board' },
  { path: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg-dark/90 backdrop-blur-md border-t border-pastel-purple/10 pb-safe">
      <div className="flex items-center justify-around px-4 py-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all',
                isActive
                  ? 'text-pastel-purple bg-pastel-purple/10'
                  : 'text-slate-500 hover:text-pastel-purple-light'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

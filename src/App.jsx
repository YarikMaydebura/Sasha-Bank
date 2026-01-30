import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from './components/ui/Toast'
import { LoadingScreen } from './components/ui/Spinner'
import { useUserStore } from './stores/userStore'
import { useGameStore } from './stores/gameStore'

// Pages
import {
  Welcome,
  Dashboard,
  Bar,
  Market,
  Trivia,
  Risk,
  Lottery,
  Poker,
  Photos,
  Missions,
  Trade,
  History,
  Leaderboard,
  Profile,
  Scan,
  Notifications,
  MyCards,
  MissionConfirm,
  GroupGames,
  Marketplace,
  AdminDashboard,
} from './pages'

// V3.0 Components
import { StealAlertPopup } from './components/StealAlertPopup'

// Import CSS
import './index.css'

// Protected route wrapper
function ProtectedRoute({ children }) {
  const user = useUserStore((state) => state.user)
  const isLoading = useUserStore((state) => state.isLoading)

  if (isLoading) {
    return <LoadingScreen message="Loading..." />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}

// Admin route wrapper
function AdminRoute({ children }) {
  const user = useUserStore((state) => state.user)
  const isLoading = useUserStore((state) => state.isLoading)
  const isAdmin = useUserStore((state) => state.isAdmin)

  if (isLoading) {
    return <LoadingScreen message="Loading..." />
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function App() {
  const init = useUserStore((state) => state.init)
  const initCooldowns = useGameStore((state) => state.initCooldowns)

  // Initialize stores on app load
  useEffect(() => {
    init()
    initCooldowns()
  }, [init, initCooldowns])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<Welcome />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bar"
          element={
            <ProtectedRoute>
              <Bar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/market"
          element={
            <ProtectedRoute>
              <Market />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trivia"
          element={
            <ProtectedRoute>
              <Trivia />
            </ProtectedRoute>
          }
        />
        <Route
          path="/risk"
          element={
            <ProtectedRoute>
              <Risk />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lottery"
          element={
            <ProtectedRoute>
              <Lottery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/poker"
          element={
            <ProtectedRoute>
              <Poker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/photos"
          element={
            <ProtectedRoute>
              <Photos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/missions"
          element={
            <ProtectedRoute>
              <Missions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trade"
          element={
            <ProtectedRoute>
              <Trade />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <Scan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-cards"
          element={
            <ProtectedRoute>
              <MyCards />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mission-confirm/:missionId/:userId"
          element={
            <ProtectedRoute>
              <MissionConfirm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/group-games"
          element={
            <ProtectedRoute>
              <GroupGames />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketplace"
          element={
            <ProtectedRoute>
              <Marketplace />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global toast container */}
      <ToastContainer />

      {/* V3.0: Steal alert popup for incoming steal attempts */}
      <StealAlertPopup />
    </BrowserRouter>
  )
}

export default App

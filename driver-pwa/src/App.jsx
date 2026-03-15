import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TopBar } from './components/layout/TopBar'
import { BottomNav } from './components/layout/BottomNav'

import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import TripList from './pages/trips/TripList'
import NewTrip from './pages/trips/NewTrip'
import TripDetail from './pages/trips/TripDetail'
import MyVehicle from './pages/vehicle/MyVehicle'
import Notifications from './pages/notifications/Notifications'
import Profile from './pages/profile/Profile'

function Guard({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-surface-600 w-full max-w-md relative">
      <TopBar />
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{
          style: { background: '#11111b', color: '#fff', border: '1px solid #3b82f6', borderRadius: 12 },
          success: { iconTheme: { primary: '#3b82f6', secondary: '#fff' } }
        }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guard><AppLayout><Dashboard /></AppLayout></Guard>} />
          <Route path="/trips" element={<Guard><AppLayout><TripList /></AppLayout></Guard>} />
          <Route path="/trip/new" element={<Guard><AppLayout><NewTrip /></AppLayout></Guard>} />
          <Route path="/trips/:id" element={<Guard><AppLayout><TripDetail /></AppLayout></Guard>} />
          <Route path="/vehicle" element={<Guard><AppLayout><MyVehicle /></AppLayout></Guard>} />
          <Route path="/notifications" element={<Guard><AppLayout><Notifications /></AppLayout></Guard>} />
          <Route path="/profile" element={<Guard><AppLayout><Profile /></AppLayout></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

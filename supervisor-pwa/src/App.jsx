import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import BottomNav from './components/layout/BottomNav'
import TopBar from './components/layout/TopBar'

import Login           from './pages/auth/Login'
import Dashboard       from './pages/dashboard/Dashboard'
import MySites         from './pages/sites/MySites'
import SiteDetail      from './pages/sites/SiteDetail'
import LabourList      from './pages/labour/LabourList'
import AddLabour       from './pages/labour/AddLabour'
import LabourDetail    from './pages/labour/LabourDetail'
import MarkAttendance  from './pages/attendance/MarkAttendance'
import AttendanceHistory from './pages/attendance/AttendanceHistory'
import SalaryView      from './pages/salary/SalaryView'
import Expenses        from './pages/expenses/Expenses'
import AddExpense      from './pages/expenses/AddExpense'
import VisitReports    from './pages/reports/VisitReports'
import AddReport       from './pages/reports/AddReport'
import Notifications   from './pages/notifications/Notifications'
import Profile         from './pages/profile/Profile'
import GodownSupervisor from './pages/godown/GodownSupervisor'
import DeliveryConfirmation from './pages/godown/DeliveryConfirmation'

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
          style: { background: '#1c1c1c', color: '#fff', border: '1px solid #F97316', borderRadius: 12, maxWidth: '90vw' },
          success: { iconTheme: { primary: '#F97316', secondary: '#000' } }
        }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"                   element={<Guard><AppLayout><Dashboard /></AppLayout></Guard>} />
          <Route path="/sites"              element={<Guard><AppLayout><MySites /></AppLayout></Guard>} />
          <Route path="/sites/:id"          element={<Guard><AppLayout><SiteDetail /></AppLayout></Guard>} />
          <Route path="/labour"             element={<Guard><AppLayout><LabourList /></AppLayout></Guard>} />
          <Route path="/labour/add"         element={<Guard><AppLayout><AddLabour /></AppLayout></Guard>} />
          <Route path="/labour/:id"         element={<Guard><AppLayout><LabourDetail /></AppLayout></Guard>} />
          <Route path="/attendance"         element={<Guard><AppLayout><MarkAttendance /></AppLayout></Guard>} />
          <Route path="/attendance/history" element={<Guard><AppLayout><AttendanceHistory /></AppLayout></Guard>} />
          <Route path="/salary"             element={<Guard><AppLayout><SalaryView /></AppLayout></Guard>} />
          <Route path="/expenses"           element={<Guard><AppLayout><Expenses /></AppLayout></Guard>} />
          <Route path="/expenses/add"       element={<Guard><AppLayout><AddExpense /></AppLayout></Guard>} />
          <Route path="/reports"            element={<Guard><AppLayout><VisitReports /></AppLayout></Guard>} />
          <Route path="/reports/add"        element={<Guard><AppLayout><AddReport /></AppLayout></Guard>} />
          <Route path="/godown"             element={<Guard><AppLayout><GodownSupervisor /></AppLayout></Guard>} />
          <Route path="/deliveries"         element={<Guard><AppLayout><DeliveryConfirmation /></AppLayout></Guard>} />
          <Route path="/notifications"      element={<Guard><AppLayout><Notifications /></AppLayout></Guard>} />
          <Route path="/profile"            element={<Guard><AppLayout><Profile /></AppLayout></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

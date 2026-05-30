import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/layout/Layout'

// Pages
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Sites from './pages/sites/Sites'
import SiteDetail from './pages/sites/SiteDetail'
import ProcessMasterDetail from './pages/sites/ProcessMasterDetail'
import Labour from './pages/labour/Labour'
import LabourDetail from './pages/labour/LabourDetail'
import Attendance from './pages/attendance/Attendance'
import Salary from './pages/salary/Salary'
import Expenses from './pages/expenses/Expenses'
import Ledger from './pages/ledger/Ledger'
import Godown from './pages/godown/Godown'
import Machines from './pages/machines/Machines'
import Drivers from './pages/drivers/Drivers'
import DriverDetail from './pages/drivers/DriverDetail'
import Trips from './pages/drivers/Trips'
import Supervisors from './pages/supervisors/Supervisors'
import SupervisorDetail from './pages/supervisors/SupervisorDetail'
import Users from './pages/users/Users'
import Organisations from './pages/organisations/Organisations'
import VisitReports from './pages/reports/VisitReports'
import BOQ from './pages/reports/BOQ'
import Notifications from './pages/notifications/Notifications'
import AIAssistant from './pages/ai/AIAssistant'
import WebsiteEditor from './pages/website/WebsiteEditor'
import RecycleBin from './pages/recyclebin/RecycleBin'
import WorkOrders from './pages/workorders/WorkOrders'
import WorkOrderCreate from './pages/workorders/WorkOrderCreate'
import WorkOrderDetail from './pages/workorders/WorkOrderDetail'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a1a', color: '#fff', border: '1px solid #C9A84C' },
            success: { iconTheme: { primary: '#C9A84C', secondary: '#000' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="sites" element={<Sites />} />
            <Route path="sites/:id" element={<SiteDetail />} />
            <Route path="sites/:siteId/process/:processId" element={<ProcessMasterDetail />} />
            <Route path="labour" element={<Labour />} />
            <Route path="labour/:id" element={<LabourDetail />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="salary" element={<Salary />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="ledger" element={<Ledger />} />
            <Route path="godown" element={<Godown />} />
            <Route path="machines" element={<Machines />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="drivers/:id" element={<DriverDetail />} />
            <Route path="trips" element={<Trips />} />
            <Route path="supervisors" element={<Supervisors />} />
            <Route path="supervisors/:id" element={<SupervisorDetail />} />
            <Route path="users" element={<Users />} />
            <Route path="supervisors" element={<Supervisors />} />
            <Route path="supervisors/:id" element={<SupervisorDetail />} />
            <Route path="organisations" element={<Organisations />} />
            <Route path="visit-reports" element={<VisitReports />} />
            <Route path="boq" element={<BOQ />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="website" element={<WebsiteEditor />} />
            <Route path="ai" element={<AIAssistant />} />
            <Route path="recycle-bin" element={<RecycleBin />} />
            <Route path="workorders" element={<WorkOrders />} />
            <Route path="workorders/create" element={<WorkOrderCreate />} />
            <Route path="workorders/:id" element={<WorkOrderDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}

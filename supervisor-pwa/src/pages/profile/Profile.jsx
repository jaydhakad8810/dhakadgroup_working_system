import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronRight, History, Building2, Users, ClipboardCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const menuItems = [
    { icon: History, label: 'Attendance History', to: '/attendance/history', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { icon: Building2, label: 'My Sites', to: '/sites', color: 'text-primary-400', bg: 'bg-primary-500/20' },
    { icon: Users, label: 'Labour', to: '/labour', color: 'text-green-400', bg: 'bg-green-500/20' },
    { icon: ClipboardCheck, label: 'Attendance', to: '/attendance', color: 'text-orange-400', bg: 'bg-orange-500/20' },
    { icon: LogOut, label: 'Sign Out', action: handleLogout, color: 'text-red-400', bg: 'bg-red-500/20' },
  ]

  return (
    <div className="page-content space-y-4">
      {/* Profile Card */}
      <div className="card bg-gradient-to-br from-primary-500/15 to-surface-300 border-primary-500/20">
        <div className="flex items-center gap-4">
          {user?.photo
            ? <img src={user.photo} className="w-16 h-16 rounded-2xl object-cover border-2 border-primary-500/30" alt={user.name} />
            : <div className="w-16 h-16 rounded-2xl bg-primary-500/20 border-2 border-primary-500/30 flex items-center justify-center text-primary-400 font-bold text-2xl flex-shrink-0">{user?.name?.[0]}</div>
          }
          <div>
            <h2 className="text-white font-bold text-xl">{user?.name}</h2>
            <p className="text-primary-500 font-medium capitalize">👷 {user?.role}</p>
            <p className="text-gray-500 text-sm">{user?.employee_id ? `ID: ${user.employee_id}` : user?.email}</p>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="card">
        <h3 className="text-white font-semibold mb-3">My Info</h3>
        <div className="space-y-0">
          {[
            ['Name', user?.name],
            ['Employee ID', user?.employee_id],
            ['Phone', user?.phone],
            ['License No.', user?.license_number],
            ['License Expiry', user?.license_expiry],
            ['Bank', user?.bank_name],
            ['Account', user?.bank_account],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="flex justify-between py-2.5 border-b border-white/5 last:border-0">
              <span className="text-gray-400 text-sm">{label}</span>
              <span className="text-white text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-3 text-center">Contact admin to update your info or change password</p>
      </div>

      {/* Menu */}
      <div className="card space-y-1">
        {menuItems.map(({ icon: Icon, label, to, action, color, bg }) => (
          <button key={label} onClick={to ? () => navigate(to) : action}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-200 active:scale-95 transition-all text-left">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center ${color} flex-shrink-0`}><Icon size={18} /></div>
            <span className="text-white font-medium flex-1">{label}</span>
            {to && <ChevronRight size={16} className="text-gray-600" />}
          </button>
        ))}
      </div>

      <p className="text-center text-gray-600 text-xs">DGSystem Supervisor v1.0.0</p>
    </div>
  )
}

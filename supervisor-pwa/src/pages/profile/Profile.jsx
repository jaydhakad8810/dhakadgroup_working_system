import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Phone, Building2, Shield, History, Users, ClipboardCheck, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [me, setMe] = useState(null)

  useEffect(() => {
    api.get('/auth/me').then(res => setMe(res.data)).catch(() => {})
  }, [])

  const fullUser = me?.user || user
  const sites = me?.sites || []

  const handleLogout = () => { logout(); navigate('/login') }

  const menuItems = [
    { icon: History, label: 'Attendance History', to: '/attendance/history', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { icon: Building2, label: 'My Sites', to: '/sites', color: 'text-primary-400', bg: 'bg-primary-500/20' },
    { icon: Users, label: 'Labour', to: '/labour', color: 'text-green-400', bg: 'bg-green-500/20' },
    { icon: ClipboardCheck, label: 'Attendance', to: '/attendance', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  ]

  return (
    <div className="page-content space-y-4">
      <div className="card bg-gradient-to-br from-primary-500/15 to-surface-300 border-primary-500/20">
        <div className="flex flex-col items-center gap-3 pb-4">
          {fullUser?.photo
            ? <img src={fullUser.photo} className="w-20 h-20 rounded-full object-cover border-2 border-primary-500/40" alt={fullUser.name} />
            : <div className="w-20 h-20 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
                {fullUser?.name?.[0]?.toUpperCase()}
              </div>
          }
          <div className="text-center">
            <h2 className="text-white font-bold text-xl">{fullUser?.name}</h2>
            <p className="text-gray-400 text-sm mt-0.5">{fullUser?.employee_id ? `ID: ${fullUser.employee_id}` : fullUser?.email}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 text-xs font-semibold uppercase tracking-wide">Supervisor</span>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-gray-500 flex-shrink-0" />
            <span className="text-gray-400 text-sm w-16 flex-shrink-0">Phone</span>
            <span className="text-white text-sm font-medium">{fullUser?.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Building2 size={16} className="text-gray-500 flex-shrink-0" />
            <span className="text-gray-400 text-sm w-16 flex-shrink-0">Site(s)</span>
            <span className="text-white text-sm font-medium">{sites.length > 0 ? sites.map(s => s.name).join(', ') : '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-gray-500 flex-shrink-0" />
            <span className="text-gray-400 text-sm w-16 flex-shrink-0">Role</span>
            <span className="text-white text-sm font-medium">Supervisor</span>
          </div>
        </div>
      </div>

      <div className="card space-y-1">
        {menuItems.map(({ icon: Icon, label, to, color, bg }) => (
          <button key={label} onClick={() => navigate(to)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-200 active:scale-95 transition-all text-left">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center ${color} flex-shrink-0`}><Icon size={18} /></div>
            <span className="text-white font-medium flex-1">{label}</span>
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        ))}
      </div>

      <button onClick={handleLogout}
        className="w-full py-3.5 rounded-xl border border-red-500/40 text-red-400 font-semibold text-sm active:scale-95 transition-all">
        Sign Out
      </button>

      <p className="text-center text-gray-600 text-xs pb-2">DGSystem Supervisor v1.0.0</p>
    </div>
  )
}

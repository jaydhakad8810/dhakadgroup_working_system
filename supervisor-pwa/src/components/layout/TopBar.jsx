import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import api from '../../utils/api'

const titles = {
  '/': 'Dashboard', '/sites': 'My Sites', '/labour': 'Labour',
  '/attendance': 'Mark Attendance', '/attendance/history': 'Attendance History',
  '/salary': 'Salary', '/expenses': 'Expenses', '/expenses/add': 'Add Expense',
  '/reports': 'Visit Reports', '/reports/add': 'New Report',
  '/notifications': 'Notifications', '/profile': 'Profile',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)
  const isRoot = ['/', '/sites', '/labour', '/attendance', '/expenses', '/reports', '/notifications', '/profile', '/salary'].includes(pathname)
  const title = titles[pathname] || 'DGSystem'

  useEffect(() => {
    api.get('/notifications/unread-count').then(r => setUnread(r.data.count)).catch(() => {})
  }, [pathname])

  return (
    <div className="sticky top-0 z-40 w-full bg-surface-600/97 backdrop-blur-sm border-b border-white/5">
      <div className="flex items-center justify-between px-4 py-3.5 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          {!isRoot
            ? <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-surface-300 flex items-center justify-center text-gray-300 active:scale-95 transition-all">
                <ArrowLeft size={18} />
              </button>
            : <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <span className="text-lg">👷</span>
              </div>
          }
          <div>
            <h1 className="text-white font-semibold text-base leading-none">{title}</h1>
            {isRoot && pathname === '/' && <p className="text-gray-500 text-xs mt-0.5">Welcome, {user?.name?.split(' ')[0]}</p>}
          </div>
        </div>
        <button onClick={() => navigate('/notifications')}
          className="relative w-9 h-9 rounded-xl bg-surface-300 flex items-center justify-center text-gray-400 active:scale-95 transition-all">
          <Bell size={18} />
          {unread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full text-white text-xs flex items-center justify-center font-bold">{unread > 9 ? '9+' : unread}</span>}
        </button>
      </div>
    </div>
  )
}

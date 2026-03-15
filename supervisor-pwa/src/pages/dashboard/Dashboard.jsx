import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Users, ClipboardCheck, FileText, Plus, ChevronRight, TrendingUp } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    api.get('/dashboard/supervisor')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingPage />
  const s = data?.stats || {}

  const quickActions = [
    { label: 'Mark Attendance', icon: ClipboardCheck, color: 'bg-primary-500/20 text-primary-400', to: '/attendance' },
    { label: 'Add Labour', icon: Plus, color: 'bg-green-500/20 text-green-400', to: '/labour/add' },
    { label: 'Add Expense', icon: TrendingUp, color: 'bg-blue-500/20 text-blue-400', to: '/expenses/add' },
    { label: 'New Report', icon: FileText, color: 'bg-purple-500/20 text-purple-400', to: '/reports/add' },
  ]

  return (
    <div className="page-content space-y-5">
      {/* Greeting */}
      <div className="card bg-gradient-to-r from-primary-500/20 to-surface-300 border-primary-500/20">
        <p className="text-gray-400 text-sm">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</p>
        <h2 className="text-white font-bold text-xl">{user?.name}</h2>
        <p className="text-primary-400 text-sm mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Active Sites', value: s.activeSites, icon: Building2, color: 'text-primary-400', bg: 'bg-primary-500/20' },
          { label: 'Today Present', value: s.todayPresent, icon: ClipboardCheck, color: 'text-green-400', bg: 'bg-green-500/20' },
          { label: 'Total Labour', value: s.totalLabour, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'Pending Tasks', value: s.pendingTasks, icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-gray-400 text-xs">{label}</p>
              <p className="text-white font-bold text-xl">{value ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(({ label, icon: Icon, color, to }) => (
            <button key={to} onClick={() => navigate(to)}
              className="card-sm flex items-center gap-3 active:scale-95 transition-transform text-left">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} />
              </div>
              <span className="text-white text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* My Sites */}
      {data?.sites?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">My Sites</h3>
            <button onClick={() => navigate('/sites')} className="text-primary-500 text-sm flex items-center gap-1">All <ChevronRight size={14} /></button>
          </div>
          <div className="space-y-2">
            {data.sites.slice(0, 3).map(site => (
              <button key={site.id} onClick={() => navigate(`/sites/${site.id}`)}
                className="card-sm w-full flex items-center gap-3 active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} className="text-primary-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium text-sm">{site.name}</p>
                  <p className="text-gray-500 text-xs">{site.city || 'No location'}</p>
                </div>
                <StatusBadge status={site.status} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reports */}
      {data?.recentReports?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Recent Reports</h3>
            <button onClick={() => navigate('/reports')} className="text-primary-500 text-sm flex items-center gap-1">All <ChevronRight size={14} /></button>
          </div>
          <div className="space-y-2">
            {data.recentReports.slice(0, 3).map(r => (
              <div key={r.id} className="card-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{r.title}</p>
                  <p className="text-gray-500 text-xs">{r.site?.name} · {r.report_date}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

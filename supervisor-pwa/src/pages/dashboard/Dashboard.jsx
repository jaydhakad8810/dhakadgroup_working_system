import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Users, ClipboardCheck, ChevronRight,
  MapPin, Calendar, TrendingUp, ArrowRightLeft
} from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

// Simple donut-style attendance bar
function AttendanceBar({ present, half_day, absent }) {
  const total = present + half_day + absent
  if (total === 0) return <p className="text-xs text-gray-500">No attendance today</p>
  const pPct = Math.round((present / total) * 100)
  const hPct = Math.round((half_day / total) * 100)
  const aPct = 100 - pPct - hPct
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {pPct > 0 && <div className="bg-green-500 transition-all" style={{ width: `${pPct}%` }} />}
        {hPct > 0 && <div className="bg-yellow-400 transition-all" style={{ width: `${hPct}%` }} />}
        {aPct > 0 && <div className="bg-red-500/60 transition-all" style={{ width: `${aPct}%` }} />}
      </div>
      <div className="flex gap-3 text-[10px]">
        <span className="text-green-400">{present} Present</span>
        <span className="text-yellow-400">{half_day} Half</span>
        <span className="text-red-400">{absent} Absent</span>
      </div>
    </div>
  )
}

// Progress bar for site timeline
function ProgressBar({ progress }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 bg-surface-400 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [sites, setSites] = useState([])
  const [siteStats, setSiteStats] = useState({}) // { [site_id]: stats }
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.get('/sites'),
      api.get('/notifications?unread=true'),
    ])
      .then(([sitesRes, notifRes]) => {
        const siteList = sitesRes.data || []
        setSites(siteList)
        const transferNotifs = (notifRes.data || []).filter(
          n => n.title?.includes('Labour Transferred') || n.message?.includes('transferred')
        )
        setTransfers(transferNotifs)
        // Fetch per-site stats in parallel
        return Promise.all(
          siteList.map(s =>
            api.get(`/dashboard/supervisor/site/${s.id}`)
              .then(r => ({ id: s.id, stats: r.data.stats }))
              .catch(() => ({ id: s.id, stats: null }))
          )
        )
      })
      .then(results => {
        const map = {}
        results.forEach(r => { map[r.id] = r.stats })
        setSiteStats(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingPage />

  return (
    <div className="page-content space-y-5">
      {/* Greeting */}
      <div className="card bg-gradient-to-r from-primary-500/20 to-surface-300 border-primary-500/20">
        <p className="text-gray-400 text-sm">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}
        </p>
        <h2 className="text-white font-bold text-xl">{user?.name}</h2>
        <p className="text-primary-400 text-sm mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {user?.employee_id && <p className="text-gray-500 text-xs mt-1">ID: {user.employee_id}</p>}
      </div>

      {/* Transfer alerts */}
      {transfers.length > 0 && (
        <div className="space-y-2">
          {transfers.slice(0, 2).map(n => (
            <button
              key={n.id}
              onClick={() => navigate('/labour')}
              className="w-full p-3 bg-orange-500/10 border border-orange-500/25 rounded-xl text-left active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3">
                <ArrowRightLeft size={18} className="text-orange-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-orange-400 font-semibold text-sm">Labour Transferred to Your Site</p>
                  <p className="text-gray-400 text-xs truncate">{n.message}</p>
                </div>
                <span className="text-orange-400 text-xs">View →</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Sites header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-base flex items-center gap-2">
          <Building2 size={16} className="text-primary-400" />
          My Sites ({sites.length})
        </h3>
        <button
          onClick={() => navigate('/attendance')}
          className="flex items-center gap-1 text-xs text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-lg"
        >
          <ClipboardCheck size={14} />
          Mark Attendance
        </button>
      </div>

      {/* Site cards */}
      {sites.length === 0 ? (
        <div className="card text-center py-8">
          <Building2 size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400 text-sm">No sites assigned yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map(site => {
            const st = siteStats[site.id]
            const progress = st?.progress ?? 0
            const present = st?.present ?? 0
            const half_day = st?.half_day ?? 0
            const absent = st?.absent ?? 0
            const totalLabour = st?.totalLabour ?? 0
            const pendingTasks = st?.pendingTasks ?? 0

            return (
              <div key={site.id} className="card space-y-3">
                {/* Site name + location */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-base truncate">{site.name}</p>
                    {(site.city || site.address) && (
                      <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                        <MapPin size={11} />
                        {site.city || site.address}
                      </p>
                    )}
                    {site.start_date && (
                      <p className="text-gray-600 text-xs flex items-center gap-1 mt-0.5">
                        <Calendar size={11} />
                        {site.start_date}
                        {site.expected_end_date ? ` → ${site.expected_end_date}` : ''}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    site.status === 'active'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : site.status === 'completed'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {site.status}
                  </span>
                </div>

                {/* Progress bar */}
                <ProgressBar progress={progress} />

                {/* Today's attendance */}
                <AttendanceBar present={present} half_day={half_day} absent={absent} />

                {/* Quick stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-surface-400 rounded-xl px-2 py-2 text-center">
                    <p className="text-white font-bold text-base">{totalLabour}</p>
                    <p className="text-gray-500 text-[10px] flex items-center justify-center gap-0.5">
                      <Users size={10} /> Labour
                    </p>
                  </div>
                  <div className="bg-surface-400 rounded-xl px-2 py-2 text-center">
                    <p className="text-green-400 font-bold text-base">{present + half_day}</p>
                    <p className="text-gray-500 text-[10px] flex items-center justify-center gap-0.5">
                      <ClipboardCheck size={10} /> Today
                    </p>
                  </div>
                  <div className="bg-surface-400 rounded-xl px-2 py-2 text-center">
                    <p className="text-orange-400 font-bold text-base">{pendingTasks}</p>
                    <p className="text-gray-500 text-[10px] flex items-center justify-center gap-0.5">
                      <TrendingUp size={10} /> Tasks
                    </p>
                  </div>
                </div>

                {/* View Site button */}
                <button
                  onClick={() => navigate(`/dashboard/site/${site.id}`)}
                  className="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px]"
                >
                  View Site
                  <ChevronRight size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

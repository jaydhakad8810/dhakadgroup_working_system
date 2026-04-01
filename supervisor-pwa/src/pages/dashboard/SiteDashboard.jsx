import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Users, ClipboardCheck, FileText,
  Package, Wrench, MapPin, Calendar, TrendingUp, ChevronRight
} from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage } from '../../components/ui'
import { useSite } from '../../context/SiteContext'

function ProgressBar({ progress }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Project Progress</span>
        <span className="text-primary-400 font-semibold">{progress}%</span>
      </div>
      <div className="h-2 bg-surface-400 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function SiteDashboard() {
  const { site_id } = useParams()
  const navigate = useNavigate()
  const { selectSite } = useSite()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (site_id) {
      selectSite(site_id)
      api.get(`/dashboard/supervisor/site/${site_id}`)
        .then(r => setData(r.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [site_id])

  if (loading) return <LoadingPage />

  const site = data?.site || {}
  const st = data?.stats || {}

  const present = st.present ?? 0
  const half_day = st.half_day ?? 0
  const absent = st.absent ?? 0
  const attendanceTotal = present + half_day + absent

  const sections = [
    { label: 'Attendance', icon: ClipboardCheck, color: 'bg-green-500/20 text-green-400', to: `/attendance` },
    { label: 'Labour', icon: Users, color: 'bg-blue-500/20 text-blue-400', to: `/labour?site_id=${site_id}` },
    { label: 'Godown', icon: Package, color: 'bg-orange-500/20 text-orange-400', to: '/godown' },
    { label: 'Machines', icon: Wrench, color: 'bg-purple-500/20 text-purple-400', to: '/machines' },
    { label: 'Reports', icon: FileText, color: 'bg-pink-500/20 text-pink-400', to: '/reports' },
    { label: 'Expenses', icon: TrendingUp, color: 'bg-yellow-500/20 text-yellow-400', to: '/expenses' },
  ]

  return (
    <div className="page-content space-y-4">
      {/* Header */}
      <div className="card bg-gradient-to-r from-primary-500/20 to-surface-300 border-primary-500/20 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost p-1 shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-primary-400 shrink-0" />
              <h1 className="text-white font-bold text-lg truncate">{site.name}</h1>
            </div>
            {(site.city || site.address) && (
              <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5 ml-6">
                <MapPin size={11} />
                {site.city || site.address}
              </p>
            )}
            {site.start_date && (
              <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5 ml-6">
                <Calendar size={11} />
                {site.start_date}
                {site.expected_end_date ? ` → ${site.expected_end_date}` : ''}
              </p>
            )}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
            site.status === 'active'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}>
            {site.status}
          </span>
        </div>
        <ProgressBar progress={st.progress ?? 0} />
      </div>

      {/* Today attendance breakdown */}
      <div className="card space-y-2">
        <h3 className="text-sm font-bold text-white">Today's Attendance</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2 text-center">
            <p className="text-green-400 font-bold text-xl">{present}</p>
            <p className="text-gray-500 text-xs">Present</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2 text-center">
            <p className="text-yellow-400 font-bold text-xl">{half_day}</p>
            <p className="text-gray-500 text-xs">Half Day</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2 text-center">
            <p className="text-red-400 font-bold text-xl">{absent}</p>
            <p className="text-gray-500 text-xs">Absent</p>
          </div>
        </div>
        {attendanceTotal > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden gap-px mt-1">
            {present > 0 && <div className="bg-green-500" style={{ width: `${(present / attendanceTotal) * 100}%` }} />}
            {half_day > 0 && <div className="bg-yellow-400" style={{ width: `${(half_day / attendanceTotal) * 100}%` }} />}
            {absent > 0 && <div className="bg-red-500/60" style={{ width: `${(absent / attendanceTotal) * 100}%` }} />}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <Users size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-gray-400 text-xs">Total Labour</p>
            <p className="text-white font-bold text-xl">{st.totalLabour ?? 0}</p>
          </div>
        </div>
        <div className="card-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-orange-400" />
          </div>
          <div>
            <p className="text-gray-400 text-xs">Pending Tasks</p>
            <p className="text-white font-bold text-xl">{st.pendingTasks ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div>
        <h3 className="text-white font-bold text-sm mb-3">Site Features</h3>
        <div className="grid grid-cols-3 gap-2">
          {sections.map(({ label, icon: Icon, color, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-300 active:scale-95 transition-transform text-center min-h-[80px] justify-center"
            >
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                <Icon size={18} />
              </div>
              <span className="text-gray-300 text-xs leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mark attendance CTA */}
      <button
        onClick={() => navigate('/attendance')}
        className="btn-primary w-full flex items-center justify-center gap-2 min-h-[48px]"
      >
        <ClipboardCheck size={18} />
        Mark Attendance for This Site
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

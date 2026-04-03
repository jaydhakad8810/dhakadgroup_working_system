import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LoadingPage } from '../../components/ui'
import { ArrowLeft, Phone, CreditCard, Building2, Users, ClipboardCheck, TrendingUp } from 'lucide-react'
import api from '../../utils/api'

function ProgressBar({ value = 0, color = 'bg-gold-500' }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="w-full bg-dark-700 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width .4s' }} />
    </div>
  )
}

function AttendanceBar({ records }) {
  if (!records.length) return <p className="text-gray-500 text-sm text-center py-4">No attendance data</p>
  const max = Math.max(...records.map(r => r.count), 1)
  return (
    <div className="flex items-end gap-0.5 h-20 overflow-x-auto pb-1">
      {records.map((r, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-[12px]">
          <div
            className="w-full rounded-t bg-gold-500/70 hover:bg-gold-400 transition-colors"
            style={{ height: `${(r.count / max) * 64}px` }}
            title={`${r.date}: ${r.count} workers`}
          />
        </div>
      ))}
    </div>
  )
}

export default function SupervisorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supervisor, setSupervisor] = useState(null)
  const [sites, setSites] = useState([])
  const [attendanceData, setAttendanceData] = useState([])
  const [visitReports, setVisitReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [u, s] = await Promise.all([
          api.get(`/users/${id}`),
          api.get(`/sites/supervisor/${id}`),
        ])
        setSupervisor(u.data)
        setSites(s.data)

        // 30-day attendance aggregated by date
        const end = new Date()
        const start = new Date(); start.setDate(start.getDate() - 29)
        const fmt = d => d.toISOString().split('T')[0]
        try {
          const att = await api.get(`/attendance?supervisor_id=${id}&start_date=${fmt(start)}&end_date=${fmt(end)}`)
          const byDate = {}
          for (let i = 0; i < 30; i++) {
            const d = new Date(start); d.setDate(d.getDate() + i)
            byDate[fmt(d)] = 0
          }
          ;(att.data || []).forEach(a => { if (byDate[a.date] !== undefined) byDate[a.date]++ })
          setAttendanceData(Object.entries(byDate).map(([date, count]) => ({ date, count })))
        } catch {}

        // Visit reports
        try {
          const vr = await api.get(`/visit-reports?supervisor_id=${id}`)
          setVisitReports(vr.data?.slice(0, 5) || [])
        } catch {}
      } catch {}
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <LoadingPage />
  if (!supervisor) return <div className="p-6 text-gray-400">Supervisor not found</div>

  const totalLabour = sites.reduce((s, site) => s + (site.labour_count || 0), 0)
  const activeSites = sites.filter(s => s.status === 'active' || s.status === 'ongoing').length
  const attendedDays = attendanceData.filter(r => r.count > 0).length

  const siteProgress = (site) => {
    if (!site.start_date || !site.expected_end_date) return 0
    const start = new Date(site.start_date), end = new Date(site.expected_end_date), now = new Date()
    const total = end - start, elapsed = now - start
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/supervisors')} className="btn-ghost flex items-center gap-2 text-sm">
        <ArrowLeft size={15} /> Back to Supervisors
      </button>

      {/* Header */}
      <div className="card flex items-start gap-4">
        {supervisor.photo
          ? <img src={supervisor.photo} className="w-20 h-20 rounded-2xl object-cover border border-dark-600 flex-shrink-0" alt={supervisor.name} />
          : <div className="w-20 h-20 rounded-2xl bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-3xl flex-shrink-0">{supervisor.name?.[0]}</div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-white font-bold text-xl">{supervisor.name}</h2>
              <p className="text-gold-400 font-mono text-sm">{supervisor.employee_id || '—'}</p>
            </div>
            <span className={supervisor.is_active ? 'badge-green' : 'badge-red'}>{supervisor.is_active ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
            {supervisor.phone && <span className="flex items-center gap-1.5"><Phone size={13} />{supervisor.phone}</span>}
            {supervisor.aadhar_number && <span className="flex items-center gap-1.5"><CreditCard size={13} />{supervisor.aadhar_number}</span>}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Assigned Sites', value: sites.length, icon: Building2, color: 'text-gold-400' },
          { label: 'Active Sites', value: activeSites, icon: TrendingUp, color: 'text-green-400' },
          { label: 'Team Members', value: totalLabour, icon: Users, color: 'text-blue-400' },
          { label: 'Active Days (30d)', value: attendedDays, icon: ClipboardCheck, color: 'text-orange-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card text-center">
            <Icon size={20} className={`mx-auto mb-1 ${color}`} />
            <p className={`font-bold text-2xl ${color}`}>{value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* 30-Day Attendance Chart */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <ClipboardCheck size={16} className="text-gold-400" />
          30-Day Attendance Activity
        </h3>
        <AttendanceBar records={attendanceData} />
        <p className="text-gray-600 text-xs mt-2">Daily worker count marked by this supervisor</p>
      </div>

      {/* Assigned Sites */}
      <div className="card">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Building2 size={16} className="text-gold-400" />
          Assigned Sites ({sites.length})
        </h3>
        {!sites.length && <p className="text-gray-500 text-sm text-center py-6">No sites assigned</p>}
        <div className="space-y-3">
          {sites.map(site => {
            const pct = siteProgress(site)
            return (
              <div key={site.id} className="p-3 bg-dark-800 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-medium text-sm">{site.name}</p>
                    <p className="text-gray-500 text-xs">{site.city || site.location || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      site.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      site.status === 'on_hold' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>{site.status}</span>
                    <span className="text-gold-400 font-semibold text-sm">{pct}%</span>
                  </div>
                </div>
                <ProgressBar value={pct} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Visit Reports */}
      {visitReports.length > 0 && (
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Recent Visit Reports</h3>
          <div className="space-y-2">
            {visitReports.map(r => (
              <div key={r.id} className="flex items-start justify-between p-3 bg-dark-800 rounded-xl">
                <div>
                  <p className="text-white text-sm font-medium">{r.site?.name || 'Unknown Site'}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{r.visit_date} · {r.summary?.slice(0, 60) || '—'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  r.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>{r.status || 'submitted'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bank Details */}
      {(supervisor.bank_name || supervisor.bank_account) && (
        <div className="card">
          <h3 className="text-white font-semibold mb-3">Bank Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[['Bank', supervisor.bank_name], ['Account', supervisor.bank_account], ['IFSC', supervisor.bank_ifsc]].filter(([, v]) => v).map(([l, v]) => (
              <div key={l} className="bg-dark-800 rounded-lg p-2.5">
                <p className="text-gray-500 text-xs">{l}</p>
                <p className="text-white font-medium">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

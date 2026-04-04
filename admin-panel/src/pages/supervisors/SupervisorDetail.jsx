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
import api from '../../utils/api'
import { LoadingPage } from '../../components/ui'
import { ArrowLeft, Phone, HardHat, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function SupervisorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supervisor, setSupervisor] = useState(null)
  const [sites, setSites] = useState([])
  const [attendanceData, setAttendanceData] = useState([])
  const [visitReports, setVisitReports] = useState([])
  const [attendance, setAttendance] = useState([])
  const [reports, setReports] = useState([])
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
        const [uRes, sRes, aRes, rRes] = await Promise.all([
          api.get(`/users/${id}`),
          api.get('/sites'),
          api.get(`/attendance?supervisor_id=${id}`),
          api.get(`/visit-reports?supervisor_id=${id}`).catch(() => ({ data: [] })),
        ])
        setSupervisor(uRes.data)
        // Sites where this supervisor is assigned
        const mySites = (sRes.data || []).filter(s => s.supervisor_id === id)
        setSites(mySites)
        setAttendance(aRes.data || [])
        setReports(rRes.data || [])
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
  if (!supervisor) return <div className="text-center py-16 text-gray-500">Supervisor not found</div>

  // Attendance stats for last 30 days
  const last30 = attendance.filter(a => {
    const d = new Date(a.date)
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 30
  })
  const daysWorked = [...new Set(last30.map(a => a.date))].length
  const totalPresent = last30.filter(a => a.status === 'present').length
  const totalHalf = last30.filter(a => a.status === 'half_day').length
  const totalAbsent = last30.filter(a => a.status === 'absent').length
  const totalLabour = last30.length
  const avgRate = totalLabour > 0 ? Math.round(((totalPresent + totalHalf * 0.5) / totalLabour) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate('/supervisors')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white">Supervisor Profile</h1>
      </div>

      {/* Profile card */}
      <div className="card">
        <div className="flex items-center gap-4">
          {supervisor.photo
            ? <img src={supervisor.photo} className="w-20 h-20 rounded-2xl object-cover border border-dark-600" alt={supervisor.name} />
            : <div className="w-20 h-20 rounded-2xl bg-gold-500/20 flex items-center justify-center text-gold-400 text-3xl font-bold border border-gold-500/20">
                {supervisor.name?.[0]}
              </div>
          }
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white">{supervisor.name}</h2>
            <p className="text-gold-400 font-mono text-sm">{supervisor.employee_id}</p>
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${supervisor.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {supervisor.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {supervisor.phone && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Phone size={14} /> {supervisor.phone}
            </div>
          )}
          {supervisor.emergency_contact && (
            <div className="text-sm text-gray-400">Emergency: {supervisor.emergency_contact}</div>
          )}
          {supervisor.aadhar_number && (
            <div className="text-sm text-gray-400">Aadhar: {supervisor.aadhar_number}</div>
          )}
          {supervisor.license_number && (
            <div className="text-sm text-gray-400">License: {supervisor.license_number}</div>
          )}
        </div>
      </div>

      {/* Performance stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gold-400">{daysWorked}</p>
          <p className="text-xs text-gray-500 mt-1">Days Worked (30d)</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-400">{reports.length}</p>
          <p className="text-xs text-gray-500 mt-1">Visit Reports</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-400">{avgRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Avg Attendance</p>
        </div>
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
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <HardHat size={16} className="text-gold-400" />
          Assigned Sites ({sites.length})
        </h3>
        {sites.length === 0
          ? <p className="text-gray-500 text-sm">No sites assigned</p>
          : <div className="space-y-3">
              {sites.map(s => (
                <div key={s.id} className="bg-dark-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-white text-sm">{s.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {s.status || 'active'}
                    </span>
                  </div>
                  {s.progress !== undefined && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span><span>{s.progress || 0}%</span>
                      </div>
                      <div className="h-1.5 bg-dark-600 rounded-full">
                        <div className="h-1.5 bg-gold-500 rounded-full" style={{ width: `${s.progress || 0}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
        }
      </div>

      {/* Attendance Summary (last 30 days) */}
      <div className="card">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-gold-400" />
          Attendance Summary — Last 30 Days
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
            <CheckCircle size={18} className="mx-auto mb-1 text-green-400" />
            <p className="text-xl font-bold text-green-400">{totalPresent}</p>
            <p className="text-xs text-gray-500">Present</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
            <Clock size={18} className="mx-auto mb-1 text-yellow-400" />
            <p className="text-xl font-bold text-yellow-400">{totalHalf}</p>
            <p className="text-xs text-gray-500">Half Day</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
            <XCircle size={18} className="mx-auto mb-1 text-red-400" />
            <p className="text-xl font-bold text-red-400">{totalAbsent}</p>
            <p className="text-xs text-gray-500">Absent</p>
          </div>
        </div>
      </div>

      {/* Visit Reports */}
      <div className="card">
        <h3 className="font-bold text-white mb-3">Visit Reports ({reports.length})</h3>
        {reports.length === 0
          ? <p className="text-gray-500 text-sm">No reports submitted</p>
          : <div className="space-y-2">
              {reports.slice(0, 10).map(r => (
                <div key={r.id} className="bg-dark-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{r.title || 'Visit Report'}</p>
                    <p className="text-xs text-gray-500">{r.report_date || r.date}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${r.status === 'closed' ? 'bg-green-500/20 text-green-400 border-green-500/30' : r.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                    {r.status || 'open'}
                  </span>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { LoadingPage } from '../../components/ui'
import { ArrowLeft, Phone, HardHat, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function SupervisorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supervisor, setSupervisor] = useState(null)
  const [sites, setSites] = useState([])
  const [attendance, setAttendance] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
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

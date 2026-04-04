import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LoadingPage } from '../../components/ui'
import { ArrowLeft, Phone, HardHat, Calendar, CheckCircle, XCircle } from 'lucide-react'
import api from '../../utils/api'

export default function SupervisorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supervisor, setSupervisor] = useState(null)
  const [sites, setSites] = useState([])
  const [attendanceData, setAttendanceData] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [u, s, r] = await Promise.all([
          api.get(`/users/${id}`),
          api.get(`/sites?supervisor_id=${id}`).catch(() => ({ data: [] })),
          api.get(`/visit-reports?supervisor_id=${id}`).catch(() => ({ data: [] })),
        ])
        setSupervisor(u.data)
        setSites(s.data || [])
        setReports(r.data || [])
        const att = await api.get(`/attendance?supervisor_id=${id}`).catch(() => ({ data: [] }))
        setAttendanceData(att.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <LoadingPage />
  if (!supervisor) return <div className="text-center py-16 text-gray-500">Supervisor not found</div>

  const present = attendanceData.filter(a => a.status === 'present').length
  const absent = attendanceData.filter(a => a.status === 'absent').length
  const half = attendanceData.filter(a => a.status === 'half_day').length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/supervisors')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white">Supervisor Profile</h1>
      </div>

      <div className="card">
        <div className="flex items-center gap-4">
          {supervisor.photo
            ? <img src={supervisor.photo} className="w-20 h-20 rounded-2xl object-cover border border-dark-600" alt={supervisor.name} />
            : <div className="w-20 h-20 rounded-2xl bg-gold-500/20 flex items-center justify-center text-gold-400 text-3xl font-bold border border-gold-500/20">{supervisor.name?.[0]}</div>
          }
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white">{supervisor.name}</h2>
            <p className="text-gold-400 font-mono text-sm">{supervisor.employee_id || supervisor.employeeId || '—'}</p>
            <div className="flex gap-2 mt-1 text-sm text-gray-400">
              {supervisor.phone && <span className="flex items-center gap-1"><Phone size={13} />{supervisor.phone}</span>}
            </div>
            <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${supervisor.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
              {supervisor.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <CheckCircle size={20} className="mx-auto mb-1 text-green-400" />
          <p className="font-bold text-2xl text-green-400">{present}</p>
          <p className="text-gray-500 text-xs mt-0.5">Present Days</p>
        </div>
        <div className="card text-center">
          <XCircle size={20} className="mx-auto mb-1 text-red-400" />
          <p className="font-bold text-2xl text-red-400">{absent}</p>
          <p className="text-gray-500 text-xs mt-0.5">Absent Days</p>
        </div>
        <div className="card text-center">
          <Calendar size={20} className="mx-auto mb-1 text-gold-400" />
          <p className="font-bold text-2xl text-gold-400">{half}</p>
          <p className="text-gray-500 text-xs mt-0.5">Half Days</p>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-white mb-3">Assigned Sites ({sites.length})</h3>
        {sites.length === 0
          ? <p className="text-gray-500 text-sm">No sites assigned</p>
          : sites.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
              <p className="text-sm text-white">{s.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${s.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                {s.status || 'active'}
              </span>
            </div>
          ))
        }
      </div>

      <div className="card">
        <h3 className="font-semibold text-white mb-3">Recent Reports ({reports.length})</h3>
        {reports.length === 0
          ? <p className="text-gray-500 text-sm">No reports submitted</p>
          : reports.slice(0, 10).map(r => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
              <div>
                <p className="text-sm text-white">{r.title || 'Daily Report'}</p>
                <p className="text-xs text-gray-500">{r.report_date || r.date}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${r.status === 'closed' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                {r.status || 'open'}
              </span>
            </div>
          ))
        }
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge } from '../../components/ui'

export default function AttendanceHistory() {
  const [records, setRecords] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSite, setFilterSite] = useState('')
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterSite) params.append('site_id', filterSite)
    if (filterDate) params.append('date', filterDate)
    api.get(`/attendance?${params}`)
      .then(r => setRecords(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterSite, filterDate])

  const present = records.filter(r => r.status === 'present').length
  const absent = records.filter(r => r.status === 'absent').length
  const half = records.filter(r => r.status === 'half_day').length

  return (
    <div className="page-content space-y-4">
      <div className="space-y-2">
        <select className="select" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" className="input" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
      </div>

      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
            <p className="text-green-400 font-bold text-xl">{present}</p><p className="text-gray-400 text-xs">Present</p>
          </div>
          <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-center">
            <p className="text-primary-400 font-bold text-xl">{half}</p><p className="text-gray-400 text-xs">Half Day</p>
          </div>
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
            <p className="text-red-400 font-bold text-xl">{absent}</p><p className="text-gray-400 text-xs">Absent</p>
          </div>
        </div>
      )}

      {loading ? <LoadingPage /> : (
        <div className="space-y-2">
          {records.map(r => (
            <div key={r.id} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-200 flex items-center justify-center text-gray-400 font-bold flex-shrink-0">
                {r.labour?.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{r.labour?.name}</p>
                <p className="text-gray-500 text-xs">{r.site?.name} · {r.date}</p>
                {r.check_in_time && <p className="text-gray-600 text-xs">In: {new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>}
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
          {records.length === 0 && <p className="text-center text-gray-500 py-12">No records found</p>}
        </div>
      )}
    </div>
  )
}

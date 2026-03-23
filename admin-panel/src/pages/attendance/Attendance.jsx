import { useEffect, useState } from 'react'
import { Search, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, StatusBadge } from '../../components/ui'

export default function Attendance() {
  const [records, setRecords] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSite, setFilterSite] = useState('')
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [search, setSearch] = useState('')
  const [summary, setSummary] = useState(null)
  const [labour, setLabour] = useState([])
  const [attendance, setAttendance] = useState({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSite) params.append('site_id', filterSite)
      if (filterDate && !filterFrom) params.append('date', filterDate)
      if (filterFrom) params.append('from', filterFrom)
      if (filterTo) params.append('to', filterTo)
      if (search) params.append('search', search)
      const [att, s] = await Promise.all([api.get(`/attendance?${params}`), api.get('/sites')])
      setRecords(att.data); setSites(s.data)
      if (filterSite && filterDate && !filterFrom) {
        const sum = await api.get(`/attendance/summary?site_id=${filterSite}&date=${filterDate}`)
        setSummary(sum.data)
      } else setSummary(null)
    } catch {}
    setLoading(false)
  }

  const loadLabour = async () => {
    if (!filterSite) return setLabour([])
    try {
      const l = await api.get(`/labour?site_id=${filterSite}&is_active=true`)
      setLabour(l.data)
      const map = {}
      records.forEach(r => { if (r.site_id === filterSite && r.date === filterDate) map[r.labour_id] = r.status })
      setAttendance(map)
    } catch {}
  }

  useEffect(() => { load() }, [filterSite, filterDate, filterFrom, filterTo, search])
  useEffect(() => { loadLabour() }, [filterSite, filterDate, records])

  const setStatus = (labourId, status) => setAttendance(p => ({ ...p, [labourId]: p[labourId] === status ? undefined : status }))
  const markAll = (status) => { const m = {}; labour.forEach(l => m[l.id] = status); setAttendance(m) }

  const handleSave = async () => {
    if (!filterSite) return toast.error('Select a site')
    const recs = labour.map(l => ({ labour_id: l.id, status: attendance[l.id] || 'absent', day_multiplier: attendance[l.id] === 'half_day' ? 0.5 : 1 }))
    setSaving(true)
    try { await api.post('/attendance/bulk', { site_id: filterSite, date: filterDate, records: recs }); toast.success('Attendance saved!'); load() }
    catch { toast.error('Failed') }
    setSaving(false)
  }

  const exportData = (format) => {
    if (!records.length) return toast.error('No data to export')
    if (format === 'csv') {
      const rows = [['Date', 'Labour', 'Site', 'Status', 'Check In', 'Check Out']]
      records.forEach(r => rows.push([r.date, r.labour?.name, r.site?.name, r.status, r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '', r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '']))
      const csv = rows.map(r => r.join(',')).join('\n')
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `attendance_${filterDate || 'report'}.csv`; a.click()
      toast.success('Exported as CSV')
    }
  }

  const present = Object.values(attendance).filter(v => v === 'present').length
  const half = Object.values(attendance).filter(v => v === 'half_day').length
  const absent = Object.values(attendance).filter(v => v === 'absent').length

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance"
        action={<button onClick={() => exportData('csv')} className="btn-outline"><Download size={16} />Export CSV</button>}
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="select w-56" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" className="input w-44" value={filterDate} onChange={e => { setFilterDate(e.target.value); setFilterFrom(''); setFilterTo('') }} />
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Range:</span>
          <input type="date" className="input w-40" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setFilterDate('') }} placeholder="From" />
          <input type="date" className="input w-40" value={filterTo} onChange={e => setFilterTo(e.target.value)} placeholder="To" />
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 w-52" placeholder="Search labour..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[['Total', summary.total, 'text-white'], ['Present', summary.present, 'text-green-400'], ['Absent', summary.absent, 'text-red-400'], ['Half Day', summary.half_day, 'text-gold-400']].map(([l, v, c]) => (
            <div key={l} className="card text-center"><p className="text-sm" style={{ color: 'var(--muted)' }}>{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></div>
          ))}
        </div>
      )}

      {/* Mark Attendance UI */}
      {filterSite && filterDate && !filterFrom && labour.length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Mark Attendance — {filterDate}</h3>
            <div className="flex gap-2">
              <button onClick={() => markAll('present')} className="btn-outline text-xs py-1.5">All Present</button>
              <button onClick={() => markAll('absent')} className="btn-danger text-xs py-1.5">All Absent</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-center"><p className="text-green-400 font-bold text-lg">{present}</p><p className="text-xs" style={{ color: 'var(--muted)' }}>Present</p></div>
            <div className="p-2 bg-gold-500/10 border border-gold-500/20 rounded-lg text-center"><p className="text-gold-400 font-bold text-lg">{half}</p><p className="text-xs" style={{ color: 'var(--muted)' }}>Half Day</p></div>
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-center"><p className="text-red-400 font-bold text-lg">{absent}</p><p className="text-xs" style={{ color: 'var(--muted)' }}>Absent</p></div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {labour.map(l => {
              const s = attendance[l.id]
              return (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg3)' }}>
                  <div className="flex items-center gap-3">
                    {l.photo ? <img src={l.photo} className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold">{l.name[0]}</div>}
                    <div><p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{l.name}</p><p className="text-xs" style={{ color: 'var(--muted)' }}>₹{l.daily_wage}/day</p></div>
                  </div>
                  <div className="flex gap-1.5">
                    {['present', 'half_day', 'absent'].map(st => (
                      <button key={st} onClick={() => setStatus(l.id, st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${s === st ? (st === 'present' ? 'bg-green-500 text-white' : st === 'absent' ? 'bg-red-500 text-white' : 'bg-gold-500 text-black') : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                        {st === 'half_day' ? 'Half' : st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-gold w-full justify-center">{saving ? 'Saving...' : `Save Attendance (${present + half} present)`}</button>
        </div>
      )}

      {/* Records table */}
      {(filterFrom || !filterSite) && (
        <div className="table-container">
          <table>
            <thead><tr><th>Labour</th><th>Site</th><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th></tr></thead>
            <tbody>
              {records.slice(0, 100).map(r => (
                <tr key={r.id}>
                  <td>{r.labour?.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.site?.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.date}</td>
                  <td><StatusBadge status={r.status} /></td><td>{r.checkin_photo ? <a href={r.checkin_photo} target="_blank" rel="noreferrer"><img src={r.checkin_photo} className="w-10 h-10 rounded-lg object-cover hover:opacity-80"/></a> : <span style={{color:"var(--muted)"}}>—</span>}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                </tr>
              ))}
              {!records.length && <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--muted)' }}>No records</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

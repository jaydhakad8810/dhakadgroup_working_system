import { useEffect, useState } from 'react'
import { Search, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, StatusBadge } from '../../components/ui'

function PhotoThumb({ url, label }) {
  const [expanded, setExpanded] = useState(false)
  if (!url) return <span style={{ color: 'var(--muted)' }}>—</span>
  return (
    <>
      <img
        src={url}
        alt={label}
        title={`Click to expand ${label}`}
        className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:opacity-80 border border-white/10"
        onClick={() => setExpanded(true)}
      />
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setExpanded(false)}
        >
          <div className="relative max-w-lg w-full mx-4">
            <button
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
              onClick={() => setExpanded(false)}
            >
              <X size={18} />
            </button>
            <img src={url} alt={label} className="w-full rounded-xl" />
            <p className="text-center text-xs text-gray-300 mt-2">{label}</p>
          </div>
        </div>
      )}
    </>
  )
}

export default function Attendance() {
  const [records, setRecords] = useState([])
  const [sites, setSites] = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSite, setFilterSite] = useState('')
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterSupervisor, setFilterSupervisor] = useState('')
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
      if (filterSupervisor) params.append('supervisor_id', filterSupervisor)
      const [att, s] = await Promise.all([api.get(`/attendance?${params}`), api.get('/sites')])
      setRecords(att.data)
      setSites(s.data)
      // collect unique supervisors from records
      const supMap = {}
      ;(att.data || []).forEach(r => {
        if (r.supervisor) supMap[r.supervisor.id] = r.supervisor
      })
      setSupervisors(Object.values(supMap))
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

  useEffect(() => { load() }, [filterSite, filterDate, filterFrom, filterTo, search, filterSupervisor])
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

  const exportData = () => {
    if (!records.length) return toast.error('No data to export')
    const rows = [['Date', 'Labour', 'Site', 'Supervisor', 'Status', 'Check In', 'Check Out', 'Task Note']]
    records.forEach(r => rows.push([
      r.date,
      r.labour?.name || '',
      r.site?.name || '',
      r.supervisor?.name || '',
      r.status,
      r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '',
      r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '',
      r.task_note || ''
    ]))
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `attendance_${filterDate || 'report'}.csv`
    a.click()
    toast.success('Exported as CSV')
  }

  const present = Object.values(attendance).filter(v => v === 'present').length
  const half = Object.values(attendance).filter(v => v === 'half_day').length
  const absent = Object.values(attendance).filter(v => v === 'absent').length
  const recordsToShow = search ? records.filter(r => (r.labour?.name || '').toLowerCase().includes(search.toLowerCase())) : records

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance"
        action={<button onClick={exportData} className="btn-outline"><Download size={16} />Export CSV</button>}
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="select w-56" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" className="input w-44" value={filterDate} onChange={e => { setFilterDate(e.target.value); setFilterFrom(''); setFilterTo('') }} />
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Range:</span>
          <input type="date" className="input w-40" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setFilterDate('') }} placeholder="From" />
          <input type="date" className="input w-40" value={filterTo} onChange={e => setFilterTo(e.target.value)} placeholder="To" />
        </div>
        <select className="select w-48" value={filterSupervisor} onChange={e => setFilterSupervisor(e.target.value)}>
          <option value="">All Supervisors</option>
          {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
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
      {loading ? (
        <LoadingPage />
      ) : (
        <div className="table-container overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Labour</th>
                <th>Site</th>
                <th>Date</th>
                <th>Supervisor</th>
                <th>Status</th>
                <th>Check-In</th>
                <th>Check-In Photo</th>
                <th>Check-Out</th>
                <th>Check-Out Photo</th>
                <th>Task Note</th>
                <th>Materials</th>
              </tr>
            </thead>
            <tbody>
              {recordsToShow.slice(0, 200).map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {r.labour?.photo
                        ? <img src={r.labour.photo} className="w-7 h-7 rounded-md object-cover" />
                        : <div className="w-7 h-7 rounded-md bg-gold-500/20 flex items-center justify-center text-gold-400 text-xs font-bold">{(r.labour?.name || '?')[0]}</div>
                      }
                      <span>{r.labour?.name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{r.site?.name || '—'}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.date}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.supervisor?.name || '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td style={{ color: 'var(--muted)' }}>
                    {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                  </td>
                  <td>
                    <PhotoThumb url={r.check_in_photo} label="Check-In Photo" />
                  </td>
                  <td style={{ color: 'var(--muted)' }}>
                    {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                  </td>
                  <td>
                    <PhotoThumb url={r.check_out_photo} label="Check-Out Photo" />
                  </td>
                  <td style={{ color: 'var(--muted)', maxWidth: 160 }}>
                    {r.task_note
                      ? <span title={r.task_note} className="block truncate max-w-[140px]">{r.task_note}</span>
                      : '—'}
                  </td>
                  <td style={{ color: 'var(--muted)', minWidth: 120 }}>
                    {Array.isArray(r.materials) && r.materials.length > 0
                      ? (
                        <ul className="text-xs space-y-0.5">
                          {r.materials.map((m, i) => (
                            <li key={i}>{m.name}: {m.quantity} {m.unit}</li>
                          ))}
                        </ul>
                      )
                      : '—'}
                  </td>
                </tr>
              ))}
              {!recordsToShow.length && (
                <tr><td colSpan={11} className="text-center py-8" style={{ color: 'var(--muted)' }}>{!records.length ? 'No records' : 'No records matching search.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

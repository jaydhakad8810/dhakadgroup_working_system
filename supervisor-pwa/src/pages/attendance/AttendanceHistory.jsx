import { useEffect, useState } from 'react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge } from '../../components/ui'
import { Search, Filter, X, Share2, FileText } from 'lucide-react'

// ── Defined OUTSIDE render ──────────────────────────────────────────────────
function FilterBar({ sites, filters, onChange, onApply, onReset }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Filter size={14} className="text-primary-400" />
        <span className="text-sm font-semibold text-white">Filters</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-xs">From Date</label>
          <input type="date" className="input text-white text-xs" value={filters.from} onChange={e => onChange('from', e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">To Date</label>
          <input type="date" className="input text-white text-xs" value={filters.to} onChange={e => onChange('to', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label text-xs">Site</label>
        <select className="select text-white text-xs" value={filters.site_id} onChange={e => onChange('site_id', e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label text-xs">Status</label>
        <div className="flex gap-2">
          {['all', 'present', 'half_day', 'absent'].map(s => (
            <button key={s} type="button" onClick={() => onChange('status', s)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all min-h-[36px] ${filters.status === s ? 'bg-primary-500 text-white' : 'bg-surface-400 text-gray-400'}`}>
              {s === 'half_day' ? 'Half' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input className="input text-white text-xs pl-8" placeholder="Search labour name…" value={filters.search} onChange={e => onChange('search', e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button onClick={onReset} className="flex-1 py-2 rounded-xl bg-surface-400 text-gray-400 text-xs font-medium flex items-center justify-center gap-1 min-h-[40px]">
          <X size={12} /> Reset
        </button>
        <button onClick={onApply} className="flex-1 btn-primary py-2 text-xs min-h-[40px]">
          Apply Filters
        </button>
      </div>
    </div>
  )
}

const DEFAULT_FILTERS = {
  from: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
  to: new Date().toISOString().split('T')[0],
  site_id: '',
  status: 'all',
  search: '',
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function AttendanceHistory() {
  const [records, setRecords] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)

  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (appliedFilters.site_id) params.append('site_id', appliedFilters.site_id)
    if (appliedFilters.from && appliedFilters.to) {
      params.append('from', appliedFilters.from)
      params.append('to', appliedFilters.to)
    }
    if (appliedFilters.search) params.append('search', appliedFilters.search)
    api.get(`/attendance?${params}`)
      .then(r => setRecords(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [appliedFilters])

  const changeFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }))
  const applyFilters = () => { setAppliedFilters({ ...filters }); setShowFilters(false) }
  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setAppliedFilters(DEFAULT_FILTERS); setShowFilters(false) }

  // Client-side status and search filtering
  const displayed = records.filter(r => {
    if (appliedFilters.status !== 'all' && r.status !== appliedFilters.status) return false
    if (appliedFilters.search) {
      const name = (r.labour?.name || '').toLowerCase()
      if (!name.includes(appliedFilters.search.toLowerCase())) return false
    }
    return true
  })

  const present = displayed.filter(r => r.status === 'present').length
  const absent  = displayed.filter(r => r.status === 'absent').length
  const half    = displayed.filter(r => r.status === 'half_day').length

  const siteName = sites.find(s => s.id === appliedFilters.site_id)?.name || 'All Sites'

  // WhatsApp share
  const handleShare = () => {
    const lines = [
      `📊 *Attendance Report — Dhakad Group*`,
      `📅 Period: ${appliedFilters.from} to ${appliedFilters.to}`,
      `🏢 Site: ${siteName}`,
      `👥 Total Records: ${displayed.length}`,
      `✅ Present: ${present} | 🌓 Half Day: ${half} | ❌ Absent: ${absent}`,
      ``,
      `Labour Details:`,
      ...displayed.slice(0, 30).map(r =>
        `• ${r.labour?.name || 'Unknown'} — ${r.status} — ${r.date}`
      ),
      displayed.length > 30 ? `…and ${displayed.length - 30} more records` : '',
    ].filter(l => l !== undefined)
    const text = lines.join('\n')
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  // PDF export
  const handleExport = () => {
    const token = sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token') || ''
    const params = new URLSearchParams()
    if (appliedFilters.site_id) params.append('site_id', appliedFilters.site_id)
    if (appliedFilters.from) params.append('date', appliedFilters.from)
    const base = api.defaults?.baseURL || '/api'
    const url = `${base}/attendance/report/pdf?${params}&token=${token}`
    window.open(url, '_blank')
  }

  return (
    <div className="page-content space-y-3" style={{ paddingBottom: 80 }}>
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px] transition-all ${showFilters ? 'bg-primary-500 text-white' : 'bg-surface-400 text-gray-400'}`}
        >
          <Filter size={13} /> Filters
        </button>
        <div className="flex gap-2">
          {displayed.length > 0 && (
            <>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/20 text-green-400 text-xs font-semibold min-h-[40px]">
                <Share2 size={13} /> Share
              </button>
              <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-500/20 text-primary-400 text-xs font-semibold min-h-[40px]">
                <FileText size={13} /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <FilterBar
          sites={sites}
          filters={filters}
          onChange={changeFilter}
          onApply={applyFilters}
          onReset={resetFilters}
        />
      )}

      {/* Summary */}
      {displayed.length > 0 && (
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
          {displayed.map(r => (
            <div key={r.id} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-200 flex items-center justify-center text-gray-400 font-bold flex-shrink-0">
                {r.labour?.name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{r.labour?.name || 'Unknown'}</p>
                <p className="text-gray-500 text-xs">{r.site?.name} · {r.date}</p>
                {r.check_in_time && (
                  <p className="text-gray-600 text-xs">
                    In: {new Date(r.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {r.check_out_time ? ` · Out: ${new Date(r.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    {r.hours_worked ? ` · ${Math.floor(r.hours_worked)}h ${Math.round((r.hours_worked % 1) * 60)}m` : ''}
                  </p>
                )}
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
          {displayed.length === 0 && <p className="text-center text-gray-500 py-12">No records found</p>}
        </div>
      )}
    </div>
  )
}

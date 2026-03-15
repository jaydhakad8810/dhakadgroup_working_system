import { useEffect, useState } from 'react'
import api from '../../utils/api'
import { LoadingPage } from '../../components/ui'
import { RefreshCw, Loader2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SalaryView() {
  const [records, setRecords] = useState([])
  const [rangeResults, setRangeResults] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filterSite, setFilterSite] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year] = useState(new Date().getFullYear())
  const [mode, setMode] = useState('monthly')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month, year })
      if (filterSite) params.append('site_id', filterSite)
      const [r, s] = await Promise.all([api.get(`/salary?${params}`), api.get('/sites')])
      setRecords(r.data); setSites(s.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [filterSite, month])

  const generateBulk = async () => {
    if (!filterSite) return toast.error('Select a site first')
    setGenerating(true)
    try {
      const res = await api.post('/salary/generate-bulk', { site_id: filterSite, month, year })
      toast.success(`Generated ${res.data.length} records`); load()
    } catch (e) { toast.error(e.response?.data?.message || 'Failed') }
    setGenerating(false)
  }

  const generateRange = async () => {
    if (!filterSite) return toast.error('Select a site first')
    if (!fromDate || !toDate) return toast.error('Select date range')
    setGenerating(true)
    try {
      const res = await api.post('/salary/generate-range', { site_id: filterSite, from_date: fromDate, to_date: toDate })
      setRangeResults(res.data)
      toast.success(`Generated ${res.data.length} records`)
    } catch { toast.error('Failed') }
    setGenerating(false)
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const displayRecords = mode === 'monthly' ? records : rangeResults
  const totalNet = displayRecords.reduce((s, r) => s + parseFloat(r.net_salary || 0), 0)

  return (
    <div className="page-content space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-surface-400 rounded-xl p-1">
        <button onClick={() => setMode('monthly')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'monthly' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}>Monthly</button>
        <button onClick={() => setMode('range')} className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all ${mode === 'range' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}><Calendar size={14} />Date Range</button>
      </div>

      <div className="space-y-2">
        <select className="select" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {mode === 'monthly' ? (
          <select className="select" value={month} onChange={e => setMonth(e.target.value)}>
            {months.map((m, i) => <option key={i} value={i + 1}>{m} {year}</option>)}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">From</label><input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
            <div><label className="label">To</label><input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
          </div>
        )}
      </div>

      <button
        onClick={mode === 'monthly' ? generateBulk : generateRange}
        disabled={generating}
        className="btn-primary w-full">
        {generating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
        {generating ? 'Generating...' : mode === 'monthly' ? 'Generate Monthly Salary' : 'Generate for Date Range'}
      </button>

      {displayRecords.length > 0 && (
        <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
          <p className="text-gray-400 text-xs">Total Net Payable</p>
          <p className="text-primary-400 font-bold text-2xl">₹{totalNet.toLocaleString('en-IN')}</p>
          {mode === 'monthly' && (
            <p className="text-gray-500 text-xs mt-1">{records.filter(r => !r.paid).length} unpaid · {records.filter(r => r.paid).length} paid</p>
          )}
        </div>
      )}

      {loading ? <LoadingPage /> : (
        <div className="space-y-2">
          {displayRecords.map((r, i) => (
            <div key={r.id || i} className="card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{r.labour?.name || r.labour_name}</p>
                  <p className="text-gray-500 text-xs">
                    {r.total_days} days · ₹{parseFloat(r.daily_wage || 0)}/day
                    {mode === 'range' && r.from_date && <span> · {r.from_date} → {r.to_date}</span>}
                  </p>
                </div>
                {mode === 'monthly' && r.paid !== undefined && (
                  <span className={r.paid ? 'badge-green' : 'badge-red'}>{r.paid ? 'Paid' : 'Unpaid'}</span>
                )}
              </div>
              <div className="flex justify-between text-sm bg-surface-400 rounded-xl p-3">
                <div className="text-center"><p className="text-gray-400 text-xs">Gross</p><p className="text-white font-medium">₹{parseFloat(r.gross_salary).toLocaleString('en-IN')}</p></div>
                <div className="text-center"><p className="text-gray-400 text-xs">Advance</p><p className="text-red-400 font-medium">-₹{parseFloat(r.advance_deduction).toLocaleString('en-IN')}</p></div>
                <div className="text-center"><p className="text-gray-400 text-xs">Net</p><p className="text-primary-400 font-bold">₹{parseFloat(r.net_salary).toLocaleString('en-IN')}</p></div>
              </div>
            </div>
          ))}
          {!displayRecords.length && <p className="text-center text-gray-500 py-12">No records. Generate first.</p>}
        </div>
      )}
    </div>
  )
}

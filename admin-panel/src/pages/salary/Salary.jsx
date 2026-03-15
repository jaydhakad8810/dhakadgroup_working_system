import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, StatusBadge, Modal } from '../../components/ui'
import { RefreshCw, CheckCircle, Calendar } from 'lucide-react'

export default function Salary() {
  const [records, setRecords] = useState([])
  const [rangeResults, setRangeResults] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSite, setFilterSite] = useState('')
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear] = useState(new Date().getFullYear())
  const [generating, setGenerating] = useState(false)
  const [payModal, setPayModal] = useState(null)
  const [payMode, setPayMode] = useState('cash')
  const [mode, setMode] = useState('monthly') // monthly | weekly
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month: filterMonth, year: filterYear })
      if (filterSite) params.append('site_id', filterSite)
      const [r, s] = await Promise.all([api.get(`/salary?${params}`), api.get('/sites')])
      setRecords(r.data); setSites(s.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [filterSite, filterMonth])

  const generateMonthly = async () => {
    if (!filterSite) return toast.error('Select a site first')
    setGenerating(true)
    try { const res = await api.post('/salary/generate-bulk', { site_id: filterSite, month: filterMonth, year: filterYear }); toast.success(`Generated ${res.data.length} records`); load() }
    catch (e) { toast.error(e.response?.data?.message || 'Failed') }
    setGenerating(false)
  }

  const generateWeekly = async () => {
    if (!filterSite) return toast.error('Select a site first')
    if (!fromDate || !toDate) return toast.error('Select date range')
    setGenerating(true)
    try {
      const res = await api.post('/salary/generate-range', { site_id: filterSite, from_date: fromDate, to_date: toDate })
      setRangeResults(res.data)
      toast.success(`Generated ${res.data.length} records for ${fromDate} to ${toDate}`)
    } catch (e) { toast.error('Failed') }
    setGenerating(false)
  }

  const markPaid = async () => {
    try { await api.patch(`/salary/${payModal}/pay`, { payment_mode: payMode }); toast.success('Marked as paid'); setPayModal(null); load() }
    catch { toast.error('Failed') }
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const displayRecords = mode === 'monthly' ? records : rangeResults
  const totalNet = displayRecords.reduce((s, r) => s + parseFloat(r.net_salary || 0), 0)
  const totalGross = displayRecords.reduce((s, r) => s + parseFloat(r.gross_salary || 0), 0)

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Salary Management" />

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)' }}>
        <button onClick={() => setMode('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'monthly' ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}>Monthly</button>
        <button onClick={() => setMode('weekly')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${mode === 'weekly' ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}><Calendar size={14} />Weekly / Custom Range</button>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="label">Site</label>
          <select className="select w-48" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
            <option value="">All Sites</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {mode === 'monthly' ? (
          <>
            <div>
              <label className="label">Month</label>
              <select className="select w-32" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <button onClick={generateMonthly} disabled={generating} className="btn-gold">
              <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />{generating ? 'Generating...' : 'Generate Monthly'}
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="label">From Date</label>
              <input type="date" className="input w-44" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="label">To Date</label>
              <input type="date" className="input w-44" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <button onClick={generateWeekly} disabled={generating} className="btn-gold">
              <Calendar size={16} className={generating ? 'animate-spin' : ''} />{generating ? 'Generating...' : 'Generate for Range'}
            </button>
          </>
        )}
      </div>

      {displayRecords.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center"><p className="text-sm" style={{ color: 'var(--muted)' }}>Total Gross</p><p className="text-white text-xl font-bold">₹{totalGross.toLocaleString('en-IN')}</p></div>
          <div className="card text-center"><p className="text-sm" style={{ color: 'var(--muted)' }}>Total Net</p><p className="text-gold-400 text-xl font-bold">₹{totalNet.toLocaleString('en-IN')}</p></div>
          <div className="card text-center"><p className="text-sm" style={{ color: 'var(--muted)' }}>Unpaid</p><p className="text-red-400 text-xl font-bold">{mode === 'monthly' ? records.filter(r => !r.paid).length : rangeResults.length}</p></div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead><tr><th>Labour</th><th>Site</th><th>{mode === 'weekly' ? 'Period' : 'Month'}</th><th>Days</th><th>Gross</th><th>Advance</th><th>Net</th>{mode === 'monthly' && <><th>Status</th><th>Action</th></>}</tr></thead>
          <tbody>
            {displayRecords.map((r, i) => (
              <tr key={r.id || i}>
                <td className="font-medium">{r.labour?.name || r.labour_name}</td>
                <td style={{ color: 'var(--muted)' }}>{r.site?.name || '—'}</td>
                <td style={{ color: 'var(--muted)' }}>{mode === 'weekly' ? `${r.from_date} → ${r.to_date}` : `${months[r.month - 1]} ${r.year}`}</td>
                <td style={{ color: 'var(--muted)' }}>{r.total_days}</td>
                <td>₹{parseFloat(r.gross_salary).toLocaleString('en-IN')}</td>
                <td className="text-red-400">-₹{parseFloat(r.advance_deduction).toLocaleString('en-IN')}</td>
                <td className="text-gold-400 font-bold">₹{parseFloat(r.net_salary).toLocaleString('en-IN')}</td>
                {mode === 'monthly' && <>
                  <td><span className={r.paid ? 'badge-green' : 'badge-red'}>{r.paid ? 'Paid' : 'Unpaid'}</span></td>
                  <td>{!r.paid && <button onClick={() => setPayModal(r.id)} className="btn-gold py-1 text-xs"><CheckCircle size={12} />Pay</button>}</td>
                </>}
              </tr>
            ))}
            {!displayRecords.length && <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--muted)' }}>No records. Generate salary first.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Mark as Paid" size="sm">
        <div className="space-y-4">
          <div><label className="label">Payment Mode</label>
            <select className="select" value={payMode} onChange={e => setPayMode(e.target.value)}>
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setPayModal(null)} className="btn-ghost">Cancel</button>
            <button onClick={markPaid} className="btn-gold">Confirm</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { useEffect, useState } from 'react'
import api from '../../utils/api'
import { LoadingPage, Modal } from '../../components/ui'
import { RefreshCw, Loader2, Calendar, DollarSign, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SalaryView() {
  const [records, setRecords] = useState([])
  const [rangeResults, setRangeResults] = useState([])
  const [sites, setSites] = useState([])
  const [labour, setLabour] = useState([])
  const [advances, setAdvances] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filterSite, setFilterSite] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year] = useState(new Date().getFullYear())
  const [mode, setMode] = useState('monthly')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [tab, setTab] = useState('salary')
  const [advModal, setAdvModal] = useState(false)
  const [advForm, setAdvForm] = useState({ labour_id: '', amount: '', date: new Date().toISOString().split('T')[0], reason: '', payment_mode: 'cash' })
  const [savingAdv, setSavingAdv] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month, year })
      if (filterSite) params.append('site_id', filterSite)
      const [r, s, l, adv] = await Promise.all([
        api.get('/salary?' + params),
        api.get('/sites'),
        api.get('/labour' + (filterSite ? '?site_id=' + filterSite : '')),
        api.get('/salary/advances' + (filterSite ? '?site_id=' + filterSite : '')).catch(() => ({ data: [] }))
      ])
      setRecords(r.data); setSites(s.data); setLabour(l.data); setAdvances(adv.data || [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [filterSite, month])

  const generateBulk = async () => {
    if (!filterSite) return toast.error('Select a site first')
    setGenerating(true)
    try { const res = await api.post('/salary/generate-bulk', { site_id: filterSite, month, year }); toast.success('Generated ' + res.data.length + ' records'); load() }
    catch (e) { toast.error(e.response?.data?.message || 'Failed') }
    setGenerating(false)
  }

  const generateRange = async () => {
    if (!filterSite) return toast.error('Select a site first')
    if (!fromDate || !toDate) return toast.error('Select date range')
    setGenerating(true)
    try { const res = await api.post('/salary/generate-range', { site_id: filterSite, from_date: fromDate, to_date: toDate }); setRangeResults(res.data); toast.success('Generated ' + res.data.length + ' records') }
    catch { toast.error('Failed') }
    setGenerating(false)
  }

  const handleAdvance = async (e) => {
    e.preventDefault()
    if (!advForm.labour_id || !advForm.amount) return toast.error('Fill required fields')
    setSavingAdv(true)
    try {
      await api.post('/salary/advance', { ...advForm, amount: parseFloat(advForm.amount), site_id: filterSite || undefined })
      toast.success('Advance recorded!')
      setAdvModal(false)
      setAdvForm({ labour_id: '', amount: '', date: new Date().toISOString().split('T')[0], reason: '', payment_mode: 'cash' })
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setSavingAdv(false)
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const displayRecords = mode === 'monthly' ? records : rangeResults
  const totalNet = displayRecords.reduce((s, r) => s + parseFloat(r.net_salary || 0), 0)
  const pendingAdvances = advances.filter(a => !a.deducted)
  const totalPending = pendingAdvances.reduce((s, a) => s + parseFloat(a.amount || 0), 0)

  return (
    <div className="page-content space-y-4">
      <div className="flex gap-1 bg-surface-400 rounded-xl p-1">
        <button onClick={() => setTab('salary')} className={'flex-1 py-2 rounded-lg text-sm font-medium transition-all ' + (tab==='salary'?'bg-primary-500 text-white':'text-gray-400')}>Salary</button>
        <button onClick={() => setTab('advances')} className={'flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all ' + (tab==='advances'?'bg-orange-500 text-white':'text-gray-400')}>
          <DollarSign size={14}/>Advances{pendingAdvances.length>0&&<span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pendingAdvances.length}</span>}
        </button>
      </div>

      {tab==='salary'&&(<>
        <div className="flex gap-1 bg-surface-400 rounded-xl p-1">
          <button onClick={() => setMode('monthly')} className={'flex-1 py-2 rounded-lg text-sm font-medium transition-all '+(mode==='monthly'?'bg-primary-500 text-white':'text-gray-400')}>Monthly</button>
          <button onClick={() => setMode('range')} className={'flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all '+(mode==='range'?'bg-primary-500 text-white':'text-gray-400')}><Calendar size={14}/>Date Range</button>
        </div>
        <div className="space-y-2">
          <select className="select" value={filterSite} onChange={e=>setFilterSite(e.target.value)}>
            <option value="">All Sites</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {mode==='monthly'?<select className="select" value={month} onChange={e=>setMonth(e.target.value)}>{months.map((m,i)=><option key={i} value={i+1}>{m} {year}</option>)}</select>:(
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">From</label><input type="date" className="input" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></div>
              <div><label className="label">To</label><input type="date" className="input" value={toDate} onChange={e=>setToDate(e.target.value)}/></div>
            </div>
          )}
        </div>
        <button onClick={mode==='monthly'?generateBulk:generateRange} disabled={generating} className="btn-primary w-full">
          {generating?<Loader2 size={18} className="animate-spin"/>:<RefreshCw size={18}/>}
          {generating?'Generating...':mode==='monthly'?'Generate Monthly Salary':'Generate for Range'}
        </button>
        {displayRecords.length>0&&<div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl"><p className="text-gray-400 text-xs">Total Net Payable</p><p className="text-primary-400 font-bold text-2xl">₹{totalNet.toLocaleString('en-IN')}</p>{mode==='monthly'&&<p className="text-gray-500 text-xs mt-1">{records.filter(r=>!r.paid).length} unpaid</p>}</div>}
        {loading?<LoadingPage/>:(
          <div className="space-y-2">
            {displayRecords.map((r,i)=>(
              <div key={r.id||i} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <div><p className="text-white font-semibold">{r.labour?.name||r.labour_name}</p><p className="text-gray-500 text-xs">{r.total_days} days · ₹{parseFloat(r.daily_wage||0)}/day</p></div>
                  {mode==='monthly'&&r.paid!==undefined&&<span className={r.paid?'badge-green':'badge-red'}>{r.paid?'Paid':'Unpaid'}</span>}
                </div>
                <div className="flex justify-between text-sm bg-surface-400 rounded-xl p-3">
                  <div className="text-center"><p className="text-gray-400 text-xs">Gross</p><p className="text-white font-medium">₹{parseFloat(r.gross_salary).toLocaleString('en-IN')}</p></div>
                  <div className="text-center"><p className="text-gray-400 text-xs">Advance</p><p className="text-red-400 font-medium">-₹{parseFloat(r.advance_deduction).toLocaleString('en-IN')}</p></div>
                  <div className="text-center"><p className="text-gray-400 text-xs">Net</p><p className="text-primary-400 font-bold">₹{parseFloat(r.net_salary).toLocaleString('en-IN')}</p></div>
                </div>
              </div>
            ))}
            {!displayRecords.length&&<p className="text-center text-gray-500 py-12">No records. Generate first.</p>}
          </div>
        )}
      </>)}

      {tab==='advances'&&(
        <div className="space-y-4">
          <button onClick={()=>setAdvModal(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/20 font-semibold text-sm"><Plus size={16}/>Record New Advance</button>
          {pendingAdvances.length>0&&<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl"><p className="text-red-400 font-semibold text-sm">⚠️ Pending: ₹{totalPending.toLocaleString('en-IN')}</p><p className="text-gray-500 text-xs">Will deduct from next salary</p></div>}
          <select className="select" value={filterSite} onChange={e=>setFilterSite(e.target.value)}><option value="">All Sites</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <div className="space-y-2">
            {advances.map(a=>(
              <div key={a.id} className="card space-y-1">
                <div className="flex items-start justify-between">
                  <div><p className="text-white font-semibold text-sm">{a.labour?.name||'—'}</p><p className="text-gray-500 text-xs">{a.date||a.createdAt?.split('T')[0]} · {a.payment_mode||'cash'}</p></div>
                  <div className="text-right"><p className="text-orange-400 font-bold">₹{parseFloat(a.amount).toLocaleString('en-IN')}</p><span className={'text-xs px-2 py-0.5 rounded-full '+(a.deducted?'bg-green-500/15 text-green-400':'bg-red-500/15 text-red-400')}>{a.deducted?'Deducted':'Pending'}</span></div>
                </div>
                {a.reason&&<p className="text-gray-500 text-xs bg-surface-400 rounded-lg p-2">{a.reason}</p>}
              </div>
            ))}
            {!advances.length&&<p className="text-center text-gray-500 py-12">No advance records</p>}
          </div>
        </div>
      )}

      <Modal open={advModal} onClose={()=>setAdvModal(false)} title="Record Advance">
        <form onSubmit={handleAdvance} className="space-y-3">
          <div><label className="label">Worker *</label><select className="select" required value={advForm.labour_id} onChange={e=>setAdvForm(p=>({...p,labour_id:e.target.value}))}><option value="">Select worker</option>{labour.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount (₹) *</label><input type="number" className="input" required placeholder="0" value={advForm.amount} onChange={e=>setAdvForm(p=>({...p,amount:e.target.value}))}/></div>
            <div><label className="label">Date</label><input type="date" className="input" value={advForm.date} onChange={e=>setAdvForm(p=>({...p,date:e.target.value}))}/></div>
          </div>
          <div><label className="label">Payment Mode</label><select className="select" value={advForm.payment_mode} onChange={e=>setAdvForm(p=>({...p,payment_mode:e.target.value}))}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option></select></div>
          <div><label className="label">Reason</label><input className="input" placeholder="Reason..." value={advForm.reason} onChange={e=>setAdvForm(p=>({...p,reason:e.target.value}))}/></div>
          <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-orange-400">⚠️ Will auto-deduct from next salary</div>
          <button type="submit" disabled={savingAdv} className="btn-primary w-full">{savingAdv?'Saving...':'Record Advance'}</button>
        </form>
      </Modal>
    </div>
  )
}

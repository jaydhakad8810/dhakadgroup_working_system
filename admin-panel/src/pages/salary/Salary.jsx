import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, StatusBadge, Modal } from '../../components/ui'
import { RefreshCw, CheckCircle, Calendar, TrendingDown, DollarSign } from 'lucide-react'

export default function Salary() {
  const [records, setRecords] = useState([])
  const [rangeResults, setRangeResults] = useState([])
  const [sites, setSites] = useState([])
  const [labour, setLabour] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSite, setFilterSite] = useState('')
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear] = useState(new Date().getFullYear())
  const [generating, setGenerating] = useState(false)
  const [payModal, setPayModal] = useState(null)
  const [payMode, setPayMode] = useState('cash')
  const [mode, setMode] = useState('monthly')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [advanceModal, setAdvanceModal] = useState(false)
  const [advanceForm, setAdvanceForm] = useState({ labour_id: '', amount: '', date: new Date().toISOString().split('T')[0], reason: '', payment_mode: 'cash' })
  const [savingAdvance, setSavingAdvance] = useState(false)
  const [advances, setAdvances] = useState([])
  const [advTab, setAdvTab] = useState('salary')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month: filterMonth, year: filterYear })
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
  useEffect(() => { load() }, [filterSite, filterMonth])

  const generateMonthly = async () => {
    if (!filterSite) return toast.error('Select a site first')
    setGenerating(true)
    try { const res = await api.post('/salary/generate-bulk', { site_id: filterSite, month: filterMonth, year: filterYear }); toast.success('Generated ' + res.data.length + ' records'); load() }
    catch (e) { toast.error(e.response?.data?.message || 'Failed') }
    setGenerating(false)
  }

  const generateWeekly = async () => {
    if (!filterSite) return toast.error('Select a site first')
    if (!fromDate || !toDate) return toast.error('Select date range')
    setGenerating(true)
    try { const res = await api.post('/salary/generate-range', { site_id: filterSite, from_date: fromDate, to_date: toDate }); setRangeResults(res.data); toast.success('Generated ' + res.data.length + ' records') }
    catch { toast.error('Failed') }
    setGenerating(false)
  }

  const markPaid = async () => {
    try { await api.patch('/salary/' + payModal + '/pay', { payment_mode: payMode }); toast.success('Marked as paid'); setPayModal(null); load() }
    catch { toast.error('Failed') }
  }

  const approveAdvance = async (id) => {
    try {
      await api.post(`/salary/advances/${id}/approve`)
      toast.success('Advance approved and marked for deduction')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const handleAdvance = async (e) => {
    e.preventDefault()
    if (!advanceForm.labour_id || !advanceForm.amount) return toast.error('Fill required fields')
    setSavingAdvance(true)
    try {
      await api.post('/salary/advance', { ...advanceForm, amount: parseFloat(advanceForm.amount), site_id: filterSite || undefined })
      toast.success('Advance recorded! Will be deducted from next salary.')
      setAdvanceModal(false)
      setAdvanceForm({ labour_id: '', amount: '', date: new Date().toISOString().split('T')[0], reason: '', payment_mode: 'cash' })
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setSavingAdvance(false)
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const displayRecords = mode === 'monthly' ? records : rangeResults
  const totalNet = displayRecords.reduce((s, r) => s + parseFloat(r.net_salary || 0), 0)
  const totalGross = displayRecords.reduce((s, r) => s + parseFloat(r.gross_salary || 0), 0)
  const totalAdvance = displayRecords.reduce((s, r) => s + parseFloat(r.advance_deduction || 0), 0)
  const pendingAdvances = advances.filter(a => !a.deducted)
  const totalPending = pendingAdvances.reduce((s, a) => s + parseFloat(a.amount || 0), 0)

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Salary Management"
        action={<button onClick={() => setAdvanceModal(true)} className="btn-outline text-orange-400 border-orange-400 hover:bg-orange-500/10"><TrendingDown size={16}/>Record Advance</button>}
      />

      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)' }}>
        <button onClick={() => setAdvTab('salary')} className={'px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (advTab==='salary'?'bg-gold-500 text-black':'text-gray-400 hover:text-white')}>Salary Records</button>
        <button onClick={() => setAdvTab('advances')} className={'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ' + (advTab==='advances'?'bg-orange-500 text-white':'text-gray-400 hover:text-white')}>
          <DollarSign size={14}/>Advances
          {pendingAdvances.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingAdvances.length}</span>}
        </button>
      </div>

      {advTab === 'salary' && (<>
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)' }}>
          <button onClick={() => setMode('monthly')} className={'px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (mode==='monthly'?'bg-gold-500 text-black':'text-gray-400 hover:text-white')}>Monthly</button>
          <button onClick={() => setMode('weekly')} className={'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ' + (mode==='weekly'?'bg-gold-500 text-black':'text-gray-400 hover:text-white')}><Calendar size={14}/>Weekly / Custom</button>
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div><label className="label">Site</label>
            <select className="select w-48" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
              <option value="">All Sites</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {mode === 'monthly' ? (<>
            <div><label className="label">Month</label>
              <select className="select w-32" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                {months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <button onClick={generateMonthly} disabled={generating} className="btn-gold"><RefreshCw size={16} className={generating?'animate-spin':''}/>{generating?'Generating...':'Generate Monthly'}</button>
          </>) : (<>
            <div><label className="label">From</label><input type="date" className="input w-44" value={fromDate} onChange={e => setFromDate(e.target.value)}/></div>
            <div><label className="label">To</label><input type="date" className="input w-44" value={toDate} onChange={e => setToDate(e.target.value)}/></div>
            <button onClick={generateWeekly} disabled={generating} className="btn-gold"><Calendar size={16}/>{generating?'Generating...':'Generate Range'}</button>
          </>)}
        </div>
        {displayRecords.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <div className="card text-center"><p className="text-sm" style={{color:'var(--muted)'}}>Total Gross</p><p className="text-white text-xl font-bold">₹{totalGross.toLocaleString('en-IN')}</p></div>
            <div className="card text-center"><p className="text-sm" style={{color:'var(--muted)'}}>Advance Deducted</p><p className="text-red-400 text-xl font-bold">-₹{totalAdvance.toLocaleString('en-IN')}</p></div>
            <div className="card text-center"><p className="text-sm" style={{color:'var(--muted)'}}>Total Net</p><p className="text-gold-400 text-xl font-bold">₹{totalNet.toLocaleString('en-IN')}</p></div>
            <div className="card text-center"><p className="text-sm" style={{color:'var(--muted)'}}>Unpaid</p><p className="text-red-400 text-xl font-bold">{records.filter(r=>!r.paid).length}</p></div>
          </div>
        )}
        <div className="table-container">
          <table>
            <thead><tr><th>Labour</th><th>Site</th><th>Period</th><th>Days</th><th>Gross</th><th>Advance</th><th>Net</th>{mode==='monthly'&&<><th>Status</th><th>Action</th></>}</tr></thead>
            <tbody>
              {displayRecords.map((r,i) => (
                <tr key={r.id||i}>
                  <td className="font-medium">{r.labour?.name||r.labour_name}</td>
                  <td style={{color:'var(--muted)'}}>{r.site?.name||'—'}</td>
                  <td style={{color:'var(--muted)'}}>{mode==='weekly'?r.from_date+' → '+r.to_date:months[r.month-1]+' '+r.year}</td>
                  <td style={{color:'var(--muted)'}}>{r.total_days}</td>
                  <td>₹{parseFloat(r.gross_salary).toLocaleString('en-IN')}</td>
                  <td className="text-red-400">{parseFloat(r.advance_deduction)>0?'-₹'+parseFloat(r.advance_deduction).toLocaleString('en-IN'):'-'}</td>
                  <td className="text-gold-400 font-bold">₹{parseFloat(r.net_salary).toLocaleString('en-IN')}</td>
                  {mode==='monthly'&&<><td><span className={r.paid?'badge-green':'badge-red'}>{r.paid?'Paid':'Unpaid'}</span></td><td>{!r.paid&&<button onClick={()=>setPayModal(r.id)} className="btn-gold py-1 text-xs"><CheckCircle size={12}/>Pay</button>}</td></>}
                </tr>
              ))}
              {!displayRecords.length && <tr><td colSpan={9} className="text-center py-8" style={{color:'var(--muted)'}}>No records. Generate salary first.</td></tr>}
            </tbody>
          </table>
        </div>
      </>)}

      {advTab === 'advances' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center border border-orange-500/20"><p className="text-sm text-gray-400">Total Advances</p><p className="text-orange-400 text-xl font-bold">{advances.length}</p></div>
            <div className="card text-center border border-red-500/20"><p className="text-sm text-gray-400">Pending Deduction</p><p className="text-red-400 text-xl font-bold">₹{totalPending.toLocaleString('en-IN')}</p></div>
            <div className="card text-center border border-green-500/20"><p className="text-sm text-gray-400">Deducted</p><p className="text-green-400 text-xl font-bold">{advances.filter(a=>a.deducted).length}</p></div>
          </div>
          <div className="flex justify-between items-center">
            <h3 className="text-white font-semibold">Advance Records</h3>
            <select className="select w-48" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
              <option value="">All Sites</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Labour</th><th>Amount</th><th>Date</th><th>Reason</th><th>Mode</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {advances.map(a => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.labour?.name||'—'}</td>
                    <td className="text-orange-400 font-bold">₹{parseFloat(a.amount).toLocaleString('en-IN')}</td>
                    <td style={{color:'var(--muted)'}}>{a.date||a.createdAt?.split('T')[0]}</td>
                    <td style={{color:'var(--muted)'}}>{a.reason||'—'}</td>
                    <td><span className="text-xs bg-surface-400 px-2 py-1 rounded-lg capitalize">{a.payment_mode||'cash'}</span></td>
                    <td><span className={a.deducted?'badge-green':'badge-red'}>{a.deducted?'Deducted':'Pending'}</span></td>
                    <td>{!a.deducted && <button onClick={() => approveAdvance(a.id)} className="btn-gold py-1 text-xs"><CheckCircle size={12}/>Approve</button>}</td>
                  </tr>
                ))}
                {!advances.length && <tr><td colSpan={7} className="text-center py-8" style={{color:'var(--muted)'}}>No advance records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Mark as Paid" size="sm">
        <div className="space-y-4">
          <div><label className="label">Payment Mode</label>
            <select className="select" value={payMode} onChange={e => setPayMode(e.target.value)}>
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end"><button onClick={()=>setPayModal(null)} className="btn-ghost">Cancel</button><button onClick={markPaid} className="btn-gold">Confirm</button></div>
        </div>
      </Modal>

      <Modal open={advanceModal} onClose={() => setAdvanceModal(false)} title="Record Advance Payment" size="md">
        <form onSubmit={handleAdvance} className="space-y-4">
          <div><label className="label">Labour *</label>
            <select className="select" required value={advanceForm.labour_id} onChange={e=>setAdvanceForm(p=>({...p,labour_id:e.target.value}))}>
              <option value="">Select worker</option>
              {labour.map(l=><option key={l.id} value={l.id}>{l.name} — {l.skill_type}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Amount (₹) *</label><input type="number" className="input" required placeholder="0" value={advanceForm.amount} onChange={e=>setAdvanceForm(p=>({...p,amount:e.target.value}))}/></div>
            <div><label className="label">Date</label><input type="date" className="input" value={advanceForm.date} onChange={e=>setAdvanceForm(p=>({...p,date:e.target.value}))}/></div>
          </div>
          <div><label className="label">Payment Mode</label>
            <select className="select" value={advanceForm.payment_mode} onChange={e=>setAdvanceForm(p=>({...p,payment_mode:e.target.value}))}>
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div><label className="label">Reason</label><input className="input" placeholder="Reason for advance..." value={advanceForm.reason} onChange={e=>setAdvanceForm(p=>({...p,reason:e.target.value}))}/></div>
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm text-orange-400">⚠️ This advance will be automatically deducted from the worker's next salary generation.</div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={()=>setAdvanceModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={savingAdvance} className="btn-gold">{savingAdvance?'Saving...':'Record Advance'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

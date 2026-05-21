import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, StatusBadge, Modal } from '../../components/ui'
import { RefreshCw, CheckCircle, Calendar, TrendingDown, DollarSign, ChevronDown, ChevronUp, Clock } from 'lucide-react'

// ─── SalaryBreakdownRow ─────────────────────────────────────────────────────
function SalaryBreakdownRow({ record, months, onPay }) {
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (!open && !summary) {
      setLoading(true)
      try {
        const year = record.year
        const month = String(record.month).padStart(2, '0')
        const from = `${year}-${month}-01`
        const daysInMonth = new Date(year, record.month, 0).getDate()
        const to = `${year}-${month}-${daysInMonth}`
        const res = await api.get(`/salary/labour/${record.labour?.id || record.labour_id}/summary?from=${from}&to=${to}`)
        setSummary(res.data)
      } catch { /* summary unavailable */ }
      setLoading(false)
    }
    setOpen(v => !v)
  }

  const fmtHours = (h) => {
    if (h == null) return '—'
    const hrs = Math.floor(h)
    const mins = Math.round((h - hrs) * 60)
    return `${hrs}h ${mins}m`
  }

  const fmtMultiplier = (m) => {
    if (m == null) return '1×'
    const v = parseFloat(m)
    return v === 2 ? '2×' : v === 1.5 ? '1.5×' : '1×'
  }

  const multiplierClass = (m) => {
    const v = parseFloat(m)
    if (v >= 2) return 'text-yellow-400 font-bold'
    if (v >= 1.5) return 'text-orange-400 font-bold'
    return 'text-gray-400'
  }

  return (
    <>
      <tr>
        <td className="font-medium">{record.labour?.name || record.labour_name}</td>
        <td style={{ color: 'var(--muted)' }}>{record.site?.name || '—'}</td>
        <td style={{ color: 'var(--muted)' }}>{months[record.month - 1]} {record.year}</td>
        <td>
          <div className="flex flex-col">
            <span style={{ color: 'var(--muted)' }}>{record.total_days} days</span>
            {summary && <span className="text-xs text-gold-400">{summary.effective_days} eff.</span>}
          </div>
        </td>
        <td>₹{parseFloat(record.gross_salary).toLocaleString('en-IN')}</td>
        <td className="text-red-400">{parseFloat(record.advance_deduction) > 0 ? '-₹' + parseFloat(record.advance_deduction).toLocaleString('en-IN') : '-'}</td>
        <td className="text-gold-400 font-bold">₹{parseFloat(record.net_salary).toLocaleString('en-IN')}</td>
        <td><span className={record.paid ? 'badge-green' : 'badge-red'}>{record.paid ? 'Paid' : 'Unpaid'}</span></td>
        <td>
          <div className="flex gap-1 items-center">
            {!record.paid && onPay && <button onClick={onPay} className="btn-gold py-1 text-xs"><CheckCircle size={12} />Pay</button>}
            <button onClick={toggle} className="btn-ghost p-1 text-xs flex items-center gap-1" title="View breakdown">
              {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {loading ? '...' : 'Detail'}
            </button>
          </div>
        </td>
      </tr>
      {open && summary && (
        <tr>
          <td colSpan={9} className="p-0">
            <div className="bg-surface-400 mx-2 mb-2 rounded-xl overflow-hidden border border-white/5">
              <div className="flex gap-4 px-4 py-2 text-xs border-b border-white/5">
                <span style={{ color: 'var(--muted)' }}>Days Present: <span className="text-white font-semibold">{summary.total_days_present}</span></span>
                <span style={{ color: 'var(--muted)' }}>Effective Days: <span className="text-gold-400 font-semibold">{summary.effective_days}</span></span>
                <span style={{ color: 'var(--muted)' }}>Total Salary: <span className="text-gold-400 font-semibold">₹{summary.total_salary.toLocaleString('en-IN')}</span></span>
              </div>
              {summary.periods?.length > 1 && (
                <div style={{background:'var(--bg3)',borderRadius:'8px',padding:'12px',margin:'8px',borderBottom:'1px solid var(--border)'}}>
                  <div style={{color:'var(--muted)',fontSize:'12px',marginBottom:'8px',fontWeight:'600'}}>WAGE BREAKDOWN (wages changed during this period)</div>
                  {summary.periods.map((period, i) => (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:i<summary.periods.length-1?'1px solid var(--border)':'none'}}>
                      <span style={{color:'var(--text)',fontSize:'13px'}}>₹{period.wage}/day × {period.days} days ({period.from} → {period.to})</span>
                      <span style={{color:'var(--gold)',fontWeight:'bold',fontSize:'13px'}}>₹{period.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0 0',borderTop:'1px solid var(--border)',marginTop:'4px'}}>
                    <span style={{fontWeight:'bold',color:'var(--text)'}}>Total Gross</span>
                    <span style={{fontWeight:'bold',color:'var(--gold)'}}>₹{summary.totalGross?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-2" style={{ color: 'var(--muted)', fontWeight: 600 }}>Date</th>
                    <th className="text-left px-4 py-2" style={{ color: 'var(--muted)', fontWeight: 600 }}>Status</th>
                    <th className="text-left px-4 py-2" style={{ color: 'var(--muted)', fontWeight: 600 }}>Hours Worked</th>
                    <th className="text-left px-4 py-2" style={{ color: 'var(--muted)', fontWeight: 600 }}>Day Count</th>
                    <th className="text-left px-4 py-2" style={{ color: 'var(--muted)', fontWeight: 600 }}>Day Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.breakdown.map((b, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-1.5 text-white">{b.date}</td>
                      <td className="px-4 py-1.5">
                        <span className={b.status === 'present' ? 'badge-green' : b.status === 'half_day' ? 'text-yellow-400' : 'text-red-400'}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-1.5 text-white flex items-center gap-1">
                        <Clock size={10} className="text-gray-500" />{fmtHours(b.hours_worked)}
                      </td>
                      <td className={`px-4 py-1.5 ${multiplierClass(b.day_multiplier)}`}>{fmtMultiplier(b.day_multiplier)}</td>
                      <td className="px-4 py-1.5 text-gold-400">₹{b.day_salary.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

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
  const [wageRequests, setWageRequests] = useState([])
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

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
  const loadWageRequests = async () => {
    try { const r = await api.get('/labour/wage-requests?status=all'); setWageRequests(r.data) } catch {}
  }
  useEffect(() => { load() }, [filterSite, filterMonth])
  useEffect(() => { loadWageRequests() }, [])

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
        <button onClick={() => { setAdvTab('wage_requests'); loadWageRequests() }} className={'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ' + (advTab==='wage_requests'?'bg-blue-500 text-white':'text-gray-400 hover:text-white')}>
          Wage Requests
          {wageRequests.filter(r=>r.status==='pending').length > 0 && <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{wageRequests.filter(r=>r.status==='pending').length}</span>}
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
            <thead>
              <tr>
                <th>Labour</th><th>Site</th><th>Period</th><th>Days</th><th>Gross</th><th>Advance</th><th>Net</th>
                {mode==='monthly'&&<><th>Status</th><th>Action</th></>}
                {mode==='weekly'&&<><th>Status</th></>}
              </tr>
            </thead>
            <tbody>
              {mode === 'monthly' ? displayRecords.map((r, i) => (
                <SalaryBreakdownRow key={r.id || i} record={r} months={months} onPay={() => setPayModal(r.id)} />
              )) : displayRecords.map((r, i) => (
                <tr key={r.id || i}>
                  <td className="font-medium">{r.labour?.name || r.labour_name}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.site?.name || '—'}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.from_date} → {r.to_date}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.total_days}</td>
                  <td>₹{parseFloat(r.gross_salary).toLocaleString('en-IN')}</td>
                  <td className="text-red-400">{parseFloat(r.advance_deduction) > 0 ? '-₹' + parseFloat(r.advance_deduction).toLocaleString('en-IN') : '-'}</td>
                  <td className="text-gold-400 font-bold">₹{parseFloat(r.net_salary).toLocaleString('en-IN')}</td>
                  <td><span className={r.paid ? 'badge-green' : 'badge-red'}>{r.paid ? 'Paid' : 'Unpaid'}</span></td>
                </tr>
              ))}
              {!displayRecords.length && <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--muted)' }}>No records. Generate salary first.</td></tr>}
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

      {advTab === 'wage_requests' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-semibold">Wage Change Requests</h3>
            <button onClick={loadWageRequests} className="btn-ghost text-sm"><RefreshCw size={14}/>Refresh</button>
          </div>
          {wageRequests.length === 0 ? (
            <div className="text-center py-12" style={{color:'var(--muted)'}}>No wage change requests found</div>
          ) : (
            <div className="space-y-3">
              {wageRequests.map(req => (
                <div key={req.id} className="card border border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-semibold">{req.labour?.name}</p>
                      <p className="text-gray-500 text-xs">by {req.supervisor?.name} · {new Date(req.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className={req.status==='pending'?'badge-gray':req.status==='approved'?'badge-green':'badge-red'}>{req.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3 text-sm">
                    <span className="text-red-400 font-mono">₹{parseFloat(req.current_wage).toLocaleString('en-IN')}/day</span>
                    <span style={{color:'var(--muted)'}}>→</span>
                    <span className="text-green-400 font-mono font-bold">₹{parseFloat(req.requested_wage).toLocaleString('en-IN')}/day</span>
                  </div>
                  {req.reason && <p className="text-gray-400 text-sm mb-3 bg-surface-400 rounded-lg p-2">"{req.reason}"</p>}
                  {req.status === 'pending' && (
                    <div className="flex gap-2 pt-2 border-t border-white/10">
                      <button onClick={async () => { try { await api.patch(`/labour/wage-requests/${req.id}/review`, { action: 'approve' }); toast.success('Approved'); loadWageRequests() } catch { toast.error('Failed') }}} className="btn-gold flex-1 justify-center py-1.5 text-sm">Approve</button>
                      <button onClick={() => { setRejectModal(req.id); setRejectReason('') }} className="btn-danger flex-1 justify-center py-1.5 text-sm">Reject</button>
                    </div>
                  )}
                  {req.rejection_reason && <p className="text-red-400 text-xs mt-2">Rejection: {req.rejection_reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Wage Request" size="sm">
        <div className="space-y-4">
          <div><label className="label">Reason for Rejection *</label><textarea className="input" rows={3} value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Explain why the request is being rejected..."/></div>
          <div className="flex gap-3 justify-end">
            <button onClick={()=>setRejectModal(null)} className="btn-ghost">Cancel</button>
            <button onClick={async () => { if(!rejectReason.trim()) return toast.error('Reason required'); try { await api.patch(`/labour/wage-requests/${rejectModal}/review`, { action:'reject', rejection_reason: rejectReason }); toast.success('Rejected'); setRejectModal(null); loadWageRequests() } catch { toast.error('Failed') }}} className="btn-danger">Confirm Reject</button>
          </div>
        </div>
      </Modal>

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

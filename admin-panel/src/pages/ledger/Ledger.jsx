import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal } from '../../components/ui'
import { DocUpload } from '../../components/ui/PhotoUpload'
import { Plus, Download } from 'lucide-react'

export default function Ledger() {
  const [statement, setStatement] = useState(null)
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ledger')
  const [filterSite, setFilterSite] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [modal, setModal] = useState(false)
  const [payModal, setPayModal] = useState(false)
  const [form, setForm] = useState({ entry_date: new Date().toISOString().split('T')[0], type: 'debit' })
  const [payForm, setPayForm] = useState({ payment_date: new Date().toISOString().split('T')[0], payment_mode: 'bank_transfer' })
  const [saving, setSaving] = useState(false)
  const [pendingAdvances, setPendingAdvances] = useState([])
  const [approvingAdv, setApprovingAdv] = useState(null)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const pf = (k, v) => setPayForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const [s, adv] = await Promise.all([api.get('/sites'), api.get('/labour/advances/pending')])
      setSites(s.data)
      setPendingAdvances(adv.data)
      if (filterSite) {
        const params = new URLSearchParams()
        if (filterFrom) params.append('from', filterFrom)
        if (filterTo) params.append('to', filterTo)
        const stmt = await api.get(`/ledger/statement/${filterSite}?${params}`)
        setStatement(stmt.data)
      } else {
        setStatement(null)
      }
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [filterSite, filterFrom, filterTo])

  const approveAdvance = async (advId) => {
    setApprovingAdv(advId)
    try {
      await api.patch(`/labour/advances/${advId}/approve`)
      toast.success('Advance approved and ledger updated')
      load()
    } catch { toast.error('Approval failed') }
    setApprovingAdv(null)
  }

  const handleEntry = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/ledger', { ...form, site_id: filterSite || form.site_id })
      toast.success('Entry added'); setModal(false); setForm({ entry_date: new Date().toISOString().split('T')[0], type: 'debit' }); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const handlePayment = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/ledger/client-payments', { ...payForm, site_id: filterSite || payForm.site_id })
      toast.success('Payment recorded'); setPayModal(false); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const exportCSV = () => {
    if (!statement) return toast.error('Select a site first')
    const rows = [['Date', 'Type', 'Category/Description', 'Amount', 'Mode']]
    statement.ledger.forEach(e => rows.push([e.entry_date, e.type, e.category || e.description || '', e.amount, '']))
    statement.expenses.forEach(e => rows.push([e.expense_date, 'expense', e.category_name || '', e.amount, e.payment_mode]))
    statement.payments.forEach(p => rows.push([p.payment_date, 'received', p.notes || 'Client Payment', p.amount, p.payment_mode]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `ledger_${filterSite}.csv`; a.click()
    toast.success('Exported as CSV')
  }

  const s = statement?.summary

  return (
    <div className="space-y-6">
      <PageHeader title="Site Ledger"
        action={<div className="flex gap-2">
          <button onClick={exportCSV} className="btn-outline text-sm"><Download size={14} />Export</button>
          <button onClick={() => setPayModal(true)} className="btn-outline text-sm">+ Client Payment</button>
          <button onClick={() => setModal(true)} className="btn-gold"><Plus size={16} />Add Entry</button>
        </div>}
      />

      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="label text-xs">Site</label>
          <select className="select w-56" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
            <option value="">Select Site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">From</label>
          <input type="date" className="input w-40" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">To</label>
          <input type="date" className="input w-40" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
        </div>
      </div>

      {s && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[['Credits', s.credits, 'text-green-400'], ['Debits', s.debits, 'text-red-400'], ['Expenses', s.totalExpenses, 'text-orange-400'], ['Balance', s.balance, 'text-gold-400'], ['Received', s.totalReceived, 'text-blue-400']].map(([l, v, c]) => (
            <div key={l} className="card text-center p-3">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{l}</p>
              <p className={`font-bold text-base ${c}`}>₹{parseFloat(v || 0).toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {pendingAdvances.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3" style={{ color: 'var(--gold)' }}>Pending Supervisor Advances ({pendingAdvances.length})</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Labour</th><th>Site</th><th>Supervisor</th><th>Amount</th><th>Date</th><th>Notes</th><th>Action</th></tr></thead>
              <tbody>
                {pendingAdvances.map(adv => (
                  <tr key={adv.id}>
                    <td className="font-medium">{adv.labour?.name || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{adv.labour?.site?.name || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{adv.givenBy?.name || '—'}</td>
                    <td className="text-orange-400 font-semibold">₹{parseFloat(adv.amount).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--muted)' }}>{new Date(adv.createdAt).toLocaleDateString('en-IN')}</td>
                    <td style={{ color: 'var(--muted)' }}>{adv.notes || '—'}</td>
                    <td>
                      <button onClick={() => approveAdvance(adv.id)} disabled={approvingAdv === adv.id}
                        className="btn-gold text-xs px-3 py-1">
                        {approvingAdv === adv.id ? 'Approving...' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {statement && (
        <>
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)' }}>
            {['ledger', 'expenses', 'payments'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}>
                {t === 'ledger' ? `Entries (${statement.ledger.length})` : t === 'expenses' ? `Expenses (${statement.expenses.length})` : `Payments (${statement.payments.length})`}
              </button>
            ))}
          </div>

          {tab === 'ledger' && (
            <div className="table-container">
              <table>
                <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Description</th></tr></thead>
                <tbody>
                  {statement.ledger.map(e => (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--muted)' }}>{e.entry_date}</td>
                      <td><span className={e.type === 'credit' ? 'badge-green' : 'badge-red'}>{e.type}</span></td>
                      <td style={{ color: 'var(--muted)' }}>{e.category || '—'}</td>
                      <td className={e.type === 'credit' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{e.type === 'credit' ? '+' : '-'}₹{parseFloat(e.amount).toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--muted)', maxWidth: '200px' }} className="truncate">{e.description || '—'}</td>
                    </tr>
                  ))}
                  {!statement.ledger.length && <tr><td colSpan={5} className="text-center py-8" style={{ color: 'var(--muted)' }}>No entries</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'expenses' && (
            <div className="table-container">
              <table>
                <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Mode</th><th>Description</th><th>Receipt</th></tr></thead>
                <tbody>
                  {statement.expenses.map(e => (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--muted)' }}>{e.expense_date}</td>
                      <td><span className="badge-gold">{e.category_name || '—'}</span></td>
                      <td className="text-orange-400 font-semibold">₹{parseFloat(e.amount).toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--muted)' }}>{e.payment_mode}</td>
                      <td style={{ color: 'var(--muted)', maxWidth: '180px' }} className="truncate">{e.description || '—'}</td>
                      <td>{e.receipt_photo ? <a href={e.receipt_photo} target="_blank" className="text-blue-400 text-xs hover:underline">View</a> : '—'}</td>
                    </tr>
                  ))}
                  {!statement.expenses.length && <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--muted)' }}>No expenses</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'payments' && (
            <div className="table-container">
              <table>
                <thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Receipt</th><th>Notes</th></tr></thead>
                <tbody>
                  {statement.payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--muted)' }}>{p.payment_date}</td>
                      <td className="text-green-400 font-semibold">₹{parseFloat(p.amount).toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--muted)' }}>{p.payment_mode}</td>
                      <td style={{ color: 'var(--muted)' }}>{p.reference_number || '—'}</td>
                      <td>{p.receipt_photo ? <a href={p.receipt_photo} target="_blank" className="text-blue-400 text-xs hover:underline">View</a> : '—'}</td>
                      <td style={{ color: 'var(--muted)' }}>{p.notes || '—'}</td>
                    </tr>
                  ))}
                  {!statement.payments.length && <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--muted)' }}>No payments</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!filterSite && !loading && (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
          <p>Select a site to view its ledger</p>
        </div>
      )}

      {/* Add Entry Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Ledger Entry" size="md">
        <form onSubmit={handleEntry} className="space-y-4">
          {!filterSite && <div><label className="label">Site *</label><select className="select" required value={form.site_id || ''} onChange={e => f('site_id', e.target.value)}><option value="">Select</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
          <div><label className="label">Date *</label><input type="date" className="input" required value={form.entry_date} onChange={e => f('entry_date', e.target.value)} /></div>
          <div><label className="label">Type *</label>
            <select className="select" value={form.type} onChange={e => f('type', e.target.value)}>
              <option value="debit">Debit (Expense)</option><option value="credit">Credit (Income)</option>
            </select>
          </div>
          <div><label className="label">Category</label><input className="input" placeholder="e.g. Material, Labour, Equipment" value={form.category || ''} onChange={e => f('category', e.target.value)} /></div>
          <div><label className="label">Amount (₹) *</label><input type="number" className="input" required value={form.amount || ''} onChange={e => f('amount', e.target.value)} /></div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description || ''} onChange={e => f('description', e.target.value)} /></div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : 'Add Entry'}</button></div>
        </form>
      </Modal>

      {/* Client Payment Modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Client Payment" size="md">
        <form onSubmit={handlePayment} className="space-y-4">
          {!filterSite && <div><label className="label">Site *</label><select className="select" required value={payForm.site_id || ''} onChange={e => pf('site_id', e.target.value)}><option value="">Select</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
          <div><label className="label">Date *</label><input type="date" className="input" required value={payForm.payment_date} onChange={e => pf('payment_date', e.target.value)} /></div>
          <div><label className="label">Amount (₹) *</label><input type="number" className="input" required value={payForm.amount || ''} onChange={e => pf('amount', e.target.value)} /></div>
          <div><label className="label">Payment Mode</label>
            <select className="select" value={payForm.payment_mode} onChange={e => pf('payment_mode', e.target.value)}>
              <option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="cash">Cash</option><option value="upi">UPI</option>
            </select>
          </div>
          <div><label className="label">Reference No.</label><input className="input" value={payForm.reference_number || ''} onChange={e => pf('reference_number', e.target.value)} /></div>
          <div><label className="label">Receipt / Document</label>
            <DocUpload value={payForm.receipt_photo} onChange={v => pf('receipt_photo', v)} folder="dgsystem/receipts" label="Upload receipt" />
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={payForm.notes || ''} onChange={e => pf('notes', e.target.value)} /></div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={() => setPayModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : 'Record Payment'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

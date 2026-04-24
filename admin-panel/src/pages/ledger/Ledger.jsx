import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Loader2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { uploadFile } from '../../utils/upload'
import { PageHeader, Modal } from '../../components/ui'

// ── helpers ───────────────────────────────────────────────────────────────────
const todayStr = new Date().toISOString().split('T')[0]
const firstOfMonth = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`
}
const fmt = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN')}`
const fmtDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${day} ${months[parseInt(m, 10) - 1]} ${y}`
}

// ── ManualEntryModal — OUTSIDE Ledger ─────────────────────────────────────────
function ManualEntryModal({ show, onClose, sites, onSuccess }) {
  const [form, setForm] = useState({
    site_id: '', date: todayStr,
    labour_cost: '', expense_cost: '', material_cost: '', equipment_cost: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const total = ['labour_cost', 'expense_cost', 'material_cost', 'equipment_cost']
    .reduce((s, k) => s + (parseFloat(form[k]) || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.site_id) return toast.error('Select a site')
    if (!form.date) return toast.error('Date is required')
    setSaving(true)
    try {
      await api.post('/ledger/manual', form)
      toast.success('Entry saved')
      onSuccess()
      onClose()
      setForm({ site_id: '', date: todayStr, labour_cost: '', expense_cost: '', material_cost: '', equipment_cost: '', notes: '' })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save') }
    setSaving(false)
  }

  return (
    <Modal open={show} onClose={onClose} title="Add Manual Entry" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Site *</label>
          <select className="select" required value={form.site_id} onChange={e => f('site_id', e.target.value)}>
            <option value="">Select site</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date *</label>
          <input type="date" className="input" required value={form.date} onChange={e => f('date', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Labour Cost (₹)</label>
            <input type="number" min="0" className="input" placeholder="0" value={form.labour_cost} onChange={e => f('labour_cost', e.target.value)} />
          </div>
          <div>
            <label className="label">Expense Cost (₹)</label>
            <input type="number" min="0" className="input" placeholder="0" value={form.expense_cost} onChange={e => f('expense_cost', e.target.value)} />
          </div>
          <div>
            <label className="label">Material Cost (₹)</label>
            <input type="number" min="0" className="input" placeholder="0" value={form.material_cost} onChange={e => f('material_cost', e.target.value)} />
          </div>
          <div>
            <label className="label">Equipment Cost (₹)</label>
            <input type="number" min="0" className="input" placeholder="0" value={form.equipment_cost} onChange={e => f('equipment_cost', e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg2)' }}>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Total</span>
          <span className="text-gold-400 font-bold text-lg">{fmt(total)}</span>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-gold">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Entry'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── AddPaymentModal — OUTSIDE Ledger ──────────────────────────────────────────
function AddPaymentModal({ show, onClose, siteId, sites, onSuccess }) {
  const [form, setForm] = useState({
    client_name: '', contract_amount: '', invoice_number: '', invoice_date: '',
    amount: '', payment_mode: 'Cash', payment_date: todayStr,
    milestone: '', notes: '', receipt_photo: '',
  })
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingReceipt(true)
    try {
      const url = await uploadFile(file, 'dgsystem/receipts')
      f('receipt_photo', url)
    } catch { toast.error('Receipt upload failed') }
    setUploadingReceipt(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.client_name) return toast.error('Client name is required')
    if (!form.amount) return toast.error('Amount is required')
    if (!form.payment_mode) return toast.error('Payment mode is required')
    if (!form.payment_date) return toast.error('Payment date is required')
    setSaving(true)
    try {
      await api.post('/ledger/client', { ...form, site_id: siteId || form.site_id })
      toast.success('Payment recorded')
      onSuccess()
      onClose()
      setForm({ client_name: '', contract_amount: '', invoice_number: '', invoice_date: '', amount: '', payment_mode: 'Cash', payment_date: todayStr, milestone: '', notes: '', receipt_photo: '' })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to record payment') }
    setSaving(false)
  }

  return (
    <Modal open={show} onClose={onClose} title="Record Client Payment" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!siteId && (
          <div>
            <label className="label">Site *</label>
            <select className="select" required value={form.site_id || ''} onChange={e => f('site_id', e.target.value)}>
              <option value="">Select site</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Client Name *</label>
            <input className="input" required placeholder="Client name" value={form.client_name} onChange={e => f('client_name', e.target.value)} />
          </div>
          <div>
            <label className="label">Contract Amount (₹)</label>
            <input type="number" min="0" className="input" placeholder="Total contract value" value={form.contract_amount} onChange={e => f('contract_amount', e.target.value)} />
          </div>
          <div>
            <label className="label">Invoice Number</label>
            <input className="input" placeholder="INV-001" value={form.invoice_number} onChange={e => f('invoice_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Invoice Date</label>
            <input type="date" className="input" value={form.invoice_date} onChange={e => f('invoice_date', e.target.value)} />
          </div>
          <div>
            <label className="label">Amount (₹) *</label>
            <input type="number" min="0" required className="input" placeholder="This payment amount" value={form.amount} onChange={e => f('amount', e.target.value)} />
          </div>
          <div>
            <label className="label">Payment Mode *</label>
            <select className="select" required value={form.payment_mode} onChange={e => f('payment_mode', e.target.value)}>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
          <div>
            <label className="label">Payment Date *</label>
            <input type="date" className="input" required value={form.payment_date} onChange={e => f('payment_date', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Milestone</label>
            <input className="input" placeholder="e.g. Foundation complete, 50% work done" value={form.milestone} onChange={e => f('milestone', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Receipt Photo</label>
          {form.receipt_photo ? (
            <div className="flex items-center gap-3">
              <a href={form.receipt_photo} target="_blank" rel="noreferrer">
                <img src={form.receipt_photo} className="w-16 h-16 object-cover rounded-lg border border-dark-600 hover:opacity-80 transition" alt="receipt" />
              </a>
              <button type="button" onClick={() => f('receipt_photo', '')} className="text-red-400 text-xs hover:underline">Remove</button>
            </div>
          ) : (
            <label className="cursor-pointer flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-dark-600 hover:border-gold-500/50 transition-colors">
              {uploadingReceipt
                ? <Loader2 size={16} className="animate-spin text-gold-500" />
                : <Upload size={16} className="text-gray-400" />
              }
              <span className="text-gray-400 text-sm">{uploadingReceipt ? 'Uploading...' : 'Upload receipt (optional)'}</span>
              {!uploadingReceipt && <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleReceiptUpload} />}
            </label>
          )}
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving || uploadingReceipt} className="btn-gold">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Ledger Component ─────────────────────────────────────────────────────
export default function Ledger() {
  const [searchParams] = useSearchParams()

  // Tab
  const [tab, setTab] = useState('site')

  // Site Ledger state
  const [sites, setSites] = useState([])
  const [selectedSite, setSelectedSite] = useState(searchParams.get('site_id') || '')
  const [dateFrom, setDateFrom] = useState(firstOfMonth())
  const [dateTo, setDateTo] = useState(todayStr)
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Client Ledger state
  const [clientSite, setClientSite] = useState('')
  const [payments, setPayments] = useState([])
  const [clientSummary, setClientSummary] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [clientLoading, setClientLoading] = useState(false)
  const [clientKey, setClientKey] = useState(0)

  // Fetch sites on mount
  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data)).catch(() => {})
  }, [])

  // Fetch ledger entries when filters or refreshKey change
  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedSite) params.append('site_id', selectedSite)
        params.append('from', dateFrom)
        params.append('to', dateTo)
        const { data } = await api.get(`/ledger?${params}`)
        setEntries(data)
        if (selectedSite) {
          const { data: sum } = await api.get(`/ledger/summary?site_id=${selectedSite}`)
          setSummary(sum)
        } else {
          setSummary(null)
        }
      } catch {}
      setLoading(false)
    }
    fetchEntries()
  }, [selectedSite, dateFrom, dateTo, refreshKey])

  // Fetch client ledger when clientSite or clientKey changes
  useEffect(() => {
    if (!clientSite) { setPayments([]); setClientSummary(null); return }
    const fetchClient = async () => {
      setClientLoading(true)
      try {
        const [p, s] = await Promise.all([
          api.get(`/ledger/client?site_id=${clientSite}`),
          api.get(`/ledger/client/summary?site_id=${clientSite}`),
        ])
        setPayments(p.data)
        setClientSummary(s.data)
      } catch {}
      setClientLoading(false)
    }
    fetchClient()
  }, [clientSite, clientKey])

  const modeBadge = (mode) => {
    const map = { Cash: 'badge-gray', UPI: 'badge-blue', Cheque: 'badge-gold', 'Bank Transfer': 'badge-green' }
    return <span className={map[mode] || 'badge-gray'}>{mode}</span>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ledger" />

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)' }}>
        {[['site', 'Site Ledger'], ['client', 'Client Ledger']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-gold-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Site Ledger ── */}
      {tab === 'site' && (
        <div className="space-y-5">
          {/* Filters row */}
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="label text-xs">Site</label>
                <select className="select w-56" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
                  <option value="">All Sites</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">From</label>
                <input type="date" className="input w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">To</label>
                <input type="date" className="input w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <button onClick={() => setShowManualModal(true)} className="btn-gold">
              <Plus size={16} /> Add Manual Entry
            </button>
          </div>

          {/* Summary cards — only when site selected */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Labour Cost', summary.total_labour, 'text-blue-400'],
                ['Expenses', summary.total_expenses, 'text-orange-400'],
                ['Materials', summary.total_materials, 'text-purple-400'],
                ['Grand Total', summary.grand_total, 'text-gold-400'],
              ].map(([label, value, color]) => (
                <div key={label} className="card text-center p-4">
                  <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
                  <p className={`font-bold text-lg ${color}`}>{fmt(value)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Entries table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-gold-500" />
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Labour (₹)</th>
                    <th>Expenses (₹)</th>
                    <th>Materials (₹)</th>
                    <th>Equipment (₹)</th>
                    <th>Total (₹)</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12" style={{ color: 'var(--muted)' }}>
                        No entries found
                      </td>
                    </tr>
                  ) : entries.map(e => (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--muted)' }}>{fmtDate(e.date)}</td>
                      <td>{fmt(e.labour_cost)}</td>
                      <td>{fmt(e.expense_cost)}</td>
                      <td>{fmt(e.material_cost)}</td>
                      <td>{fmt(e.equipment_cost)}</td>
                      <td className="text-gold-400 font-semibold">{fmt(e.total_cost)}</td>
                      <td>
                        <span className={e.entry_type === 'auto' ? 'badge-blue' : 'badge-gray'}>
                          {e.entry_type === 'auto' ? 'Auto' : 'Manual'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Client Ledger ── */}
      {tab === 'client' && (
        <div className="space-y-5">
          {/* Site selector */}
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div>
              <label className="label text-xs">Site</label>
              <select className="select w-64" value={clientSite} onChange={e => setClientSite(e.target.value)}>
                <option value="">Select a site</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {clientSite && (
              <button onClick={() => setShowPaymentModal(true)} className="btn-gold">
                <Plus size={16} /> Add Payment
              </button>
            )}
          </div>

          {!clientSite && (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <p>Select a site to view client ledger</p>
            </div>
          )}

          {clientSite && clientLoading && (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-gold-500" />
            </div>
          )}

          {clientSite && !clientLoading && (
            <>
              {/* Summary cards */}
              {clientSummary && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="card text-center p-4">
                      <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Contract Value</p>
                      <p className="text-white font-bold text-lg">{fmt(clientSummary.contract_amount)}</p>
                    </div>
                    <div className="card text-center p-4">
                      <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Total Collected</p>
                      <p className="text-green-400 font-bold text-lg">{fmt(clientSummary.total_paid)}</p>
                    </div>
                    <div className="card text-center p-4">
                      <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Balance Due</p>
                      <p className={`font-bold text-lg ${parseFloat(clientSummary.balance_due) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {fmt(clientSummary.balance_due)}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="card p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm" style={{ color: 'var(--muted)' }}>Collection Progress</span>
                      <span className="text-gold-400 font-semibold text-sm">{clientSummary.percent_collected}% collected</span>
                    </div>
                    <div className="w-full h-3 rounded-full" style={{ background: 'var(--bg2)' }}>
                      <div
                        className="h-3 rounded-full bg-gold-500 transition-all duration-500"
                        style={{ width: `${Math.min(Math.max(clientSummary.percent_collected, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Payments table */}
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Milestone</th>
                      <th>Amount (₹)</th>
                      <th>Mode</th>
                      <th>Notes</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12" style={{ color: 'var(--muted)' }}>
                          No payments recorded yet
                        </td>
                      </tr>
                    ) : payments.map(p => (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--muted)' }}>{fmtDate(p.payment_date)}</td>
                        <td style={{ color: 'var(--muted)' }}>{p.invoice_number || '—'}</td>
                        <td style={{ color: 'var(--muted)' }}>{p.milestone || '—'}</td>
                        <td className="text-green-400 font-semibold">{fmt(p.amount)}</td>
                        <td>{modeBadge(p.payment_mode)}</td>
                        <td style={{ color: 'var(--muted)', maxWidth: '140px' }} className="truncate">{p.notes || '—'}</td>
                        <td>
                          {p.receipt_photo
                            ? (
                              <a href={p.receipt_photo} target="_blank" rel="noreferrer">
                                <img
                                  src={p.receipt_photo}
                                  className="w-10 h-10 object-cover rounded-lg border border-dark-600 hover:opacity-80 transition"
                                  alt="receipt"
                                />
                              </a>
                            )
                            : '—'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      <ManualEntryModal
        show={showManualModal}
        onClose={() => setShowManualModal(false)}
        sites={sites}
        onSuccess={() => setRefreshKey(k => k + 1)}
      />

      <AddPaymentModal
        show={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        siteId={clientSite}
        sites={sites}
        onSuccess={() => setClientKey(k => k + 1)}
      />
    </div>
  )
}

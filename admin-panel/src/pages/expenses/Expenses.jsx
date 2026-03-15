import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal, ConfirmDialog } from '../../components/ui'
import { DocUpload } from '../../components/ui/PhotoUpload'
import { Plus, Trash2, Download } from 'lucide-react'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ expense_date: new Date().toISOString().split('T')[0], payment_mode: 'cash' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [filterSite, setFilterSite] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSite) params.append('site_id', filterSite)
      if (filterFrom) params.append('from', filterFrom)
      if (filterTo) params.append('to', filterTo)
      const [e, s, sugg] = await Promise.all([
        api.get(`/expenses?${params}`),
        api.get('/sites'),
        api.get('/expenses/category-suggestions').catch(() => ({ data: [] }))
      ])
      setExpenses(e.data); setSites(s.data); setSuggestions(sugg.data || [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [filterSite, filterFrom, filterTo])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/expenses', form)
      toast.success('Expense added'); setModal(false); setForm({ expense_date: new Date().toISOString().split('T')[0], payment_mode: 'cash' }); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/expenses/${id}`); toast.success('Deleted'); setDeleting(null); load() }
    catch { toast.error('Failed') }
  }

  const exportCSV = () => {
    if (!expenses.length) return toast.error('No data to export')
    const rows = [['Date', 'Category', 'Site', 'Amount', 'Payment Mode', 'Description']]
    expenses.forEach(e => rows.push([e.expense_date, e.category_name || '', e.site?.name || '', e.amount, e.payment_mode, e.description || '']))
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `expenses.csv`; a.click()
    toast.success('Exported')
  }

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Expenses" subtitle={`Total: ₹${total.toLocaleString('en-IN')}`}
        action={<div className="flex gap-2">
          <button onClick={exportCSV} className="btn-outline text-sm"><Download size={14} />Export</button>
          <button onClick={() => setModal(true)} className="btn-gold"><Plus size={16} />Add Expense</button>
        </div>}
      />
      <div className="flex gap-3 flex-wrap">
        <select className="select w-48" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" className="input w-40" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
        <input type="date" className="input w-40" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
      </div>

      <div className="table-container">
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Site</th><th>Amount</th><th>Mode</th><th>Description</th><th>Receipt</th><th></th></tr></thead>
          <tbody>
            {expenses.map(e => (
              <tr key={e.id}>
                <td style={{ color: 'var(--muted)' }}>{e.expense_date}</td>
                <td><span className="badge-gold">{e.category_name || '—'}</span></td>
                <td style={{ color: 'var(--muted)' }}>{e.site?.name || '—'}</td>
                <td className="text-gold-400 font-semibold">₹{parseFloat(e.amount).toLocaleString('en-IN')}</td>
                <td style={{ color: 'var(--muted)' }}>{e.payment_mode}</td>
                <td style={{ color: 'var(--muted)', maxWidth: '200px' }} className="truncate">{e.description || '—'}</td>
                <td>{e.receipt_photo ? <a href={e.receipt_photo} target="_blank" className="text-blue-400 text-xs hover:underline">View</a> : '—'}</td>
                <td><button onClick={() => setDeleting(e.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {!expenses.length && <tr><td colSpan={8} className="text-center py-8" style={{ color: 'var(--muted)' }}>No expenses found</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Expense" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Date *</label><input type="date" className="input" required value={form.expense_date} onChange={e => f('expense_date', e.target.value)} /></div>
          <div>
            <label className="label">Category (type your own)</label>
            <input className="input" list="cat-suggestions" placeholder="e.g. Cement, Sand, Labour, Transport..." value={form.category_name || ''} onChange={e => f('category_name', e.target.value)} />
            <datalist id="cat-suggestions">{suggestions.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div><label className="label">Site</label>
            <select className="select" value={form.site_id || ''} onChange={e => f('site_id', e.target.value)}>
              <option value="">General / No Site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="label">Amount (₹) *</label><input type="number" className="input" required value={form.amount || ''} onChange={e => f('amount', e.target.value)} /></div>
          <div><label className="label">Payment Mode</label>
            <select className="select" value={form.payment_mode} onChange={e => f('payment_mode', e.target.value)}>
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description || ''} onChange={e => f('description', e.target.value)} /></div>
          <div><label className="label">Receipt Photo / Document</label>
            <DocUpload value={form.receipt_photo} onChange={v => f('receipt_photo', v)} folder="dgsystem/receipts" label="Upload receipt" />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : 'Add Expense'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} title="Delete Expense" message="This cannot be undone." />
    </div>
  )
}

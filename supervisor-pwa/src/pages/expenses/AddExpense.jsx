import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Loader2 } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const uploadPhoto = async (file, folder) => {
  const fd = new FormData(); fd.append('file', file); fd.append('folder', folder)
  const { data } = await api.post('/upload/single', fd)
  return data.url
}

export default function AddExpense() {
  const navigate = useNavigate()
  const [sites, setSites] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [saving, setSaving] = useState(false)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    payment_mode: 'cash'
  })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    Promise.all([api.get('/sites'), api.get('/expenses/category-suggestions').catch(() => ({ data: [] }))])
      .then(([s, sugg]) => { setSites(s.data); setSuggestions(sugg.data || []) })
      .catch(() => {})
  }, [])

  const handleReceipt = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => setReceiptPreview(reader.result)
    reader.readAsDataURL(file)
    try {
      const url = await uploadPhoto(file, 'dgsystem/receipts')
      f('receipt_photo', url)
      toast.success('Receipt uploaded')
    } catch { toast.error('Upload failed') }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount) return toast.error('Amount required')
    setSaving(true)
    try {
      await api.post('/expenses', form)
      toast.success('Expense added!'); navigate('/expenses')
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  return (
    <div className="page-content space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Date *</label>
          <input type="date" className="input" required value={form.expense_date}
            onChange={e => f('expense_date', e.target.value)} max={new Date().toISOString().split('T')[0]} />
        </div>

        <div>
          <label className="label">Category (type your own)</label>
          <input className="input" list="cat-sugg"
            placeholder="e.g. Cement, Sand, Labour, Petrol..."
            value={form.category_name || ''} onChange={e => f('category_name', e.target.value)} />
          <datalist id="cat-sugg">
            {suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>

        <div>
          <label className="label">Site</label>
          <select className="select" value={form.site_id || ''} onChange={e => f('site_id', e.target.value)}>
            <option value="">General / No Site</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Amount (₹) *</label>
          <input type="number" className="input" required value={form.amount || ''}
            onChange={e => f('amount', e.target.value)} placeholder="0" />
        </div>

        <div>
          <label className="label">Payment Mode</label>
          <select className="select" value={form.payment_mode} onChange={e => f('payment_mode', e.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description || ''}
            onChange={e => f('description', e.target.value)} placeholder="What was this for?" />
        </div>

        {/* Receipt */}
        <div>
          <label className="label">Receipt Photo (optional)</label>
          <label className="flex items-center gap-3 p-4 bg-surface-400 border border-white/10 rounded-xl cursor-pointer active:scale-95 transition-transform">
            {receiptPreview
              ? <img src={receiptPreview} className="w-16 h-16 rounded-lg object-cover" alt="receipt" />
              : <div className="w-16 h-16 rounded-lg bg-surface-300 flex items-center justify-center flex-shrink-0">
                  <Camera size={24} className="text-gray-500" />
                </div>
            }
            <div>
              <p className="text-white text-sm font-medium">{receiptPreview ? 'Tap to change' : 'Take / Upload receipt'}</p>
              <p className="text-gray-500 text-xs">Camera or gallery</p>
            </div>
            {form.receipt_photo && <a href={form.receipt_photo} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-primary-400 text-xs ml-auto">View</a>}
            <input type="file" accept="image/*" className="hidden" onChange={handleReceipt} capture="environment" />
          </label>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full py-4">
          {saving ? <Loader2 size={18} className="animate-spin" /> : null}
          {saving ? 'Saving...' : 'Add Expense'}
        </button>
      </form>
    </div>
  )
}

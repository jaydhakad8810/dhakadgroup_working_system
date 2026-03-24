import { useEffect, useState } from 'react'
import { Receipt, Fuel, AlertCircle, Plus, Camera, X, Calendar, DollarSign, Tag, FileText, Car } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { LoadingPage, EmptyState, Modal, Spinner } from '../../components/ui'

const CATEGORIES = ['Fuel', 'Food', 'Toll', 'Parking', 'Maintenance', 'Other']

const today = () => new Date().toISOString().slice(0, 10)

const CATEGORY_COLORS = {
  Fuel: 'text-orange-400',
  Food: 'text-green-400',
  Toll: 'text-yellow-400',
  Parking: 'text-blue-400',
  Maintenance: 'text-red-400',
  Other: 'text-gray-400',
}

export default function DriverExpenses() {
  const [trips, setTrips] = useState([])
  const [expenses, setExpenses] = useState([])
  const [activeTrips, setActiveTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    category: 'Fuel',
    amount: '',
    description: '',
    date: today(),
    photo: '',
    trip_id: '',
  })

  const loadData = () => {
    Promise.all([
      api.get('/trips').catch(() => ({ data: [] })),
      api.get('/expenses').catch(() => ({ data: [] })),
      api.get('/trips/active').catch(() => ({ data: [] })),
    ]).then(([tripsRes, expensesRes, activeRes]) => {
      setTrips(tripsRes.data)
      setExpenses(expensesRes.data)
      setActiveTrips(activeRes.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'dgsystem/driver-expenses')
      const r = await api.post('/upload/single', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm(f => ({ ...f, photo: r.data.url }))
      toast.success('Photo uploaded')
    } catch {
      toast.error('Photo upload failed')
    }
    setUploading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description,
        date: form.date,
        photo: form.photo || undefined,
        trip_id: form.trip_id || undefined,
      }
      const { data } = await api.post('/expenses', payload)
      setExpenses(prev => [data, ...prev])
      setShowForm(false)
      setForm({ category: 'Fuel', amount: '', description: '', date: today(), photo: '', trip_id: '' })
      toast.success('Expense added!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add expense')
    }
    setSubmitting(false)
  }

  const tripExpenses = trips.filter(t => parseFloat(t.fuel_cost || 0) + parseFloat(t.other_expenses || 0) > 0)
  const totalTripFuel  = tripExpenses.reduce((s, t) => s + parseFloat(t.fuel_cost  || 0), 0)
  const totalTripOther = tripExpenses.reduce((s, t) => s + parseFloat(t.other_expenses || 0), 0)
  const totalDriverExp = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const grandTotal = totalTripFuel + totalTripOther + totalDriverExp

  if (loading) return <LoadingPage />

  return (
    <div className="page-content space-y-5">
      {/* Summary */}
      <div className="card bg-gradient-to-br from-primary-600/20 to-surface-300 border-primary-500/20">
        <p className="text-gray-400 text-sm">Total Expenses</p>
        <p className="text-white font-bold text-3xl mt-1">₹{grandTotal.toLocaleString('en-IN')}</p>
        <div className="flex gap-4 mt-3 flex-wrap">
          <div>
            <p className="text-gray-500 text-xs">Trip Fuel</p>
            <p className="text-orange-400 font-semibold">₹{totalTripFuel.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Trip Other</p>
            <p className="text-blue-400 font-semibold">₹{totalTripOther.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">My Expenses</p>
            <p className="text-green-400 font-semibold">₹{totalDriverExp.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* My Expenses Section */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">My Expenses</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-xl text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {expenses.length === 0
        ? <EmptyState icon={Receipt} title="No expenses yet" message="Tap 'Add Expense' to log your first expense" />
        : (
          <div className="space-y-2">
            {expenses.map(exp => (
              <div key={exp.id} className="card-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 ${CATEGORY_COLORS[exp.category] || 'text-gray-400'}`}>
                      {exp.category}
                    </span>
                    {exp.trip?.master_card_number && (
                      <span className="text-gray-500 text-xs">{exp.trip.master_card_number}</span>
                    )}
                  </div>
                  <p className="text-primary-400 font-bold">₹{parseFloat(exp.amount).toLocaleString('en-IN')}</p>
                </div>
                {exp.description && <p className="text-gray-400 text-xs">{exp.description}</p>}
                <div className="flex items-center justify-between">
                  <p className="text-gray-600 text-xs">{exp.expense_date}</p>
                  {exp.photo_url && (
                    <a href={exp.photo_url} target="_blank" rel="noreferrer" className="text-primary-400 text-xs">View photo</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* Trip Expense Breakdown */}
      <h3 className="text-white font-semibold">Trip Expense Breakdown</h3>

      {tripExpenses.length === 0
        ? <EmptyState icon={Fuel} title="No trip expenses" message="Trip expenses will appear here once you complete trips with fuel or other costs" />
        : (
          <div className="space-y-2">
            {tripExpenses.map(t => {
              const total = parseFloat(t.fuel_cost || 0) + parseFloat(t.other_expenses || 0)
              return (
                <div key={t.id} className="card-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{t.from_location} → {t.to_location || '...'}</p>
                      <p className="text-gray-500 text-xs">{t.trip_date} · {t.vehicle?.registration_number}</p>
                    </div>
                    <p className="text-primary-400 font-bold">₹{total.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    {parseFloat(t.fuel_cost || 0) > 0 && (
                      <span className="flex items-center gap-1 text-orange-400">
                        <Fuel size={12} /> ₹{parseFloat(t.fuel_cost).toLocaleString('en-IN')} fuel
                      </span>
                    )}
                    {parseFloat(t.other_expenses || 0) > 0 && (
                      <span className="flex items-center gap-1 text-blue-400">
                        <AlertCircle size={12} /> ₹{parseFloat(t.other_expenses).toLocaleString('en-IN')} other
                      </span>
                    )}
                    {t.distance_km && <span className="text-gray-500">{t.distance_km} km</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      {/* Add Expense Modal */}
      <Modal open={showForm} onClose={() => !submitting && setShowForm(false)} title="Add Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-gray-400 text-xs mb-1.5 flex items-center gap-1"><Tag size={12} /> Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, category: cat }))}
                  className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                    form.category === cat
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-200 text-gray-400 hover:bg-surface-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-gray-400 text-xs mb-1.5 flex items-center gap-1"><DollarSign size={12} /> Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="input-field w-full"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-400 text-xs mb-1.5 flex items-center gap-1"><FileText size={12} /> Description (optional)</label>
            <input
              type="text"
              placeholder="e.g. Filled 20L at HP pump"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field w-full"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-gray-400 text-xs mb-1.5 flex items-center gap-1"><Calendar size={12} /> Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="input-field w-full"
              required
            />
          </div>

          {/* Trip selector */}
          {activeTrips.length > 0 && (
            <div>
              <label className="block text-gray-400 text-xs mb-1.5 flex items-center gap-1"><Car size={12} /> Link to Trip (optional)</label>
              <select
                value={form.trip_id}
                onChange={e => setForm(f => ({ ...f, trip_id: e.target.value }))}
                className="input-field w-full"
              >
                <option value="">— No Trip —</option>
                {activeTrips.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.master_card_number || t.id.slice(0, 8)} · {t.from_location} → {t.to_location || '...'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Photo */}
          <div>
            <label className="block text-gray-400 text-xs mb-1.5 flex items-center gap-1"><Camera size={12} /> Photo (optional)</label>
            {form.photo
              ? (
                <div className="relative inline-block">
                  <img src={form.photo} alt="receipt" className="w-24 h-24 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, photo: '' }))}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              )
              : (
                <label className="flex items-center gap-2 px-3 py-2.5 bg-surface-200 rounded-xl cursor-pointer hover:bg-surface-100 transition-colors">
                  {uploading ? <Spinner size={16} /> : <Camera size={16} className="text-gray-400" />}
                  <span className="text-gray-400 text-sm">{uploading ? 'Uploading...' : 'Take or choose photo'}</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              )
            }
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <><Spinner size={18} /> Saving...</> : 'Save Expense'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

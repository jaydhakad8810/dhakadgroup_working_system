import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal, StatusBadge } from '../../components/ui'
import { Plus, FileText } from 'lucide-react'

const STATUS_COLORS = {
  pending: 'badge-gray',
  in_progress: 'badge-blue',
  delivered: 'badge-gold',
  completed: 'badge-green',
  ongoing: 'badge-blue',
  cancelled: 'badge-red',
}

const EMPTY_FORM = {
  trip_type: 'delivery',
  trip_date: new Date().toISOString().split('T')[0],
  status: 'pending',
  driver_id: '',
  vehicle_id: '',
  material_name: '',
  material_quantity: '',
  material_unit: 'units',
  from_location: '',
  to_location: '',
  notes: '',
  deadline: '',
}

export default function Trips() {
  const [trips, setTrips] = useState([])
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [masterCardModal, setMasterCardModal] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const [t, d, v, s] = await Promise.all([
        api.get('/trips'),
        api.get('/drivers'),
        api.get('/drivers/vehicles/all').catch(() => ({ data: [] })),
        api.get('/sites').catch(() => ({ data: [] }))
      ])
      setTrips(Array.isArray(t.data) ? t.data : (t.data?.data || []))
      setDrivers(Array.isArray(d.data) ? d.data : (d.data?.data || []))
      setVehicles(Array.isArray(v.data) ? v.data : (v.data?.data || []))
      setSites(Array.isArray(s.data) ? s.data : (s.data?.data || []))
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Auto-fill vehicle when driver selected
  const handleDriverChange = (driverId) => {
    f('driver_id', driverId)
    const driver = drivers.find(d => d.id === driverId)
    if (driver?.vehicles?.[0]) f('vehicle_id', driver.vehicles[0].id)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const r = await api.post('/trips', form)
      toast.success(`Trip created! Master Card: ${r.data.master_card_number}`)
      setModal(false); setForm({ ...EMPTY_FORM }); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setSaving(false)
  }

  if (loading) return <LoadingPage />

  const activeCount = trips.filter(t => ['pending', 'in_progress', 'delivered', 'ongoing'].includes(t.status)).length

  return (
    <div className="space-y-6">
      <PageHeader title="Trips & Stock Deliveries" subtitle={`${activeCount} active trips`}
        action={<button onClick={() => { setForm({ ...EMPTY_FORM }); setModal(true) }} className="btn-gold"><Plus size={16} />Create Trip</button>}
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Master Card</th><th>Type</th><th>Date</th><th>Driver</th>
              <th>Material</th><th>From → To</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {trips.map(t => (
              <tr key={t.id}>
                <td className="font-mono text-gold-400 font-semibold text-sm">{t.master_card_number || '—'}</td>
                <td><span className="badge-gray capitalize">{t.trip_type || 'regular'}</span></td>
                <td className="text-gray-400">{t.trip_date}</td>
                <td>{t.driver?.name || '—'}</td>
                <td className="text-gray-400 max-w-32 truncate">{t.material_name || t.purpose || '—'}</td>
                <td className="text-gray-400 max-w-40 truncate text-xs">{t.from_location} → {t.to_location || '?'}</td>
                <td>
                  <span className={STATUS_COLORS[t.status] || 'badge-gray'}>{t.status}</span>
                </td>
                <td>
                  <button onClick={() => setMasterCardModal(t)} className="btn-ghost px-2 py-1 text-xs text-blue-400">
                    <FileText size={13} />Card
                  </button>
                </td>
              </tr>
            ))}
            {trips.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-8">No trips yet</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Create Trip Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Create Trip" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Trip Type</label>
              <div className="flex gap-2">
                {[['delivery', '📦 Delivery (Godown → Site)'], ['return', '🔄 Return (Site → Godown)'], ['transfer', '🔀 Transfer (Godown → Godown)']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => f('trip_type', val)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${form.trip_type === val ? 'bg-gold-500 text-black' : 'bg-white/5 text-gray-400'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Driver *</label>
              <select className="select" value={form.driver_id} onChange={e => handleDriverChange(e.target.value)} required>
                <option value="">Select driver</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name || d.name}{d.user?.employee_id ? ` (${d.user.employee_id})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vehicle</label>
              <select className="select" value={form.vehicle_id} onChange={e => f('vehicle_id', e.target.value)}>
                <option value="">Select vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
              </select>
            </div>
            <div><label className="label">Material / Item *</label><input className="input" required value={form.material_name} onChange={e => f('material_name', e.target.value)} placeholder="e.g. Cement, Steel Rod" /></div>
            <div className="flex gap-2">
              <div className="flex-1"><label className="label">Quantity</label><input type="number" className="input" value={form.material_quantity} onChange={e => f('material_quantity', e.target.value)} /></div>
              <div className="w-28"><label className="label">Unit</label><input className="input" value={form.material_unit} onChange={e => f('material_unit', e.target.value)} placeholder="bags, kg, units" /></div>
            </div>
            <div>
              <label className="label">From *</label>
              <input className="input" required value={form.from_location} onChange={e => f('from_location', e.target.value)} placeholder="Godown name or Site name" />
            </div>
            <div>
              <label className="label">To *</label>
              <input className="input" required value={form.to_location} onChange={e => f('to_location', e.target.value)} placeholder="Site name or Godown name" />
            </div>
            <div><label className="label">Scheduled Date</label><input type="date" className="input" value={form.trip_date} onChange={e => f('trip_date', e.target.value)} /></div>
            <div><label className="label">Deadline</label><input type="datetime-local" className="input" value={form.deadline} onChange={e => f('deadline', e.target.value)} /></div>
            <div className="col-span-2"><label className="label">Notes / Instructions</label><textarea className="input" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Creating...' : 'Create Trip'}</button>
          </div>
        </form>
      </Modal>

      {/* Master Card Modal */}
      <Modal open={!!masterCardModal} onClose={() => setMasterCardModal(null)} title="Master Card" size="md">
        {masterCardModal && (
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg3)' }}>
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">DGSystem · Dhakad Group</p>
              <p className="text-gold-400 font-bold text-2xl font-mono">{masterCardModal.master_card_number || 'N/A'}</p>
              <span className={`${STATUS_COLORS[masterCardModal.status] || 'badge-gray'} mt-2 inline-block capitalize`}>{masterCardModal.status}</span>
              {masterCardModal.trip_type && <span className="badge-blue ml-2 capitalize">{masterCardModal.trip_type}</span>}
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ['Driver', masterCardModal.driver?.name],
                ['Vehicle', masterCardModal.vehicle?.registration_number],
                ['Material', masterCardModal.material_name || masterCardModal.purpose],
                ['Quantity', masterCardModal.material_quantity ? `${masterCardModal.material_quantity} ${masterCardModal.material_unit || ''}` : null],
                ['From', masterCardModal.from_location],
                ['To', masterCardModal.to_location],
                ['Date', masterCardModal.trip_date],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="p-2.5 rounded-lg" style={{ background: 'var(--bg3)' }}>
                  <p className="text-gray-400 text-xs">{label}</p>
                  <p className="text-white font-medium">{value}</p>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div>
              <p className="text-gray-400 text-xs mb-2">Trip Timeline</p>
              <div className="flex items-center gap-1 text-xs">
                {[
                  { label: 'Created', done: true, time: masterCardModal.createdAt },
                  { label: 'Picked Up', done: !!masterCardModal.pickup_confirmed_at, time: masterCardModal.pickup_confirmed_at },
                  { label: 'Delivered', done: !!masterCardModal.delivery_confirmed_at, time: masterCardModal.delivery_confirmed_at },
                  { label: 'Confirmed', done: masterCardModal.status === 'completed', time: null },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-1 flex-1">
                    <div className={`flex flex-col items-center ${i < 3 ? 'flex-1' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step.done ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                        {step.done ? '✓' : '○'}
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5 whitespace-nowrap">{step.label}</p>
                      {step.time && <p className="text-gray-600 text-xs">{new Date(step.time).toLocaleDateString('en-IN')}</p>}
                    </div>
                    {i < 3 && <div className={`h-0.5 flex-1 mb-4 ${step.done ? 'bg-green-500' : 'bg-gray-700'}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Photos */}
            {(masterCardModal.pickup_photo || masterCardModal.delivery_photo) && (
              <div className="grid grid-cols-2 gap-3">
                {masterCardModal.pickup_photo && (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Pickup Photo</p>
                    <img src={masterCardModal.pickup_photo} className="w-full h-28 object-cover rounded-xl" alt="Pickup" />
                  </div>
                )}
                {masterCardModal.delivery_photo && (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Delivery Photo</p>
                    <img src={masterCardModal.delivery_photo} className="w-full h-28 object-cover rounded-xl" alt="Delivery" />
                  </div>
                )}
              </div>
            )}

            {masterCardModal.notes && (
              <div className="p-3 rounded-xl" style={{ background: 'var(--bg3)' }}>
                <p className="text-gray-400 text-xs mb-1">Notes</p>
                <p className="text-white text-sm">{masterCardModal.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

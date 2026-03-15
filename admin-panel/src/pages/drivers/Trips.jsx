import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal, StatusBadge } from '../../components/ui'
import { Plus } from 'lucide-react'

export default function Trips() {
  const [trips, setTrips] = useState([])
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ trip_date: new Date().toISOString().split('T')[0], status: 'ongoing' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [t, d, v] = await Promise.all([api.get('/trips'), api.get('/drivers'), api.get('/drivers/vehicles/all')])
      setTrips(t.data); setDrivers(d.data); setVehicles(v.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/trips', form); toast.success('Trip created'); setModal(false); setForm({ trip_date: new Date().toISOString().split('T')[0], status: 'ongoing' }); load() }
    catch { toast.error('Failed') }
    setSaving(false)
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Trips" subtitle={`${trips.filter(t=>t.status==='ongoing').length} ongoing`}
        action={<button onClick={() => setModal(true)} className="btn-gold"><Plus size={16} />New Trip</button>}
      />
      <div className="table-container">
        <table>
          <thead><tr><th>Date</th><th>Vehicle</th><th>Driver</th><th>From</th><th>To</th><th>Distance</th><th>Status</th></tr></thead>
          <tbody>
            {trips.map(t => (
              <tr key={t.id}>
                <td className="text-gray-400">{t.trip_date}</td>
                <td className="text-gold-400 font-mono">{t.vehicle?.registration_number || '—'}</td>
                <td>{t.driver?.name || '—'}</td>
                <td className="text-gray-400 max-w-32 truncate">{t.from_location}</td>
                <td className="text-gray-400 max-w-32 truncate">{t.to_location || '—'}</td>
                <td className="text-gray-400">{t.distance_km ? `${t.distance_km} km` : '—'}</td>
                <td><StatusBadge status={t.status} /></td>
              </tr>
            ))}
            {trips.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No trips</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Trip" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Date *</label><input type="date" className="input" required value={form.trip_date} onChange={e=>setForm({...form,trip_date:e.target.value})} /></div>
            <div><label className="label">Driver</label><select className="select" value={form.driver_id||''} onChange={e=>setForm({...form,driver_id:e.target.value})}><option value="">Select</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="label">Vehicle</label><select className="select" value={form.vehicle_id||''} onChange={e=>setForm({...form,vehicle_id:e.target.value})}><option value="">Select</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.registration_number}</option>)}</select></div>
            <div><label className="label">Purpose</label><input className="input" value={form.purpose||''} onChange={e=>setForm({...form,purpose:e.target.value})} /></div>
            <div><label className="label">From Location *</label><input className="input" required value={form.from_location||''} onChange={e=>setForm({...form,from_location:e.target.value})} /></div>
            <div><label className="label">To Location</label><input className="input" value={form.to_location||''} onChange={e=>setForm({...form,to_location:e.target.value})} /></div>
            <div><label className="label">Odometer Start</label><input type="number" className="input" value={form.odometer_start||''} onChange={e=>setForm({...form,odometer_start:e.target.value})} /></div>
          </div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={()=>setModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">Create Trip</button></div>
        </form>
      </Modal>
    </div>
  )
}

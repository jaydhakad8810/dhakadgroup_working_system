import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal, ConfirmDialog } from '../../components/ui'
import { PhotoUpload, DocUpload } from '../../components/ui/PhotoUpload'
import { Plus, Trash2, Edit, Eye } from 'lucide-react'
import { Plus, Trash2, Edit, ChevronRight } from 'lucide-react'

export default function Drivers() {
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('drivers')
  const [driverModal, setDriverModal] = useState(false)
  const [vehicleModal, setVehicleModal] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [driverForm, setDriverForm] = useState({})
  const [vehicleForm, setVehicleForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const df = (k, v) => setDriverForm(p => ({ ...p, [k]: v }))
  const vf = (k, v) => setVehicleForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try { const [d, v] = await Promise.all([api.get('/drivers'), api.get('/drivers/vehicles/all')]); setDrivers(d.data); setVehicles(v.data) }
    catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openAddDriver  = () => { setEditingDriver(null); setDriverForm({}); setDriverModal(true) }
  const openEditDriver = (d) => { setEditingDriver(d.id); setDriverForm({ ...d }); setDriverModal(true) }
  const openAddVehicle  = () => { setEditingVehicle(null); setVehicleForm({}); setVehicleModal(true) }
  const openEditVehicle = (v) => { setEditingVehicle(v.id); setVehicleForm({ ...v }); setVehicleModal(true) }

  const handleDriver = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editingDriver) { await api.put(`/drivers/${editingDriver}`, driverForm); toast.success('Updated') }
      else { await api.post('/drivers', driverForm); toast.success('Driver added') }
      setDriverModal(false); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const handleVehicle = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editingVehicle) { await api.put(`/drivers/vehicles/${editingVehicle}`, vehicleForm); toast.success('Updated') }
      else { await api.post('/drivers/vehicles', vehicleForm); toast.success('Vehicle added') }
      setVehicleModal(false); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Drivers & Vehicles"
        action={<div className="flex gap-2">
          {tab === 'drivers' && <button onClick={openAddDriver} className="btn-gold"><Plus size={16} />Add Driver</button>}
          {tab === 'vehicles' && <button onClick={openAddVehicle} className="btn-gold"><Plus size={16} />Add Vehicle</button>}
        </div>}
      />
      <div className="flex gap-1 bg-dark-800 rounded-lg p-1 w-fit">
        {['drivers', 'vehicles'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${tab === t ? 'bg-gold-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>
            {t === 'drivers' ? `Drivers (${drivers.length})` : `Vehicles (${vehicles.length})`}
          </button>
        ))}
      </div>

      {tab === 'drivers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers.map(d => (
            <div key={d.id} className="card cursor-pointer hover:border-gold-500/40 transition-all" onClick={() => navigate(`/drivers/${d.id}`)}>
              <div className="flex items-center gap-3 mb-3">
                {d.photo ? <img src={d.photo} className="w-12 h-12 rounded-xl object-cover border border-dark-600" />
                  : <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-lg">{d.name[0]}</div>}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{d.name}</h3>
                  <p className="text-gray-400 text-sm">{d.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={d.is_active ? 'badge-green' : 'badge-red'}>{d.is_active ? 'Active' : 'Off'}</span>
                  {d.is_busy && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-semibold">● Busy</span>}
                </div>
              </div>
              <div className="text-sm text-gray-400 space-y-1 mb-3">
                {d.license_number && <p>🪪 {d.license_number} (exp: {d.license_expiry})</p>}
                {d.daily_wage && <p>💰 ₹{parseFloat(d.daily_wage).toLocaleString('en-IN')}/day</p>}
                {d.aadhar_number && <p>🆔 {d.aadhar_number}</p>}
                <p>🚗 {d.vehicles?.length || 0} vehicle(s)</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/drivers/${d.id}`)} className="btn-ghost flex-1 justify-center text-sm py-1.5 text-blue-400"><Eye size={14} />Details</button>
                <button onClick={() => openEditDriver(d)} className="btn-outline flex-1 justify-center text-sm py-1.5"><Edit size={14} />Edit</button>
                <button onClick={e => { e.stopPropagation(); openEditDriver(d) }} className="btn-outline flex-1 justify-center text-sm py-1.5"><Edit size={14} />Edit</button>
                <button onClick={e => { e.stopPropagation(); navigate(`/drivers/${d.id}`) }} className="btn-ghost px-2 py-1.5 text-gold-400"><ChevronRight size={16} /></button>
              </div>
            </div>
          ))}
          {!drivers.length && <p className="col-span-3 text-center text-gray-500 py-16">No drivers</p>}
        </div>
      )}

      {tab === 'vehicles' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Registration</th><th>Type</th><th>Make/Model</th><th>Driver</th><th>Odometer</th><th>Insurance</th><th></th></tr></thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id}>
                  <td className="font-mono text-gold-400 font-medium">{v.registration_number}</td>
                  <td className="text-gray-400">{v.type || '—'}</td>
                  <td>{v.make} {v.model} {v.year}</td>
                  <td className="text-gray-400">{v.driver?.name || 'Unassigned'}</td>
                  <td className="text-gray-400">{v.current_odometer?.toLocaleString('en-IN')} km</td>
                  <td className={v.insurance_expiry && new Date(v.insurance_expiry) < new Date() ? 'text-red-400' : 'text-gray-400'}>{v.insurance_expiry || '—'}</td>
                  <td><button onClick={() => openEditVehicle(v)} className="btn-ghost px-2 py-1 text-gold-400"><Edit size={14} /></button></td>
                </tr>
              ))}
              {!vehicles.length && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No vehicles</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Driver Modal */}
      <Modal open={driverModal} onClose={() => setDriverModal(false)} title={editingDriver ? 'Edit Driver' : 'Add Driver'} size="xl">
        <form onSubmit={handleDriver} className="space-y-5">
          <div className="flex justify-center">
            <div className="text-center">
              <PhotoUpload value={driverForm.photo} onChange={v => df('photo', v)} folder="dgsystem/drivers" label="Photo" />
              <p className="text-gray-500 text-xs mt-1">Driver photo</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Name *</label><input className="input" required value={driverForm.name || ''} onChange={e => df('name', e.target.value)} /></div>
            <div><label className="label">Phone</label><input className="input" value={driverForm.phone || ''} onChange={e => df('phone', e.target.value)} /></div>
            <div><label className="label">Daily Wage (₹)</label><input type="number" className="input" value={driverForm.daily_wage || ''} onChange={e => df('daily_wage', e.target.value)} /></div>
            <div><label className="label">Aadhar Number</label><input className="input" value={driverForm.aadhar_number || ''} onChange={e => df('aadhar_number', e.target.value)} /></div>
            <div><label className="label">Emergency Contact</label><input className="input" value={driverForm.emergency_contact || ''} onChange={e => df('emergency_contact', e.target.value)} /></div>
            <div className="col-span-2"><label className="label">Address</label><textarea className="input" rows={2} value={driverForm.address || ''} onChange={e => df('address', e.target.value)} /></div>
          </div>

          <div className="border-t border-dark-700 pt-4">
            <p className="text-white font-medium mb-3">License</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">License Number</label><input className="input" value={driverForm.license_number || ''} onChange={e => df('license_number', e.target.value)} /></div>
              <div><label className="label">License Expiry</label><input type="date" className="input" value={driverForm.license_expiry || ''} onChange={e => df('license_expiry', e.target.value)} /></div>
            </div>
          </div>

          <div className="border-t border-dark-700 pt-4">
            <p className="text-white font-medium mb-3">Bank Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Account Number</label><input className="input" value={driverForm.bank_account || ''} onChange={e => df('bank_account', e.target.value)} /></div>
              <div><label className="label">IFSC</label><input className="input" value={driverForm.bank_ifsc || ''} onChange={e => df('bank_ifsc', e.target.value)} /></div>
              <div className="col-span-2"><label className="label">Bank Name</label><input className="input" value={driverForm.bank_name || ''} onChange={e => df('bank_name', e.target.value)} /></div>
            </div>
          </div>

          <div className="flex gap-3 justify-end"><button type="button" onClick={() => setDriverModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : editingDriver ? 'Save' : 'Add Driver'}</button></div>
        </form>
      </Modal>

      {/* Vehicle Modal */}
      <Modal open={vehicleModal} onClose={() => setVehicleModal(false)} title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'} size="lg">
        <form onSubmit={handleVehicle} className="space-y-4">
          <div className="col-span-2"><label className="label">Registration Number *</label><input className="input" required value={vehicleForm.registration_number || ''} onChange={e => vf('registration_number', e.target.value.toUpperCase())} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Type</label><input className="input" placeholder="Truck, JCB, Tipper..." value={vehicleForm.type || ''} onChange={e => vf('type', e.target.value)} /></div>
            <div><label className="label">Make</label><input className="input" value={vehicleForm.make || ''} onChange={e => vf('make', e.target.value)} /></div>
            <div><label className="label">Model</label><input className="input" value={vehicleForm.model || ''} onChange={e => vf('model', e.target.value)} /></div>
            <div><label className="label">Year</label><input type="number" className="input" value={vehicleForm.year || ''} onChange={e => vf('year', e.target.value)} /></div>
            <div><label className="label">Insurance Expiry</label><input type="date" className="input" value={vehicleForm.insurance_expiry || ''} onChange={e => vf('insurance_expiry', e.target.value)} /></div>
          </div>

          <div className="border-t border-dark-700 pt-4">
            <p className="text-white font-medium mb-3">Documents</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">RC Book Photo</label><DocUpload value={vehicleForm.rc_photo} onChange={v => vf('rc_photo', v)} folder="dgsystem/vehicles" label="Upload RC" /></div>
              <div><label className="label">Insurance Photo</label><DocUpload value={vehicleForm.insurance_photo} onChange={v => vf('insurance_photo', v)} folder="dgsystem/vehicles" label="Upload insurance" /></div>
            </div>
          </div>

          <div className="flex gap-3 justify-end"><button type="button" onClick={() => setVehicleModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : editingVehicle ? 'Save' : 'Add Vehicle'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

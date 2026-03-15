import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2, MapPin, Fuel, DollarSign } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, StatusBadge, InfoRow, Modal } from '../../components/ui'

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completeModal, setCompleteModal] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [form, setForm] = useState({ odometer_end: '', fuel_cost: '', other_expenses: '', notes: '' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = () => {
    api.get(`/trips/${id}`).then(r => { setTrip(r.data); setForm(p => ({ ...p, odometer_end: r.data.odometer_end || '' })) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  const getLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`
      setTrip(p => ({ ...p, to_location: loc }))
      toast.success('Current location captured')
    }, () => toast.error('GPS unavailable'))
  }

  const handleComplete = async (e) => {
    e.preventDefault()
    setCompleting(true)
    try {
      await api.patch(`/trips/${id}/complete`, form)
      toast.success('Trip completed! 🎉')
      setCompleteModal(false); load()
    } catch { toast.error('Failed to complete trip') }
    setCompleting(false)
  }

  if (loading) return <LoadingPage />
  if (!trip) return <div className="page-content text-gray-400">Trip not found</div>

  const distance = trip.odometer_end && trip.odometer_start ? trip.odometer_end - trip.odometer_start : trip.distance_km
  const totalCost = parseFloat(trip.fuel_cost || 0) + parseFloat(trip.other_expenses || 0)

  return (
    <div className="page-content space-y-4">
      {/* Status banner */}
      <div className={`p-4 rounded-2xl border ${trip.status === 'ongoing' ? 'bg-green-500/10 border-green-500/20' : trip.status === 'completed' ? 'bg-primary-500/10 border-primary-500/20' : 'bg-gray-500/10 border-gray-500/20'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg">{trip.from_location}</p>
            <p className="text-gray-400">→ {trip.to_location || 'In progress...'}</p>
          </div>
          <StatusBadge status={trip.status} />
        </div>
        {distance && <p className="text-primary-400 font-semibold mt-2">{distance} km</p>}
      </div>

      {/* Complete Trip button */}
      {trip.status === 'ongoing' && (
        <button onClick={() => setCompleteModal(true)} className="btn-success w-full py-4">
          <CheckCircle size={18} /> Complete Trip
        </button>
      )}

      {/* Trip Info */}
      <div className="card space-y-0">
        <h3 className="text-white font-semibold mb-3">Trip Details</h3>
        <InfoRow label="Date" value={trip.trip_date} />
        <InfoRow label="Vehicle" value={trip.vehicle?.registration_number} valueClass="text-primary-400" />
        <InfoRow label="Purpose" value={trip.purpose} />
        <InfoRow label="Odometer Start" value={trip.odometer_start ? `${trip.odometer_start?.toLocaleString()} km` : null} />
        <InfoRow label="Odometer End" value={trip.odometer_end ? `${trip.odometer_end?.toLocaleString()} km` : null} />
        <InfoRow label="Distance" value={distance ? `${distance} km` : null} valueClass="text-primary-400" />
      </div>

      {/* Costs */}
      {(trip.fuel_cost > 0 || trip.other_expenses > 0) && (
        <div className="card space-y-0">
          <h3 className="text-white font-semibold mb-3">Expenses</h3>
          <InfoRow label="Fuel Cost" value={`₹${parseFloat(trip.fuel_cost).toLocaleString('en-IN')}`} valueClass="text-orange-400" />
          <InfoRow label="Other Expenses" value={`₹${parseFloat(trip.other_expenses).toLocaleString('en-IN')}`} valueClass="text-red-400" />
          <InfoRow label="Total" value={`₹${totalCost.toLocaleString('en-IN')}`} valueClass="text-white font-bold" />
        </div>
      )}

      {trip.notes && (
        <div className="card">
          <p className="text-gray-400 text-sm mb-1">Notes</p>
          <p className="text-white text-sm">{trip.notes}</p>
        </div>
      )}

      {/* Complete Trip Modal */}
      <Modal open={completeModal} onClose={() => setCompleteModal(false)} title="Complete Trip">
        <form onSubmit={handleComplete} className="space-y-4">
          <div className="p-3 bg-surface-400 rounded-xl">
            <p className="text-gray-400 text-xs">Trip started at</p>
            <p className="text-white font-medium">{trip.from_location}</p>
            <p className="text-gray-400 text-xs mt-1">Odometer start: {trip.odometer_start} km</p>
          </div>

          <div>
            <label className="label">Ending Odometer (km) *</label>
            <input type="number" className="input" required value={form.odometer_end}
              onChange={e => f('odometer_end', e.target.value)}
              placeholder={`Must be > ${trip.odometer_start}`}
              min={trip.odometer_start} />
            {form.odometer_end && trip.odometer_start && (
              <p className="text-primary-400 text-xs mt-1">Distance: {form.odometer_end - trip.odometer_start} km</p>
            )}
          </div>

          <div>
            <label className="label">To Location</label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Final destination" value={trip.to_location || ''}
                onChange={e => setTrip(p => ({ ...p, to_location: e.target.value }))} />
              <button type="button" onClick={getLocation} className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 flex-shrink-0 active:scale-95">
                <MapPin size={20} />
              </button>
            </div>
          </div>

          <div>
            <label className="label">Fuel Cost (₹)</label>
            <input type="number" className="input" placeholder="0" value={form.fuel_cost} onChange={e => f('fuel_cost', e.target.value)} />
          </div>

          <div>
            <label className="label">Other Expenses (₹)</label>
            <input type="number" className="input" placeholder="Tolls, parking, etc." value={form.other_expenses} onChange={e => f('other_expenses', e.target.value)} />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} placeholder="Any remarks..." value={form.notes} onChange={e => f('notes', e.target.value)} />
          </div>

          <button type="submit" disabled={completing} className="btn-success w-full py-4">
            {completing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {completing ? 'Completing...' : 'Mark as Completed'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

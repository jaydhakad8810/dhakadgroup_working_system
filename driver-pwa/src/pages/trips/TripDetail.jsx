import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2, MapPin, Camera } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, StatusBadge, InfoRow, Modal } from '../../components/ui'

// Inline photo upload for driver PWA
function PhotoUploadInline({ value, onChange, label }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'dgsystem/trips')
      const r = await api.post('/upload/single', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onChange(r.data.url)
      toast.success('Photo uploaded')
    } catch { toast.error('Upload failed') }
    setUploading(false)
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      {value ? (
        <div className="relative">
          <img src={value} className="w-full h-36 object-cover rounded-xl" alt="Uploaded" />
          <button type="button" onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
            Retake
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-28 rounded-xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-400 active:scale-95 transition-transform">
          {uploading ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
          <span className="text-sm">{uploading ? 'Uploading...' : label || 'Take Photo'}</span>
        </button>
      )}
    </div>
  )
}

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [completeModal, setCompleteModal] = React.useState(false)
  const [completing, setCompleting] = React.useState(false)
  const [pickupForm, setPickupForm] = React.useState({ pickup_photo: '', notes: '' })
  const [deliverForm, setDeliverForm] = React.useState({ delivery_photo: '', notes: '' })
  const [submitting, setSubmitting] = React.useState(false)
  const [form, setForm] = React.useState({ odometer_end: '', fuel_cost: '', other_expenses: '', notes: '' })
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

  const handlePickup = async () => {
    if (!pickupForm.pickup_photo) return toast.error('Pickup photo required')
    setSubmitting(true)
    try {
      await api.patch(`/trips/${id}/pickup`, pickupForm)
      toast.success('Pickup confirmed! Stock deducted from godown.')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setSubmitting(false)
  }

  const handleDeliver = async () => {
    if (!deliverForm.delivery_photo) return toast.error('Delivery photo required')
    setSubmitting(true)
    try {
      await api.patch(`/trips/${id}/deliver`, deliverForm)
      toast.success('Delivery confirmed! Supervisor will verify receipt.')
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setSubmitting(false)
  }

  if (loading) return <LoadingPage />
  if (!trip) return <div className="page-content text-gray-400">Trip not found</div>

  const distance = trip.odometer_end && trip.odometer_start ? trip.odometer_end - trip.odometer_start : trip.distance_km
  const totalCost = parseFloat(trip.fuel_cost || 0) + parseFloat(trip.other_expenses || 0)
  const isGodownTrip = trip.trip_type && trip.trip_type !== 'regular'

  return (
    <div className="page-content space-y-4">
      {/* Master Card Number (for godown trips) */}
      {trip.master_card_number && (
        <div className="p-4 rounded-2xl border border-gold-500/30 bg-gold-500/5 text-center">
          <p className="text-gray-400 text-xs uppercase tracking-wider">Master Card</p>
          <p className="text-gold-400 font-bold text-2xl font-mono">{trip.master_card_number}</p>
          {trip.trip_type && <span className="badge-blue capitalize mt-1 inline-block">{trip.trip_type}</span>}
        </div>
      )}

      {/* Status banner */}
      <div className={`p-4 rounded-2xl border ${trip.status === 'ongoing' || trip.status === 'in_progress' ? 'bg-green-500/10 border-green-500/20' : trip.status === 'completed' ? 'bg-primary-500/10 border-primary-500/20' : 'bg-gray-500/10 border-gray-500/20'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg">{trip.from_location}</p>
            <p className="text-gray-400">→ {trip.to_location || 'In progress...'}</p>
          </div>
          <StatusBadge status={trip.status} />
        </div>
        {distance && <p className="text-primary-400 font-semibold mt-2">{distance} km</p>}
      </div>

      {/* Material info for godown trips */}
      {trip.material_name && (
        <div className="card space-y-0">
          <h3 className="text-white font-semibold mb-3">Material Details</h3>
          <InfoRow label="Material" value={trip.material_name} />
          <InfoRow label="Quantity" value={trip.material_quantity ? `${trip.material_quantity} ${trip.material_unit || ''}` : null} valueClass="text-gold-400" />
        </div>
      )}

      {/* PENDING: Confirm Pickup */}
      {trip.status === 'pending' && (
        <div className="card space-y-3 border border-blue-500/30">
          <h3 className="text-white font-semibold flex items-center gap-2"><Camera size={18} className="text-blue-400" />Confirm Pickup</h3>
          <p className="text-gray-400 text-sm">Take a photo of the stock you are picking up.</p>
          <div>
            <label className="label">Pickup Photo *</label>
            <PhotoUploadInline value={pickupForm.pickup_photo} onChange={v => setPickupForm(p => ({ ...p, pickup_photo: v }))} folder="dgsystem/trips" label="Capture pickup photo" />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} value={pickupForm.notes} onChange={e => setPickupForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any remarks about the pickup" />
          </div>
          <button onClick={handlePickup} disabled={submitting || !pickupForm.pickup_photo} className="btn-primary w-full py-4">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {submitting ? 'Confirming...' : 'I have picked up the stock ✓'}
          </button>
        </div>
      )}

      {/* IN PROGRESS: Confirm Delivery */}
      {trip.status === 'in_progress' && (
        <div className="card space-y-3 border border-orange-500/30">
          <h3 className="text-white font-semibold flex items-center gap-2"><Camera size={18} className="text-orange-400" />Confirm Delivery</h3>
          <p className="text-gray-400 text-sm">Take a photo after delivering to {trip.to_location}.</p>
          {trip.to_location && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.to_location)}`}
               target="_blank" rel="noreferrer"
               className="text-blue-400 text-sm flex items-center gap-1 hover:underline">
              <MapPin size={14} />Open Destination in Maps
            </a>
          )}
          <div>
            <label className="label">Delivery Photo *</label>
            <PhotoUploadInline value={deliverForm.delivery_photo} onChange={v => setDeliverForm(p => ({ ...p, delivery_photo: v }))} folder="dgsystem/trips" label="Capture delivery photo" />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" rows={2} value={deliverForm.notes} onChange={e => setDeliverForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any remarks about the delivery" />
          </div>
          <button onClick={handleDeliver} disabled={submitting || !deliverForm.delivery_photo} className="btn-success w-full py-4">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {submitting ? 'Confirming...' : `Delivered to ${trip.to_location || 'destination'} ✓`}
          </button>
        </div>
      )}

      {/* Regular ongoing trip */}
      {trip.status === 'ongoing' && !isGodownTrip && (
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
        {trip.odometer_start && <InfoRow label="Odometer Start" value={`${trip.odometer_start?.toLocaleString()} km`} />}
        {trip.odometer_end && <InfoRow label="Odometer End" value={`${trip.odometer_end?.toLocaleString()} km`} />}
        {distance && <InfoRow label="Distance" value={`${distance} km`} valueClass="text-primary-400" />}
      </div>

      {/* Trip Timeline */}
      <div className="card">
        <h3 className="text-white font-semibold mb-3">Timeline</h3>
        <div className="space-y-2">
          {[
            { label: 'Trip Created', done: true, time: trip.createdAt },
            { label: 'Stock Picked Up', done: !!trip.pickup_confirmed_at, time: trip.pickup_confirmed_at },
            { label: 'Delivered', done: !!trip.delivery_confirmed_at, time: trip.delivery_confirmed_at },
            { label: 'Supervisor Confirmed', done: trip.status === 'completed', time: null },
          ].map(step => (
            <div key={step.label} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${step.done ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                {step.done ? '✓' : '○'}
              </div>
              <div>
                <p className={`text-sm ${step.done ? 'text-white' : 'text-gray-500'}`}>{step.label}</p>
                {step.time && <p className="text-gray-500 text-xs">{new Date(step.time).toLocaleString('en-IN')}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photos */}
      {(trip.pickup_photo || trip.delivery_photo) && (
        <div className="card">
          <h3 className="text-white font-semibold mb-3">Photos</h3>
          <div className="grid grid-cols-2 gap-3">
            {trip.pickup_photo && (
              <div>
                <p className="text-gray-400 text-xs mb-1">Pickup</p>
                <img src={trip.pickup_photo} className="w-full h-28 object-cover rounded-xl" alt="Pickup" />
              </div>
            )}
            {trip.delivery_photo && (
              <div>
                <p className="text-gray-400 text-xs mb-1">Delivery</p>
                <img src={trip.delivery_photo} className="w-full h-28 object-cover rounded-xl" alt="Delivery" />
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Complete Trip Modal (for regular trips) */}
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

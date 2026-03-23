import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, MapPin, Camera } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function NewTrip() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState([])
  const [driverInfo, setDriverInfo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [startPhotoUrl, setStartPhotoUrl] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoRef = useRef()
  const [form, setForm] = useState({
    trip_date: new Date().toISOString().split('T')[0],
    from_location: '',
    to_location: '',
    purpose: '',
    odometer_start: '',
  })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleStartPhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'dgsystem/trips')
      const r = await api.post('/upload/single', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setStartPhotoUrl(r.data.url)
      toast.success('Start photo uploaded')
    } catch { toast.error('Photo upload failed') }
    setUploadingPhoto(false)
  }

  useEffect(() => {
    api.get('/dashboard/driver').then(r => {
      setDriverInfo(r.data.driver)
      if (r.data.driver?.vehicles?.length) {
        setVehicles(r.data.driver.vehicles)
        f('vehicle_id', r.data.driver.vehicles[0].id)
        f('driver_id', r.data.driver.id)
        f('odometer_start', r.data.driver.vehicles[0].current_odometer || '')
      }
    }).catch(() => {})
  }, [])

  const getLocation = () => {
    if (!navigator.geolocation) return toast.error('GPS not available')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`
        f('from_location', loc)
        toast.success('Location captured')
      },
      () => toast.error('Could not get location')
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.from_location) return toast.error('From location is required')
    setSaving(true)
    try {
      const trip = await api.post('/trips', { ...form, status: 'ongoing', pickup_photo: startPhotoUrl || null })
      toast.success('Trip started!')
      navigate(`/trips/${trip.data.id}`)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setSaving(false)
  }

  return (
    <div className="page-content space-y-4">
      <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl">
        <p className="text-primary-400 font-semibold text-sm">Starting New Trip</p>
        <p className="text-gray-400 text-xs mt-0.5">Fill in the details to begin tracking</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {vehicles.length > 1 && (
          <div>
            <label className="label">Vehicle</label>
            <select className="select" value={form.vehicle_id || ''} onChange={e => f('vehicle_id', e.target.value)}>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} — {v.type}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={form.trip_date} onChange={e => f('trip_date', e.target.value)} />
        </div>

        <div>
          <label className="label">From Location *</label>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Starting point" value={form.from_location} onChange={e => f('from_location', e.target.value)} required />
            <button type="button" onClick={getLocation} className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 active:scale-95 transition-transform flex-shrink-0">
              <MapPin size={20} />
            </button>
          </div>
        </div>

        <div>
          <label className="label">To Location</label>
          <input className="input" placeholder="Destination (optional at start)" value={form.to_location} onChange={e => f('to_location', e.target.value)} />
        </div>

        <div>
          <label className="label">Purpose</label>
          <input className="input" placeholder="e.g. Material delivery, Site visit" value={form.purpose} onChange={e => f('purpose', e.target.value)} />
        </div>

        <div>
          <label className="label">Starting Odometer (km)</label>
          <input type="number" className="input" placeholder="Current odometer reading" value={form.odometer_start} onChange={e => f('odometer_start', e.target.value)} />
        </div>

        <div>
          <label className="label">Start Photo (Odometer / Vehicle)</label>
          <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleStartPhoto} />
          {startPhotoUrl ? (
            <div className="relative">
              <img src={startPhotoUrl} className="w-full h-32 object-cover rounded-xl" alt="Start" />
              <button type="button" onClick={() => photoRef.current?.click()}
                className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">Retake</button>
            </div>
          ) : (
            <button type="button" onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
              className="w-full h-24 rounded-xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-400 active:scale-95 transition-transform">
              {uploadingPhoto ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
              <span className="text-sm">{uploadingPhoto ? 'Uploading...' : 'Take Start Photo'}</span>
            </button>
          )}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full py-4">
          {saving ? <Loader2 size={18} className="animate-spin" /> : null}
          {saving ? 'Starting...' : '🚛 Start Trip'}
        </button>
      </form>
    </div>
  )
}

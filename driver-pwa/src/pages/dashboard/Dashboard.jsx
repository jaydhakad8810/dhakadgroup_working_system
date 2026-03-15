import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Route, Truck, CheckCircle, Clock, Plus, ChevronRight } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/dashboard/driver').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingPage />

  const driver = data?.driver
  const ongoingTrip = data?.ongoingTrip
  const todayTrips = data?.todayTrips || []
  const totalTrips = data?.totalTrips || 0

  return (
    <div className="page-content space-y-5">
      {/* Greeting card */}
      <div className="card bg-gradient-to-br from-primary-600/20 to-surface-300 border-primary-500/20">
        <p className="text-gray-400 text-sm">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h2 className="text-white font-bold text-xl">{user?.name}</h2>
        <p className="text-primary-400 text-sm mt-0.5">Driver · {driver?.license_number || 'No license on file'}</p>
      </div>

      {/* Ongoing Trip Alert */}
      {ongoingTrip && (
        <button onClick={() => navigate(`/trips/${ongoingTrip.id}`)}
          className="w-full p-4 bg-green-500/10 border border-green-500/30 rounded-2xl text-left active:scale-95 transition-transform">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-green-400 font-semibold text-sm">Trip In Progress</p>
              <p className="text-white font-medium">{ongoingTrip.from_location} → {ongoingTrip.to_location || '...'}</p>
              <p className="text-gray-400 text-xs">{ongoingTrip.vehicle?.registration_number}</p>
            </div>
            <ChevronRight size={16} className="text-green-400" />
          </div>
        </button>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Today Trips', value: todayTrips.length, icon: Route, color: 'text-primary-400', bg: 'bg-primary-500/20' },
          { label: 'Total Trips', value: totalTrips, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
          { label: 'Vehicles', value: driver?.vehicles?.length || 0, icon: Truck, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'Status', value: ongoingTrip ? 'On Trip' : 'Available', icon: Clock, color: ongoingTrip ? 'text-green-400' : 'text-gray-400', bg: ongoingTrip ? 'bg-green-500/20' : 'bg-gray-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}><Icon size={18} className={color} /></div>
            <div><p className="text-gray-400 text-xs">{label}</p><p className="text-white font-bold text-lg">{value}</p></div>
          </div>
        ))}
      </div>

      {/* New Trip button */}
      {!ongoingTrip && (
        <button onClick={() => navigate('/trip/new')} className="btn-primary w-full py-4">
          <Plus size={18} /> Start New Trip
        </button>
      )}

      {/* Today's Trips */}
      {todayTrips.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Today's Trips</h3>
            <button onClick={() => navigate('/trips')} className="text-primary-400 text-sm flex items-center gap-1">All <ChevronRight size={14} /></button>
          </div>
          <div className="space-y-2">
            {todayTrips.map(t => (
              <button key={t.id} onClick={() => navigate(`/trips/${t.id}`)}
                className="card w-full text-left active:scale-95 transition-transform">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-medium">{t.from_location}</p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-gray-400 text-sm">→ {t.to_location || 'In progress'}</p>
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  <span>{t.vehicle?.registration_number}</span>
                  {t.distance_km && <span>{t.distance_km} km</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vehicle info */}
      {driver?.vehicles?.length > 0 && (
        <button onClick={() => navigate('/vehicle')} className="card w-full text-left active:scale-95 transition-transform">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0">
              <Truck size={22} className="text-primary-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">{driver.vehicles[0].registration_number}</p>
              <p className="text-gray-400 text-sm">{driver.vehicles[0].make} {driver.vehicles[0].model} · {driver.vehicles[0].type}</p>
              <p className="text-gray-500 text-xs">{driver.vehicles[0].current_odometer?.toLocaleString()} km odometer</p>
            </div>
            <ChevronRight size={16} className="text-gray-600" />
          </div>
        </button>
      )}
    </div>
  )
}

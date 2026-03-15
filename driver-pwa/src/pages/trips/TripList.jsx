import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Route } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, EmptyState, StatusBadge } from '../../components/ui'

export default function TripList() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const params = filter ? `?status=${filter}` : ''
    api.get(`/trips${params}`).then(r => setTrips(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [filter])

  return (
    <div className="page-content space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[['', 'All'], ['ongoing', 'Ongoing'], ['completed', 'Completed'], ['cancelled', 'Cancelled']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${filter === val ? 'bg-primary-500 text-white' : 'bg-surface-300 text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      <button onClick={() => navigate('/trip/new')} className="btn-primary w-full">
        <Plus size={18} /> Start New Trip
      </button>

      {loading ? <LoadingPage /> : (
        <div className="space-y-2">
          {trips.map(t => (
            <button key={t.id} onClick={() => navigate(`/trips/${t.id}`)}
              className="card w-full text-left active:scale-95 transition-transform">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <p className="text-white font-semibold">{t.from_location}</p>
                  <p className="text-gray-400 text-sm">→ {t.to_location || 'Destination TBD'}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>📅 {t.trip_date}</span>
                <span>🚗 {t.vehicle?.registration_number || '—'}</span>
                {t.distance_km && <span>📍 {t.distance_km} km</span>}
                {t.fuel_cost > 0 && <span>⛽ ₹{parseFloat(t.fuel_cost).toLocaleString('en-IN')}</span>}
              </div>
              {t.purpose && <p className="text-gray-600 text-xs mt-1 truncate">{t.purpose}</p>}
            </button>
          ))}
          {trips.length === 0 && <EmptyState icon={Route} title="No trips" message="Start a new trip to get going" action={<button onClick={() => navigate('/trip/new')} className="btn-primary">Start Trip</button>} />}
        </div>
      )}
    </div>
  )
}

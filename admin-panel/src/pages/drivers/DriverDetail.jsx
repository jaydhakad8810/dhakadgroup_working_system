import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LoadingPage } from '../../components/ui'
import { ArrowLeft, Phone, CreditCard, Truck, DollarSign, TrendingUp } from 'lucide-react'
import api from '../../utils/api'

const TABS = ['Overview', 'Trips', 'Vehicles', 'Expenses']

export default function DriverDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [driver, setDriver] = useState(null)
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')

  useEffect(() => {
    const load = async () => {
      try {
        const [d, t, v, e] = await Promise.all([
          api.get(`/drivers/${id}`),
          api.get(`/trips?driver_id=${id}`),
          api.get(`/drivers/${id}/vehicles`).catch(() => ({ data: [] })),
          api.get(`/expenses?driver_id=${id}`).catch(() => ({ data: [] })),
        ])
        setDriver(d.data)
        setTrips(t.data || [])
        setVehicles(v.data || [])
        setExpenses(e.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <LoadingPage />
  if (!driver) return <div className="text-center py-16 text-gray-500">Driver not found</div>

  const totalTrips = trips.length
  const totalDistance = trips.reduce((sum, t) => sum + (t.distance_km || 0), 0)
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date || e.createdAt)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const totalExpenseAmt = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/drivers')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white">Driver Profile</h1>
      </div>

      <div className="card">
        <div className="flex items-center gap-4">
          {driver.photo
            ? <img src={driver.photo} className="w-20 h-20 rounded-2xl object-cover border border-dark-600" alt={driver.name} />
            : <div className="w-20 h-20 rounded-2xl bg-gold-500/20 flex items-center justify-center text-gold-400 text-3xl font-bold border border-gold-500/20">{driver.name?.[0]}</div>
          }
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white">{driver.name}</h2>
            <div className="flex gap-2 mt-1 flex-wrap text-sm text-gray-400">
              {driver.phone && <span className="flex items-center gap-1"><Phone size={13} />{driver.phone}</span>}
              {driver.license_number && <span className="flex items-center gap-1"><CreditCard size={13} />{driver.license_number}</span>}
            </div>
            <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${driver.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
              {driver.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <Truck size={20} className="mx-auto mb-1 text-gold-400" />
          <p className="font-bold text-2xl text-gold-400">{totalTrips}</p>
          <p className="text-gray-500 text-xs mt-0.5">Total Trips</p>
        </div>
        <div className="card text-center">
          <TrendingUp size={20} className="mx-auto mb-1 text-gold-400" />
          <p className="font-bold text-2xl text-gold-400">{totalDistance.toFixed(0)} km</p>
          <p className="text-gray-500 text-xs mt-0.5">Total Distance</p>
        </div>
        <div className="card text-center">
          <DollarSign size={20} className="mx-auto mb-1 text-gold-400" />
          <p className="font-bold text-2xl text-gold-400">Rs.{totalExpenseAmt.toLocaleString('en-IN')}</p>
          <p className="text-gray-500 text-xs mt-0.5">This Month Expenses</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-dark-700">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-gold-400 text-gold-400' : 'border-transparent text-gray-500 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-white">Driver Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500">Name</p><p className="text-white">{driver.name}</p></div>
            <div><p className="text-gray-500">Phone</p><p className="text-white">{driver.phone || '—'}</p></div>
            <div><p className="text-gray-500">License</p><p className="text-white">{driver.license_number || '—'}</p></div>
            <div><p className="text-gray-500">Daily Wage</p><p className="text-white">{driver.daily_wage ? `Rs.${driver.daily_wage}` : '—'}</p></div>
          </div>
        </div>
      )}

      {tab === 'Trips' && (
        <div className="space-y-3">
          {trips.length === 0
            ? <p className="text-gray-500 text-center py-8">No trips found</p>
            : trips.map(t => (
              <div key={t.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{t.from_location} to {t.to_location}</p>
                  <p className="text-xs text-gray-500">{t.trip_date} · {t.distance_km || 0} km</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${t.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                  {t.status}
                </span>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'Vehicles' && (
        <div className="space-y-3">
          {vehicles.length === 0
            ? <p className="text-gray-500 text-center py-8">No vehicles assigned</p>
            : vehicles.map(v => (
              <div key={v.id} className="card">
                <p className="text-sm font-medium text-white">{v.name || v.registration_number}</p>
                <p className="text-xs text-gray-500">{v.type} · {v.registration_number}</p>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'Expenses' && (
        <div className="space-y-3">
          {expenses.length === 0
            ? <p className="text-gray-500 text-center py-8">No expenses found</p>
            : expenses.map(e => (
              <div key={e.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{e.description || e.category || 'Expense'}</p>
                  <p className="text-xs text-gray-500">{e.category} · {e.date || new Date(e.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <p className="text-gold-400 font-semibold">Rs.{parseFloat(e.amount || 0).toLocaleString('en-IN')}</p>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

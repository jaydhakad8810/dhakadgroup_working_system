import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { LoadingPage } from '../../components/ui'
import { ArrowLeft, Car, Phone, Truck, DollarSign, MapPin, Calendar } from 'lucide-react'

const TABS = ['Overview', 'Trips', 'Vehicles', 'Expenses']

export default function DriverDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [driver, setDriver] = useState(null)
  const [trips, setTrips] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')

  useEffect(() => {
    const load = async () => {
      try {
        const [dRes, tRes, eRes] = await Promise.all([
          api.get(`/drivers/${id}`),
          api.get(`/trips?driver_id=${id}`),
          api.get(`/expenses?driver_id=${id}`).catch(() => ({ data: [] })),
        ])
        setDriver(dRes.data)
        setTrips(tRes.data || [])
        setExpenses(eRes.data || [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <LoadingPage />
  if (!driver) return <div className="text-center py-16 text-gray-500">Driver not found</div>

  const vehicles = driver.vehicles || []
  const totalTrips = trips.length
  const totalDistance = trips.reduce((sum, t) => sum + (t.distance_km || 0), 0)
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const monthTrips = trips.filter(t => {
    const d = new Date(t.trip_date)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date || e.createdAt)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const totalExpenseAmt = monthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

  const statusColor = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    delivered: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    ongoing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/drivers')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white">Driver Profile</h1>
      </div>

      {/* Profile card */}
      <div className="card">
        <div className="flex items-center gap-4">
          {driver.photo
            ? <img src={driver.photo} className="w-20 h-20 rounded-2xl object-cover border border-dark-600" alt={driver.name} />
            : <div className="w-20 h-20 rounded-2xl bg-gold-500/20 flex items-center justify-center text-gold-400 text-3xl font-bold border border-gold-500/20">
                {driver.name?.[0]}
              </div>
          }
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white">{driver.name}</h2>
            {driver.user?.employee_id && (
              <p className="text-gold-400 font-mono text-sm">{driver.user.employee_id}</p>
            )}
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${driver.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                {driver.is_active ? 'Active' : 'Inactive'}
              </span>
              {driver.is_busy && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">On Trip</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 text-sm text-gray-400">
          {driver.phone && <div className="flex items-center gap-1.5"><Phone size={13}/>{driver.phone}</div>}
          {driver.license_number && <div className="flex items-center gap-1.5"><Car size={13}/>Lic: {driver.license_number}</div>}
          {driver.license_expiry && <div className="flex items-center gap-1.5"><Calendar size={13}/>Expiry: {driver.license_expiry}</div>}
          {driver.aadhar_number && <div>Aadhar: {driver.aadhar_number}</div>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gold-400">{totalTrips}</p>
          <p className="text-xs text-gray-500 mt-1">Total Trips</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-400">{totalDistance.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total km</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-400">₹{totalExpenseAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-gray-500 mt-1">Expenses (month)</p>
        </div>
      </div>

      {/* Monthly stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-xl font-bold text-purple-400">{monthTrips.length}</p>
          <p className="text-xs text-gray-500">Trips This Month</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-bold text-teal-400">{vehicles.length}</p>
          <p className="text-xs text-gray-500">Assigned Vehicles</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${tab === t ? 'bg-gold-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'Overview' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-bold text-white mb-3">Contact & Identity</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Phone', driver.phone],
                ['Emergency', driver.emergency_contact],
                ['Aadhar', driver.aadhar_number],
                ['License No.', driver.license_number],
                ['License Expiry', driver.license_expiry],
                ['Bank Account', driver.bank_account],
                ['Bank IFSC', driver.bank_ifsc],
                ['Bank Name', driver.bank_name],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} className="bg-dark-800 rounded-xl p-2.5">
                  <p className="text-gray-500 text-xs">{l}</p>
                  <p className="text-white font-medium text-sm">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {driver.license_photo && (
            <div className="card">
              <p className="text-gray-400 text-xs mb-2">License Photo</p>
              <img src={driver.license_photo} className="h-28 rounded-lg object-cover" alt="license" />
            </div>
          )}
        </div>
      )}

      {/* Trips Tab */}
      {tab === 'Trips' && (
        <div className="space-y-2">
          {trips.length === 0
            ? <div className="card text-center text-gray-500 py-8">No trips found</div>
            : trips.map(t => (
              <div key={t.id} className="card">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-mono text-gold-400 text-xs">{t.master_card_number || '—'}</p>
                    <p className="text-sm font-medium text-white mt-0.5">
                      {t.from_location} → {t.to_location || '—'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${statusColor[t.status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                    {t.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><Calendar size={11}/>{t.trip_date}</span>
                  {t.distance_km && <span className="flex items-center gap-1"><MapPin size={11}/>{t.distance_km} km</span>}
                  {t.material_name && <span className="flex items-center gap-1"><Truck size={11}/>{t.material_name}</span>}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Vehicles Tab */}
      {tab === 'Vehicles' && (
        <div className="space-y-3">
          {vehicles.length === 0
            ? <div className="card text-center text-gray-500 py-8">No vehicles assigned</div>
            : vehicles.map(v => (
              <div key={v.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-white">{v.registration_number}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">{v.type || 'Vehicle'}</span>
                </div>
                <div className="text-sm text-gray-400 space-y-1">
                  {v.make && <p>{v.make} {v.model} {v.year ? `(${v.year})` : ''}</p>}
                  {v.current_odometer != null && <p>Odometer: {v.current_odometer?.toLocaleString()} km</p>}
                  {v.insurance_expiry && <p>Insurance: {v.insurance_expiry}</p>}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'Expenses' && (
        <div className="space-y-3">
          {/* Category breakdown */}
          {expenses.length > 0 && (() => {
            const byCategory = {}
            expenses.forEach(e => {
              const cat = e.category || 'Other'
              byCategory[cat] = (byCategory[cat] || 0) + parseFloat(e.amount || 0)
            })
            return (
              <div className="card">
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <DollarSign size={15} className="text-gold-400" />
                  Expense Breakdown
                </h3>
                <div className="space-y-2">
                  {Object.entries(byCategory).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{cat}</span>
                      <span className="text-white font-medium">₹{amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  ))}
                  <div className="border-t border-dark-600 pt-2 flex items-center justify-between text-sm font-bold">
                    <span className="text-gray-300">Total</span>
                    <span className="text-gold-400">₹{expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {expenses.length === 0
            ? <div className="card text-center text-gray-500 py-8">No expenses found</div>
            : expenses.map(e => (
              <div key={e.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{e.description || e.category || 'Expense'}</p>
                  <p className="text-xs text-gray-500">{e.category} · {e.date || (e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN') : '—')}</p>
                </div>
                <p className="text-gold-400 font-semibold">₹{parseFloat(e.amount || 0).toLocaleString('en-IN')}</p>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

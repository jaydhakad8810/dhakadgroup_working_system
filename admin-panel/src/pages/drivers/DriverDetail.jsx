import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LoadingPage } from '../../components/ui'
import { ArrowLeft, Phone, CreditCard, Truck, Map, DollarSign, TrendingUp } from 'lucide-react'
import api from '../../utils/api'

const TABS = ['Overview', 'Trips', 'Vehicles', 'Expenses']

function StatCard({ label, value, icon: Icon, color = 'text-gold-400' }) {
  return (
    <div className="card text-center">
      <Icon size={20} className={`mx-auto mb-1 ${color}`} />
      <p className={`font-bold text-2xl ${color}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
    </div>
  )
}

function TripsBarChart({ trips }) {
  if (!trips.length) return <p className="text-gray-500 text-sm text-center py-4">No trip data</p>
  // Group by month
  const byMonth = {}
  trips.forEach(t => {
    const m = (t.start_date || t.createdAt || '').slice(0, 7)
    if (m) byMonth[m] = (byMonth[m] || 0) + 1
  })
  const entries = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
  const max = Math.max(...entries.map(([, v]) => v), 1)
  return (
    <div className="flex items-end gap-2 h-24">
      {entries.map(([month, count]) => (
        <div key={month} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-t bg-gold-500/70 hover:bg-gold-400 transition-colors"
            style={{ height: `${(count / max) * 72}px` }}
            title={`${month}: ${count} trips`}
          />
          <span className="text-gray-600 text-xs">{month.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

function ExpensePie({ trips }) {
  const expenseTrips = trips.filter(t => t.expense_amount && parseFloat(t.expense_amount) > 0)
  if (!expenseTrips.length) return <p className="text-gray-500 text-sm text-center py-4">No expense data</p>
  const total = expenseTrips.reduce((s, t) => s + parseFloat(t.expense_amount || 0), 0)
  return (
    <div className="space-y-2">
      {expenseTrips.slice(0, 5).map(t => {
        const pct = total > 0 ? Math.round((parseFloat(t.expense_amount) / total) * 100) : 0
        return (
          <div key={t.id} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400 truncate max-w-[180px]">{t.purpose || t.from_location || 'Trip'}</span>
                <span className="text-white font-medium">₹{parseFloat(t.expense_amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-1.5">
                <div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        )
      })}
      <div className="border-t border-dark-700 pt-2 flex justify-between text-sm">
        <span className="text-gray-400">Total Expenses</span>
        <span className="text-gold-400 font-bold">₹{total.toLocaleString('en-IN')}</span>
      </div>
    </div>
  )
}

import api from '../../utils/api'
import { LoadingPage } from '../../components/ui'
import { ArrowLeft, Car, Phone, Truck, DollarSign, MapPin, Calendar } from 'lucide-react'

const TABS = ['Overview', 'Trips', 'Vehicles', 'Expenses']

export default function DriverDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [driver, setDriver] = useState(null)
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [tab, setTab] = useState('Overview')
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')

  useEffect(() => {
    const load = async () => {
      try {
        const [d, t, v] = await Promise.all([
          api.get(`/drivers/${id}`),
          api.get(`/trips?driver_id=${id}`).catch(() => ({ data: [] })),
          api.get(`/drivers/vehicles/all`).catch(() => ({ data: [] })),
        ])
        setDriver(d.data)
        setTrips(t.data || [])
        setVehicles((v.data || []).filter(vh => vh.driver_id === id || vh.driver?.id === id))
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
  if (!driver) return <div className="p-6 text-gray-400">Driver not found</div>

  const completedTrips = trips.filter(t => t.status === 'completed').length
  const totalExpenses = trips.reduce((s, t) => s + parseFloat(t.expense_amount || 0), 0)
  const totalKm = trips.reduce((s, t) => s + parseFloat(t.distance_km || 0), 0)

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/drivers')} className="btn-ghost flex items-center gap-2 text-sm">
        <ArrowLeft size={15} /> Back to Drivers
      </button>

      {/* Header */}
      <div className="card flex items-start gap-4">
        {driver.photo
          ? <img src={driver.photo} className="w-20 h-20 rounded-2xl object-cover border border-dark-600 flex-shrink-0" alt={driver.name} />
          : <div className="w-20 h-20 rounded-2xl bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-3xl flex-shrink-0">{driver.name?.[0]}</div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-white font-bold text-xl">{driver.name}</h2>
            <div className="flex flex-col items-end gap-1">
              <span className={driver.is_active ? 'badge-green' : 'badge-red'}>{driver.is_active ? 'Active' : 'Inactive'}</span>
              {driver.is_busy && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-semibold">● On Trip</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
            {driver.phone && <span className="flex items-center gap-1.5"><Phone size={13} />{driver.phone}</span>}
            {driver.license_number && <span className="flex items-center gap-1.5"><CreditCard size={13} />{driver.license_number}</span>}
            {driver.daily_wage && <span className="text-gold-400 font-semibold">₹{parseFloat(driver.daily_wage).toLocaleString('en-IN')}/day</span>}
          </div>
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
      <div className="flex gap-1 bg-dark-800 rounded-lg p-1 w-fit overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-all ${tab === t ? 'bg-gold-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>
      <div className="flex gap-1 bg-dark-800 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${tab === t ? 'bg-gold-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Trips" value={trips.length} icon={Map} />
            <StatCard label="Completed" value={completedTrips} icon={TrendingUp} color="text-green-400" />
            <StatCard label="Vehicles" value={vehicles.length} icon={Truck} color="text-blue-400" />
            <StatCard label="Total Expenses" value={`₹${Math.round(totalExpenses / 1000)}k`} icon={DollarSign} color="text-orange-400" />
          </div>

          <div className="card">
            <h3 className="text-white font-semibold mb-3">Trips Per Month</h3>
            <TripsBarChart trips={trips} />
          </div>

          {(driver.bank_name || driver.bank_account) && (
            <div className="card">
              <h3 className="text-white font-semibold mb-3">Bank Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[['Bank', driver.bank_name], ['Account', driver.bank_account], ['IFSC', driver.bank_ifsc]].filter(([, v]) => v).map(([l, v]) => (
                  <div key={l} className="bg-dark-800 rounded-lg p-2.5">
                    <p className="text-gray-500 text-xs">{l}</p>
                    <p className="text-white font-medium">{v}</p>
                  </div>
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

      {/* Trips */}
      {tab === 'Trips' && (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">{trips.length} total trips · {totalKm.toLocaleString('en-IN')} km total</p>
          {!trips.length && <p className="text-gray-500 text-center py-12">No trips found</p>}
          <div className="space-y-2">
            {trips.map(t => (
              <div key={t.id} className="card flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{t.from_location} → {t.to_location}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {t.start_date || t.createdAt?.slice(0, 10)}
                    {t.distance_km ? ` · ${t.distance_km} km` : ''}
                    {t.purpose ? ` · ${t.purpose}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  {t.expense_amount && <p className="text-gold-400 font-semibold text-sm">₹{parseFloat(t.expense_amount).toLocaleString('en-IN')}</p>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    t.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>{t.status || 'pending'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vehicles */}
      {tab === 'Vehicles' && (
        <div className="space-y-3">
          {!vehicles.length && <p className="text-gray-500 text-center py-12">No vehicles assigned</p>}
          {vehicles.map(v => (
            <div key={v.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gold-400 font-mono font-semibold">{v.registration_number}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${v.insurance_expiry && new Date(v.insurance_expiry) < new Date() ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                  {v.insurance_expiry && new Date(v.insurance_expiry) < new Date() ? 'Expired Insurance' : 'Insurance Valid'}
                </span>
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <p>{v.type} · {v.make} {v.model} {v.year}</p>
                {v.current_odometer && <p>Odometer: {v.current_odometer.toLocaleString('en-IN')} km</p>}
                {v.insurance_expiry && <p>Insurance expires: {v.insurance_expiry}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expenses */}
      {tab === 'Expenses' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-white font-semibold mb-4">Expense Breakdown by Trip</h3>
            <ExpensePie trips={trips} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center">
              <p className="text-gold-400 font-bold text-2xl">₹{totalExpenses.toLocaleString('en-IN')}</p>
              <p className="text-gray-500 text-xs mt-1">Total Expenses</p>
            </div>
            <div className="card text-center">
              <p className="text-blue-400 font-bold text-2xl">{trips.filter(t => t.expense_amount > 0).length}</p>
              <p className="text-gray-500 text-xs mt-1">Trips with Expenses</p>
            </div>
          </div>
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

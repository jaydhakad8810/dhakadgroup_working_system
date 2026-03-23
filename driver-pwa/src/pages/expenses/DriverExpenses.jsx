import { useEffect, useState } from 'react'
import { Receipt, Fuel, AlertCircle } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, EmptyState } from '../../components/ui'

export default function DriverExpenses() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/trips').then(r => setTrips(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const withExpenses = trips.filter(t => parseFloat(t.fuel_cost || 0) + parseFloat(t.other_expenses || 0) > 0)
  const totalFuel  = withExpenses.reduce((s, t) => s + parseFloat(t.fuel_cost  || 0), 0)
  const totalOther = withExpenses.reduce((s, t) => s + parseFloat(t.other_expenses || 0), 0)
  const totalAll   = totalFuel + totalOther

  if (loading) return <LoadingPage />

  return (
    <div className="page-content space-y-5">
      {/* Summary */}
      <div className="card bg-gradient-to-br from-primary-600/20 to-surface-300 border-primary-500/20">
        <p className="text-gray-400 text-sm">Total Trip Expenses</p>
        <p className="text-white font-bold text-3xl mt-1">₹{totalAll.toLocaleString('en-IN')}</p>
        <div className="flex gap-4 mt-3">
          <div>
            <p className="text-gray-500 text-xs">Fuel</p>
            <p className="text-orange-400 font-semibold">₹{totalFuel.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Other</p>
            <p className="text-blue-400 font-semibold">₹{totalOther.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Trips</p>
            <p className="text-gray-300 font-semibold">{withExpenses.length}</p>
          </div>
        </div>
      </div>

      <h3 className="text-white font-semibold">Trip Expense Breakdown</h3>

      {withExpenses.length === 0
        ? <EmptyState icon={Receipt} title="No expenses" message="Trip expenses will appear here once you complete trips with fuel or other costs" />
        : (
          <div className="space-y-2">
            {withExpenses.map(t => {
              const total = parseFloat(t.fuel_cost || 0) + parseFloat(t.other_expenses || 0)
              return (
                <div key={t.id} className="card-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{t.from_location} → {t.to_location || '...'}</p>
                      <p className="text-gray-500 text-xs">{t.trip_date} · {t.vehicle?.registration_number}</p>
                    </div>
                    <p className="text-primary-400 font-bold">₹{total.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    {parseFloat(t.fuel_cost || 0) > 0 && (
                      <span className="flex items-center gap-1 text-orange-400">
                        <Fuel size={12} /> ₹{parseFloat(t.fuel_cost).toLocaleString('en-IN')} fuel
                      </span>
                    )}
                    {parseFloat(t.other_expenses || 0) > 0 && (
                      <span className="flex items-center gap-1 text-blue-400">
                        <AlertCircle size={12} /> ₹{parseFloat(t.other_expenses).toLocaleString('en-IN')} other
                      </span>
                    )}
                    {t.distance_km && <span className="text-gray-500">{t.distance_km} km</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Truck, AlertTriangle } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, InfoRow, EmptyState } from '../../components/ui'

export default function MyVehicle() {
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/driver')
      .then(r => setDriver(r.data.driver))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingPage />
  if (!driver || !driver.vehicles?.length) {
    return (
      <div className="page-content">
        <EmptyState icon={Truck} title="No vehicle assigned"
          message="Contact your admin to get a vehicle assigned." />
      </div>
    )
  }

  return (
    <div className="page-content space-y-4">
      {driver.vehicles.map(vehicle => {
        const insuranceExpired = vehicle.insurance_expiry && new Date(vehicle.insurance_expiry) < new Date()
        const insuranceSoon = vehicle.insurance_expiry && !insuranceExpired &&
          new Date(vehicle.insurance_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        return (
          <div key={vehicle.id} className="space-y-4">
            {/* Vehicle Card */}
            <div className="card bg-gradient-to-br from-primary-600/15 to-surface-300 border-primary-500/20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <Truck size={28} className="text-primary-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-xl font-mono">{vehicle.registration_number}</h2>
                  <p className="text-gray-400">{vehicle.make} {vehicle.model} {vehicle.year}</p>
                  <p className="text-primary-400 text-sm font-medium">{vehicle.type}</p>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {insuranceExpired && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-semibold text-sm">Insurance Expired!</p>
                  <p className="text-gray-400 text-xs">Expired on {vehicle.insurance_expiry}</p>
                </div>
              </div>
            )}
            {insuranceSoon && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center gap-3">
                <AlertTriangle size={20} className="text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-orange-400 font-semibold text-sm">Insurance Expiring Soon</p>
                  <p className="text-gray-400 text-xs">Expires on {vehicle.insurance_expiry}</p>
                </div>
              </div>
            )}

            {/* Vehicle Details */}
            <div className="card space-y-0">
              <h3 className="text-white font-semibold mb-3">Vehicle Info</h3>
              <InfoRow label="Registration" value={vehicle.registration_number} valueClass="text-primary-400 font-mono" />
              <InfoRow label="Type" value={vehicle.type} />
              <InfoRow label="Make" value={vehicle.make} />
              <InfoRow label="Model" value={vehicle.model} />
              <InfoRow label="Year" value={vehicle.year} />
              <InfoRow label="Current Odometer" value={vehicle.current_odometer ? `${vehicle.current_odometer?.toLocaleString('en-IN')} km` : null} valueClass="text-primary-400" />
              <InfoRow label="Insurance Expiry" value={vehicle.insurance_expiry}
                valueClass={insuranceExpired ? 'text-red-400' : insuranceSoon ? 'text-orange-400' : 'text-white'} />
            </div>

            {/* Documents */}
            <div className="card space-y-3">
              <h3 className="text-white font-semibold">Documents</h3>
              <div className="grid grid-cols-2 gap-3">
                {vehicle.rc_photo ? (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">RC Book</p>
                    <img src={vehicle.rc_photo} className="w-full h-24 object-cover rounded-xl" alt="RC" />
                  </div>
                ) : (
                  <div className="h-24 bg-surface-400 rounded-xl flex items-center justify-center">
                    <p className="text-gray-600 text-xs">No RC uploaded</p>
                  </div>
                )}
                {vehicle.insurance_photo ? (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Insurance</p>
                    <img src={vehicle.insurance_photo} className="w-full h-24 object-cover rounded-xl" alt="Insurance" />
                  </div>
                ) : (
                  <div className="h-24 bg-surface-400 rounded-xl flex items-center justify-center">
                    <p className="text-gray-600 text-xs">No insurance uploaded</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

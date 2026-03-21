import { useEffect, useState } from 'react'
import { PackageCheck, CheckCircle, Loader2 } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, EmptyState } from '../../components/ui'

export default function DeliveryConfirmation() {
  const [deliveries, setDeliveries] = useState([])
  const [completed, setCompleted] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/trips?status=delivered')
      setDeliveries(r.data.filter(t => t.status === 'delivered'))
      setCompleted(r.data.filter(t => t.status === 'completed').slice(0, 5))
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const confirm = async (trip) => {
    setConfirming(trip.id)
    try {
      await api.patch(`/trips/${trip.id}/confirm`, { confirmation_notes: '' })
      toast.success(`Receipt confirmed for ${trip.material_name || 'delivery'}!`)
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setConfirming(null)
  }

  if (loading) return <LoadingPage />

  return (
    <div className="page-content space-y-5">
      <div>
        <h1 className="text-white font-bold text-xl">Deliveries</h1>
        <p className="text-gray-500 text-sm">Confirm receipt of materials delivered to your site</p>
      </div>

      {deliveries.length > 0 && (
        <div>
          <p className="text-orange-400 font-semibold text-sm mb-3">⏳ Awaiting Your Confirmation ({deliveries.length})</p>
          <div className="space-y-3">
            {deliveries.map(t => (
              <div key={t.id} className="card border border-orange-500/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-gold-400 font-mono text-xs">{t.master_card_number}</p>
                    <p className="text-white font-semibold">{t.material_name || 'Material Delivery'}</p>
                    {t.material_quantity && <p className="text-gray-400 text-sm">{t.material_quantity} {t.material_unit || 'units'}</p>}
                  </div>
                  <span className="badge-gold">Delivered</span>
                </div>
                <div className="text-gray-500 text-xs space-y-0.5 mb-3">
                  <p>From: {t.from_location}</p>
                  <p>Driver: {t.driver?.name || '—'}</p>
                  {t.delivery_confirmed_at && <p>Delivered at: {new Date(t.delivery_confirmed_at).toLocaleString('en-IN')}</p>}
                </div>
                {t.delivery_photo && (
                  <img src={t.delivery_photo} className="w-full h-32 object-cover rounded-xl mb-3" alt="Delivery proof" />
                )}
                <button onClick={() => confirm(t)} disabled={confirming === t.id} className="btn-primary w-full py-3">
                  {confirming === t.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  {confirming === t.id ? 'Confirming...' : 'Confirm Receipt ✓'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {deliveries.length === 0 && (
        <EmptyState icon={PackageCheck} title="No pending deliveries" message="All deliveries have been confirmed." />
      )}

      {completed.length > 0 && (
        <div>
          <p className="text-green-400 font-semibold text-sm mb-3">✓ Recently Confirmed</p>
          <div className="space-y-2">
            {completed.map(t => (
              <div key={t.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={18} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{t.material_name || 'Delivery'}</p>
                  <p className="text-gray-500 text-xs">{t.master_card_number} · {t.from_location}</p>
                </div>
                <span className="badge-green flex-shrink-0">Done</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

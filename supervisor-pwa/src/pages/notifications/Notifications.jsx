import { useEffect, useState } from 'react'
import { Bell, CheckCircle, Package, X } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, EmptyState } from '../../components/ui'
import toast from 'react-hot-toast'

function TripConfirmModal({ notif, onClose, onDone }) {
  const meta = notif?.metadata || {}
  const [photo, setPhoto] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = { current: null }

  const uploadPhoto = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/upload/single', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPhoto(res.data?.url || '')
    } catch { toast.error('Photo upload failed') }
    setUploading(false)
  }

  const handleConfirm = async () => {
    if (!meta.trip_id) { toast.error('Trip not found'); return }
    setSaving(true)
    try {
      await api.patch('/trips/' + meta.trip_id + '/confirm', { confirmation_notes: notes })
      if (meta.material_name && meta.site_id) {
        await api.post('/godown/stock-in-site', {
          site_id: meta.site_id,
          material_name: meta.material_name,
          quantity: meta.material_quantity || 0,
          unit: meta.material_unit || '',
          delivery_photo: photo || undefined,
          notes: 'Delivery confirmed by supervisor'
        }).catch(() => {})
      }
      await api.patch('/notifications/' + notif.id + '/read').catch(() => {})
      toast.success('Delivery confirmed!')
      onDone()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to confirm')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-300 rounded-t-2xl w-full p-4 space-y-4" style={{ paddingBottom: 100 }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Confirm Delivery</h3>
          <button onClick={onClose} className="text-gray-400"><X size={18} /></button>
        </div>
        <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-3">
          <p className="text-xs text-primary-400 font-semibold mb-1">📦 Material Details</p>
          <p className="text-white text-sm font-medium">{meta.material_name || 'Material'}</p>
          <p className="text-gray-400 text-xs">{meta.material_quantity} {meta.material_unit} · Trip: {meta.master_card}</p>
        </div>
        <div>
          <label className="label">Delivery Photo (optional)</label>
          <input type="file" accept="image/*" capture="environment" className="hidden"
            ref={r => fileRef.current = r}
            onChange={e => uploadPhoto(e.target.files[0])} />
          {photo ? (
            <img src={photo} className="w-full h-32 object-cover rounded-xl border border-white/10" />
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full h-24 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-gray-500 text-sm">
              {uploading ? 'Uploading...' : '📷 Take Photo'}
            </button>
          )}
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input text-white" rows={2} value={notes}
            onChange={e => setNotes(e.target.value)} placeholder="Any remarks..." />
        </div>
        <button
          className="btn-primary w-full min-h-[48px] flex items-center justify-center gap-2"
          onClick={handleConfirm} disabled={saving}>
          <CheckCircle size={18} />
          {saving ? 'Confirming...' : 'Confirm Receipt & Add to Stock'}
        </button>
      </div>
    </div>
  )
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmNotif, setConfirmNotif] = useState(null)

  const load = async () => {
    try { const r = await api.get('/notifications'); setNotifications(r.data) }
    catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const markRead = async (id) => {
    try {
      await api.patch('/notifications/' + id + '/read')
      setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch {}
  }

  const markAllRead = async () => {
    try { await api.patch('/notifications/mark-all-read'); load(); toast.success('All marked read') }
    catch {}
  }

  const handleNotifClick = (n) => {
    if (n.title === 'Trip Delivered' && n.metadata?.trip_id) {
      setConfirmNotif(n)
    } else {
      markRead(n.id)
    }
  }

  const typeColors = { info: 'bg-blue-500/20 text-blue-400', warning: 'bg-primary-500/20 text-primary-400', success: 'bg-green-500/20 text-green-400', error: 'bg-red-500/20 text-red-400' }
  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div className="page-content space-y-4">
      {unread > 0 && (
        <button onClick={markAllRead} className="btn-secondary w-full text-sm py-2.5">
          Mark all {unread} as read
        </button>
      )}
      {loading ? <LoadingPage /> : (
        <div className="space-y-2">
          {notifications.map(n => (
            <button key={n.id} onClick={() => handleNotifClick(n)}
              className={`card w-full text-left transition-all ${!n.is_read ? 'border-primary-500/30 bg-primary-500/5' : 'opacity-70'}`}>
              <div className="flex gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  n.title === 'Trip Delivered' ? 'bg-green-500/20 text-green-400' : typeColors[n.type] || 'bg-gray-500/20 text-gray-400'
                }`}>
                  {n.title === 'Trip Delivered' ? <Package size={18} /> : <Bell size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">{n.title}</p>
                    {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />}
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5">{n.message}</p>
                  {n.title === 'Trip Delivered' && n.metadata?.trip_id && (
                    <p className="text-primary-400 text-xs mt-1 font-medium">👆 Tap to confirm receipt</p>
                  )}
                  <p className="text-gray-600 text-xs mt-1">{new Date(n.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </button>
          ))}
          {notifications.length === 0 && (
            <EmptyState icon={Bell} title="No notifications" message="You are all caught up!" />
          )}
        </div>
      )}
      {confirmNotif && (
        <TripConfirmModal
          notif={confirmNotif}
          onClose={() => setConfirmNotif(null)}
          onDone={() => { setConfirmNotif(null); load() }}
        />
      )}
    </div>
  )
}

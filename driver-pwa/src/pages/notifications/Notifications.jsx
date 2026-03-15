import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, EmptyState } from '../../components/ui'
import toast from 'react-hot-toast'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const r = await api.get('/notifications'); setNotifications(r.data) }
    catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch {}
  }

  const markAllRead = async () => {
    try { await api.patch('/notifications/mark-all-read'); load(); toast.success('All marked read') }
    catch {}
  }

  const typeIcons = { warning: '⚠️', success: '✅', error: '🚨', info: 'ℹ️' }
  const typeColors = {
    info: 'bg-primary-500/20 border-primary-500/20',
    warning: 'bg-orange-500/20 border-orange-500/20',
    success: 'bg-green-500/20 border-green-500/20',
    error: 'bg-red-500/20 border-red-500/20'
  }
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
            <button key={n.id} onClick={() => markRead(n.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-95 ${!n.is_read ? typeColors[n.type] || 'bg-primary-500/10 border-primary-500/20' : 'bg-surface-300 border-white/5 opacity-60'}`}>
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">{typeIcons[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">{n.title}</p>
                    {!n.is_read && <span className="w-2 h-2 bg-primary-400 rounded-full flex-shrink-0" />}
                  </div>
                  <p className="text-gray-300 text-sm mt-0.5">{n.message}</p>
                  <p className="text-gray-500 text-xs mt-1">{new Date(n.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </button>
          ))}
          {notifications.length === 0 && (
            <EmptyState icon={Bell} title="All clear!" message="No notifications at the moment." />
          )}
        </div>
      )}
    </div>
  )
}

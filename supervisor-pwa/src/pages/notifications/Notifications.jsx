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
            <button key={n.id} onClick={() => markRead(n.id)}
              className={`card w-full text-left transition-all ${!n.is_read ? 'border-primary-500/30 bg-primary-500/5' : 'opacity-70'}`}>
              <div className="flex gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColors[n.type] || 'bg-gray-500/20 text-gray-400'}`}>
                  <Bell size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">{n.title}</p>
                    {!n.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />}
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5">{n.message}</p>
                  <p className="text-gray-600 text-xs mt-1">{new Date(n.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </button>
          ))}
          {notifications.length === 0 && (
            <EmptyState icon={Bell} title="No notifications" message="You're all caught up!" />
          )}
        </div>
      )}
    </div>
  )
}

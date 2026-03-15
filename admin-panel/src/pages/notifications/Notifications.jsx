import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal } from '../../components/ui'
import { Plus, Bell, Trash2 } from 'lucide-react'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ type: 'info', target_role: 'all', target_mode: 'role' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const [n, r] = await Promise.all([api.get('/notifications'), api.get('/notifications/recipients')])
      setNotifications(n.data); setRecipients(r.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { title: form.title, message: form.message, type: form.type }
      if (form.target_mode === 'specific') {
        payload.target_user_id = form.target_user_id
        payload.target_role = 'supervisor'
      } else {
        payload.target_role = form.target_role
      }
      await api.post('/notifications/broadcast', payload)
      toast.success('Notification sent!'); setModal(false); setForm({ type: 'info', target_role: 'all', target_mode: 'role' }); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/notifications/${id}`); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const typeColors = { info: 'badge-blue', warning: 'badge-gold', success: 'badge-green', error: 'badge-red' }
  const roleColors = { supervisor: 'badge-blue', driver: 'badge-green', admin: 'badge-gold', all: 'badge-gray' }
  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications"
        action={<button onClick={() => setModal(true)} className="btn-gold"><Plus size={16} />Send Notification</button>}
      />
      <div className="space-y-3">
        {notifications.map(n => (
          <div key={n.id} className={`card flex items-start gap-4 ${!n.is_read ? 'border-gold-500/30' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0"><Bell size={18} className="text-gold-400" /></div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{n.title}</h3>
                <span className={typeColors[n.type] || 'badge-gray'}>{n.type}</span>
                <span className={roleColors[n.target_role] || 'badge-gray'}>{n.target_role}</span>
                {n.target_user_id && <span className="badge-blue">Direct</span>}
                {!n.is_read && <span className="w-2 h-2 bg-gold-400 rounded-full" />}
              </div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{n.message}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{new Date(n.createdAt).toLocaleString('en-IN')}</p>
            </div>
            <button onClick={() => handleDelete(n.id)} className="text-red-400 hover:text-red-300 flex-shrink-0"><Trash2 size={16} /></button>
          </div>
        ))}
        {!notifications.length && (
          <div className="text-center py-16"><Bell size={40} className="mx-auto mb-3" style={{ color: 'var(--border)' }} /><p style={{ color: 'var(--muted)' }}>No notifications yet</p></div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Send Notification" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Title *</label><input className="input" required value={form.title || ''} onChange={e => f('title', e.target.value)} /></div>
          <div><label className="label">Message *</label><textarea className="input" rows={3} required value={form.message || ''} onChange={e => f('message', e.target.value)} /></div>
          <div><label className="label">Type</label>
            <select className="select" value={form.type} onChange={e => f('type', e.target.value)}>
              <option value="info">Info</option><option value="warning">Warning</option>
              <option value="success">Success</option><option value="error">Alert</option>
            </select>
          </div>

          {/* Target mode */}
          <div>
            <label className="label">Send To</label>
            <div className="flex gap-2 mb-3">
              <button type="button" onClick={() => f('target_mode', 'role')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.target_mode === 'role' ? 'bg-gold-500 text-black' : 'bg-white/5 text-gray-400'}`}>By Role</button>
              <button type="button" onClick={() => f('target_mode', 'specific')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.target_mode === 'specific' ? 'bg-gold-500 text-black' : 'bg-white/5 text-gray-400'}`}>Specific Person</button>
            </div>

            {form.target_mode === 'role' ? (
              <select className="select" value={form.target_role} onChange={e => f('target_role', e.target.value)}>
                <option value="all">Everyone</option>
                <option value="supervisor">All Supervisors</option>
                <option value="driver">All Drivers</option>
              </select>
            ) : (
              <select className="select" value={form.target_user_id || ''} onChange={e => f('target_user_id', e.target.value)}>
                <option value="">Select person</option>
                {recipients.map(r => (
                  <option key={r.id} value={r.id}>{r.name} — {r.role} ({r.employee_id || 'No ID'})</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Sending...' : 'Send'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

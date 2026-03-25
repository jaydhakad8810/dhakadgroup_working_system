import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal } from '../../components/ui'
import { Plus, Bell, Trash2, CheckCheck, Eye } from 'lucide-react'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ type: 'info', target_role: 'all', target_mode: 'role' })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const [n, r] = await Promise.all([api.get('/notifications'), api.get('/notifications/recipients').catch(() => ({ data: [] }))])
      setNotifications(n.data); setRecipients(r.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { title: form.title, message: form.message, type: form.type }
      if (form.target_mode === 'specific') { payload.target_user_id = form.target_user_id; payload.target_role = 'supervisor' }
      else { payload.target_role = form.target_role }
      await api.post('/notifications/broadcast', payload)
      toast.success('Notification sent!'); setModal(false)
      setForm({ type: 'info', target_role: 'all', target_mode: 'role' }); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const markRead = async (id) => { try { await api.patch('/notifications/'+id+'/read'); load() } catch {} }
  const markAllRead = async () => { try { await api.patch('/notifications/mark-all-read'); toast.success('All read'); load() } catch {} }
  const deleteNotif = async (id) => { try { await api.delete('/notifications/'+id); load() } catch { toast.error('Failed') } }

  const typeColors = { info:'bg-blue-500/15 text-blue-400 border-blue-500/20', success:'bg-green-500/15 text-green-400 border-green-500/20', warning:'bg-yellow-500/15 text-yellow-400 border-yellow-500/20', error:'bg-red-500/15 text-red-400 border-red-500/20' }
  const typeIcons = { info:'ℹ️', success:'✅', warning:'⚠️', error:'❌' }

  const filtered = notifications.filter(n => {
    if (filter==='unread') return !n.is_read
    if (['admin','supervisor','driver'].includes(filter)) return n.target_role===filter
    return true
  })
  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle={unreadCount>0?unreadCount+' unread':notifications.length+' total'}
        action={<div className="flex gap-2">
          {unreadCount>0&&<button onClick={markAllRead} className="btn-outline text-sm py-2"><CheckCheck size={14}/>Mark All Read</button>}
          <button onClick={()=>setModal(true)} className="btn-gold"><Plus size={16}/>Send Notification</button>
        </div>}
      />
      <div className="flex gap-1 p-1 rounded-xl w-fit flex-wrap" style={{background:'var(--bg2)'}}>
        {[{key:'all',label:'All ('+notifications.length+')'},{key:'unread',label:'Unread ('+unreadCount+')'},{key:'admin',label:'Admin'},{key:'supervisor',label:'Supervisor'},{key:'driver',label:'Driver'}].map(t=>(
          <button key={t.key} onClick={()=>setFilter(t.key)} className={'px-3 py-1.5 rounded-lg text-sm font-medium transition-all '+(filter===t.key?'bg-gold-500 text-black':'text-gray-400 hover:text-white')}>{t.label}</button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(n=>(
          <div key={n.id} className={'card flex items-start gap-4 transition-all '+(!n.is_read?'border-l-4 border-l-gold-500':'')}>
            <div className={'w-10 h-10 min-w-10 rounded-xl flex items-center justify-center text-lg border '+(typeColors[n.type]||typeColors.info)}>{typeIcons[n.type]||'🔔'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={'font-semibold text-sm '+(!n.is_read?'text-white':'text-gray-300')}>{n.title}</p>
                  <p className="text-gray-400 text-sm mt-0.5">{n.message}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!n.is_read&&<button onClick={()=>markRead(n.id)} className="p-1.5 rounded-lg hover:bg-surface-300 text-gray-400 hover:text-green-400"><Eye size={14}/></button>}
                  <button onClick={()=>deleteNotif(n.id)} className="p-1.5 rounded-lg hover:bg-surface-300 text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={'text-xs px-2 py-0.5 rounded-full border '+(typeColors[n.type]||typeColors.info)}>{n.type}</span>
                {n.target_role&&<span className="text-xs text-gray-500">→ {n.target_role}</span>}
                <span className="text-xs text-gray-600">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
                {!n.is_read&&<span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full font-semibold">NEW</span>}
              </div>
            </div>
          </div>
        ))}
        {!filtered.length&&<div className="text-center py-16"><Bell size={40} className="mx-auto mb-3 opacity-20"/><p className="text-gray-500">No notifications</p></div>}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="Send Notification" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Title *</label><input className="input" required value={form.title||''} onChange={e=>f('title',e.target.value)} placeholder="Notification title"/></div>
          <div><label className="label">Message *</label><textarea className="input" rows={3} required value={form.message||''} onChange={e=>f('message',e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Type</label>
              <select className="select" value={form.type} onChange={e=>f('type',e.target.value)}>
                <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="error">Alert</option>
              </select>
            </div>
            <div><label className="label">Send To</label>
              <select className="select" value={form.target_mode} onChange={e=>f('target_mode',e.target.value)}>
                <option value="role">By Role</option><option value="specific">Specific Person</option>
              </select>
            </div>
          </div>
          {form.target_mode==='role'?(
            <div><label className="label">Target Role</label>
              <select className="select" value={form.target_role} onChange={e=>f('target_role',e.target.value)}>
                <option value="all">Everyone</option><option value="supervisor">All Supervisors</option><option value="driver">All Drivers</option><option value="admin">Admin Only</option>
              </select>
            </div>
          ):(
            <div><label className="label">Select Person</label>
              <select className="select" value={form.target_user_id||''} onChange={e=>f('target_user_id',e.target.value)}>
                <option value="">Select person</option>{recipients.map(r=><option key={r.id} value={r.id}>{r.name} ({r.role})</option>)}
              </select>
            </div>
          )}
          {form.title&&<div className={'p-3 rounded-xl border '+(typeColors[form.type]||typeColors.info)}><p className="font-semibold text-sm">{typeIcons[form.type]} {form.title}</p>{form.message&&<p className="text-sm mt-1 opacity-80">{form.message}</p>}</div>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={()=>setModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving?'Sending...':'🔔 Send Notification'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

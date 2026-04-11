import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal } from '../../components/ui'
import { Plus, Bell, Trash2, CheckCheck, Eye, Truck, AlertTriangle, ShoppingCart } from 'lucide-react'

// ── Defined OUTSIDE render ──────────────────────────────────────────────────
function DriverSelect({ value, onChange, drivers }) {
  return (
    <select className="select" value={value} onChange={e => onChange(e.target.value)} required>
      <option value="">-- Select Driver --</option>
      {drivers.map(d => (
        <option key={d.id} value={d.id}>
          {d.name || d.full_name} {d.phone ? `· ${d.phone}` : ''} {d.is_busy ? '[Busy]' : ''}
        </option>
      ))}
    </select>
  )
}

function SiteSelect({ value, onChange, sites }) {
  return (
    <select className="select" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">-- Select Site --</option>
      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  )
}

// Parse notification message — try JSON first, fall back to plain string
function parseMeta(n) {
  try { return JSON.parse(n.message) } catch { return null }
}

function urgencyBadge(u) {
  if (u === 'critical') return 'bg-red-500/20 text-red-400 border border-red-500/30'
  if (u === 'urgent')   return 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
  return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
}

// Material Request Card — shown inside the notification list
function MaterialRequestCard({ notif, onCreateTrip }) {
  const meta = parseMeta(notif)
  if (!meta) return <p className="text-gray-400 text-sm mt-0.5">{notif.message}</p>
  return (
    <div className="mt-2 p-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-base">🏗️</span>
        <span className="text-sm font-bold text-white">New Material Request</span>
      </div>
      {meta.site_name && <p className="text-xs text-gray-300">📍 Site: <span className="text-white font-medium">{meta.site_name}</span></p>}
      {meta.supervisor_name && <p className="text-xs text-gray-300">👷 Supervisor: <span className="text-white font-medium">{meta.supervisor_name}</span></p>}
      <p className="text-xs text-gray-300">📦 Material: <span className="text-white font-medium">{meta.quantity} {meta.unit} of {meta.material_name}</span></p>
      {meta.urgency && (
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${urgencyBadge(meta.urgency)}`}>
          {meta.urgency === 'critical' ? '🚨' : meta.urgency === 'urgent' ? '⚡' : '📋'} {meta.urgency.charAt(0).toUpperCase() + meta.urgency.slice(1)}
        </span>
      )}
      <div className="pt-1">
        <button
          onClick={() => onCreateTrip(notif, meta)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold-500/20 text-gold-400 border border-gold-500/30 hover:bg-gold-500/30 transition-all"
        >
          <Truck size={13} />
          Create Trip &amp; Assign Driver
        </button>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ type: 'info', target_role: 'all', target_mode: 'role' })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Trip modal state
  const [tripModal, setTripModal] = useState(false)
  const [tripNotif, setTripNotif] = useState(null)
  const [tripMeta, setTripMeta] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [sites, setSites] = useState([])
  const [tripForm, setTripForm] = useState({ driver_id: '', site_id: '', notes: '' })
  const [savingTrip, setSavingTrip] = useState(false)
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [stockCheck, setStockCheck] = useState(null) // { available, quantity, stocks }
  const [checkingStock, setCheckingStock] = useState(false)
  const [showReqForm, setShowReqForm] = useState(false)
  const [savingReq, setSavingReq] = useState(false)
  const tf = (k, v) => setTripForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const [n, r] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/recipients').catch(() => ({ data: [] }))
      ])
      setNotifications(n.data); setRecipients(r.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openTripModal = async (notif, meta) => {
    setTripNotif(notif)
    setTripMeta(meta || null)
    setTripForm({ driver_id: '', site_id: meta?.site_id || '', notes: '' })
    setStockCheck(null)
    setShowReqForm(false)
    setTripModal(true)

    // Load drivers + sites
    setLoadingDrivers(true)
    try {
      const [dRes, sRes] = await Promise.all([api.get('/drivers?is_active=true'), api.get('/sites')])
      const dList = Array.isArray(dRes.data) ? dRes.data : (dRes.data?.data || [])
      console.log('drivers:', dList)
      setSites(Array.isArray(sRes.data) ? sRes.data : (sRes.data?.data || []))
      setDrivers(dList)
    } catch { toast.error('Failed to load drivers/sites') }
    setLoadingDrivers(false)

    // Check stock availability
    if (meta?.material_name && meta?.quantity) {
      setCheckingStock(true)
      try {
        const res = await api.get(`/godown/stock/check?material_name=${encodeURIComponent(meta.material_name)}&quantity=${meta.quantity}`)
        setStockCheck(res.data)
      } catch {}
      setCheckingStock(false)
    }
  }

  const handleCreateTrip = async (e) => {
    e.preventDefault()
    if (!tripForm.driver_id) { toast.error('Please select a driver'); return }
    setSavingTrip(true)
    try {
      await api.post('/trips', {
        driver_id: tripForm.driver_id,
        to_site_id: tripForm.site_id || undefined,
        to_location: sites.find(s => s.id === tripForm.site_id)?.name || 'Site',
        from_location: 'Godown',
        trip_date: new Date().toISOString().split('T')[0],
        trip_type: 'delivery',
        material_name: tripMeta?.material_name || '',
        quantity: tripMeta?.quantity || '',
        notes: tripForm.notes || tripNotif?.message,
        status: 'pending',
      })
      // Deduct stock if available
      if (stockCheck?.available && tripMeta?.material_name && tripMeta?.quantity) {
        await api.post('/godown/stock-out', {
          category_name: tripMeta.material_name,
          quantity: tripMeta.quantity,
          destination_type: 'site',
          site_id: tripForm.site_id || undefined,
          notes: `Dispatched for material request – Trip assigned`,
          godown_id: stockCheck?.stocks?.[0]?.godown_id || undefined,
        }).catch(() => {})
      }
      await api.patch('/notifications/' + tripNotif.id + '/read').catch(() => {})
      toast.success('Trip created & driver assigned!')
      setTripModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create trip')
    }
    setSavingTrip(false)
  }

  const handleCreateRequisition = async () => {
    if (!tripMeta) return
    setSavingReq(true)
    try {
      await api.post('/godown/requisitions', {
        material_name: tripMeta.material_name,
        quantity: tripMeta.quantity,
        unit: tripMeta.unit,
        site_id: tripMeta.site_id,
        site_name: tripMeta.site_name,
        urgency: tripMeta.urgency || 'normal',
      })
      toast.success('Purchase requisition created!')
      setShowReqForm(false)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setSavingReq(false)
  }

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

  const markRead = async (id) => { try { await api.patch('/notifications/' + id + '/read'); load() } catch {} }
  const markAllRead = async () => { try { await api.patch('/notifications/mark-all-read'); toast.success('All read'); load() } catch {} }
  const deleteNotif = async (id) => { try { await api.delete('/notifications/' + id); load() } catch { toast.error('Failed') } }

  const typeColors = {
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    success: 'bg-green-500/15 text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    error: 'bg-red-500/15 text-red-400 border-red-500/20'
  }
  const typeIcons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (['admin', 'supervisor', 'driver'].includes(filter)) return n.target_role === filter
    return true
  })
  const unreadCount = notifications.filter(n => !n.is_read).length
  const isMaterialRequest = (n) => n.title === 'New Material Request'

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle={unreadCount > 0 ? unreadCount + ' unread' : notifications.length + ' total'}
        action={<div className="flex gap-2">
          {unreadCount > 0 && <button onClick={markAllRead} className="btn-outline text-sm py-2"><CheckCheck size={14} />Mark All Read</button>}
          <button onClick={() => setModal(true)} className="btn-gold"><Plus size={16} />Send Notification</button>
        </div>}
      />

      <div className="flex gap-1 p-1 rounded-xl w-fit flex-wrap" style={{ background: 'var(--bg2)' }}>
        {[{ key: 'all', label: 'All (' + notifications.length + ')' }, { key: 'unread', label: 'Unread (' + unreadCount + ')' }, { key: 'admin', label: 'Admin' }, { key: 'supervisor', label: 'Supervisor' }, { key: 'driver', label: 'Driver' }].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={'px-3 py-1.5 rounded-lg text-sm font-medium transition-all ' + (filter === t.key ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white')}>{t.label}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(n => (
          <div key={n.id} className={'card flex items-start gap-4 transition-all ' + (!n.is_read ? 'border-l-4 border-l-gold-500' : '')}>
            <div className={'w-10 h-10 min-w-10 rounded-xl flex items-center justify-center text-lg border ' + (typeColors[n.type] || typeColors.info)}>
              {typeIcons[n.type] || '🔔'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={'font-semibold text-sm ' + (!n.is_read ? 'text-white' : 'text-gray-300')}>{n.title}</p>
                <div className="flex gap-1 shrink-0">
                  {!n.is_read && <button onClick={() => markRead(n.id)} className="p-1.5 rounded-lg hover:bg-surface-300 text-gray-400 hover:text-green-400"><Eye size={14} /></button>}
                  <button onClick={() => deleteNotif(n.id)} className="p-1.5 rounded-lg hover:bg-surface-300 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              {isMaterialRequest(n)
                ? <MaterialRequestCard notif={n} onCreateTrip={openTripModal} />
                : <p className="text-gray-400 text-sm mt-0.5">{n.message}</p>
              }
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={'text-xs px-2 py-0.5 rounded-full border ' + (typeColors[n.type] || typeColors.info)}>{n.type}</span>
                {n.target_role && <span className="text-xs text-gray-500">→ {n.target_role}</span>}
                <span className="text-xs text-gray-600">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
                {!n.is_read && <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full font-semibold">NEW</span>}
              </div>
            </div>
          </div>
        ))}
        {!filtered.length && <div className="text-center py-16"><Bell size={40} className="mx-auto mb-3 opacity-20" /><p className="text-gray-500">No notifications</p></div>}
      </div>

      {/* ── Send Notification Modal ── */}
      <Modal open={modal} onClose={() => setModal(false)} title="Send Notification" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Title *</label><input className="input" required value={form.title || ''} onChange={e => f('title', e.target.value)} placeholder="Notification title" /></div>
          <div><label className="label">Message *</label><textarea className="input" rows={3} required value={form.message || ''} onChange={e => f('message', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Type</label>
              <select className="select" value={form.type} onChange={e => f('type', e.target.value)}>
                <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="error">Alert</option>
              </select>
            </div>
            <div><label className="label">Send To</label>
              <select className="select" value={form.target_mode} onChange={e => f('target_mode', e.target.value)}>
                <option value="role">By Role</option><option value="specific">Specific Person</option>
              </select>
            </div>
          </div>
          {form.target_mode === 'role'
            ? <div><label className="label">Target Role</label>
                <select className="select" value={form.target_role} onChange={e => f('target_role', e.target.value)}>
                  <option value="all">Everyone</option><option value="supervisor">All Supervisors</option><option value="driver">All Drivers</option><option value="admin">Admin Only</option>
                </select>
              </div>
            : <div><label className="label">Select Person</label>
                <select className="select" value={form.target_user_id || ''} onChange={e => f('target_user_id', e.target.value)}>
                  <option value="">Select person</option>{recipients.map(r => <option key={r.id} value={r.id}>{r.name} ({r.role})</option>)}
                </select>
              </div>
          }
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Sending...' : '🔔 Send Notification'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Create Trip Modal ── */}
      <Modal open={tripModal} onClose={() => setTripModal(false)} title="Create Trip & Assign Driver" size="md">
        {tripNotif && (
          <div className="space-y-4">
            {/* Material request info */}
            {tripMeta ? (
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-1">
                <p className="text-xs text-yellow-400 font-semibold">Material Request Details</p>
                <p className="text-sm text-white">📦 {tripMeta.quantity} {tripMeta.unit} of <strong>{tripMeta.material_name}</strong></p>
                {tripMeta.site_name && <p className="text-xs text-gray-300">📍 Site: {tripMeta.site_name}</p>}
                {tripMeta.supervisor_name && <p className="text-xs text-gray-300">👷 Requested by: {tripMeta.supervisor_name}</p>}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-white">{tripNotif.message}</p>
              </div>
            )}

            {/* Stock availability check */}
            {tripMeta?.material_name && (
              <div>
                {checkingStock ? (
                  <p className="text-xs text-gray-400 animate-pulse">Checking godown stock…</p>
                ) : stockCheck ? (
                  stockCheck.available ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <span className="text-green-400 text-sm font-semibold">✅ Available in Godown</span>
                      <span className="text-xs text-gray-400">({stockCheck.quantity} units in stock)</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertTriangle size={14} className="text-red-400" />
                        <span className="text-red-400 text-sm font-semibold">⚠️ Insufficient Stock</span>
                        <span className="text-xs text-gray-400">(only {stockCheck.quantity} available)</span>
                      </div>
                      {!showReqForm ? (
                        <button onClick={() => setShowReqForm(true)} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/20 hover:bg-orange-500/25 transition-all">
                          <ShoppingCart size={13} /> Create Purchase Requisition
                        </button>
                      ) : (
                        <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-2">
                          <p className="text-xs font-semibold text-orange-400">Purchase Requisition</p>
                          <p className="text-xs text-gray-300">
                            Material: <strong className="text-white">{tripMeta.material_name}</strong><br />
                            Shortfall: <strong className="text-white">{Math.max(0, tripMeta.quantity - stockCheck.quantity)} {tripMeta.unit}</strong><br />
                            Site: <strong className="text-white">{tripMeta.site_name || '—'}</strong><br />
                            Urgency: <strong className="text-white">{tripMeta.urgency || 'normal'}</strong>
                          </p>
                          <button onClick={handleCreateRequisition} disabled={savingReq} className="btn-gold text-xs py-1.5 w-full">
                            {savingReq ? 'Saving…' : '📋 Submit Requisition (Pending Purchase)'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                ) : null}
              </div>
            )}

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="label">Destination Site</label>
                <SiteSelect value={tripForm.site_id} onChange={v => tf('site_id', v)} sites={sites} />
              </div>
              <div>
                <label className="label">Select Driver *</label>
                {loadingDrivers
                  ? <p className="text-xs text-gray-400 animate-pulse py-2">Loading drivers…</p>
                  : drivers.length === 0
                    ? <p className="text-xs text-red-400 py-2">No drivers found. Add a driver in Drivers section first.</p>
                    : <DriverSelect value={tripForm.driver_id} onChange={v => tf('driver_id', v)} drivers={drivers} />
                }
              </div>
              <div>
                <label className="label">Notes / Pickup Instructions</label>
                <textarea className="input" rows={2} placeholder="e.g. Pick up from Gate 2, handle with care…" value={tripForm.notes} onChange={e => tf('notes', e.target.value)} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setTripModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={savingTrip || loadingDrivers} className="btn-gold">
                  <Truck size={15} />
                  {savingTrip ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  )
}

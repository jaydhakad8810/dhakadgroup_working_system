import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal } from '../../components/ui'
import { Plus, Bell, Trash2, CheckCheck, Eye, Truck, AlertTriangle, ShoppingCart, Package } from 'lucide-react'

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

function parseMeta(n) {
  try { return JSON.parse(n.message) } catch { return null }
}

function urgencyBadge(u) {
  if (u === 'critical') return 'bg-red-500/20 text-red-400 border border-red-500/30'
  if (u === 'urgent')   return 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
  return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
}

// Step 1: Material request card — shows "Check Godown Stock" button
function MaterialRequestCard({ notif, onCheckStock }) {
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
          onClick={() => onCheckStock(notif, meta)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold-500/20 text-gold-400 border border-gold-500/30 hover:bg-gold-500/30 transition-all"
        >
          <Package size={13} />
          Check Godown Stock
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

  // Step 2: Stock check modal state
  const [stockModal, setStockModal] = useState(false)
  const [stockNotif, setStockNotif] = useState(null)
  const [stockMeta, setStockMeta] = useState(null)
  const [stockResult, setStockResult] = useState(null)
  const [checkingStock, setCheckingStock] = useState(false)
  const [checkingAll, setCheckingAll] = useState(false)

  // Step 3A: Trip modal state
  const [tripModal, setTripModal] = useState(false)
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [sites, setSites] = useState([])
  const [tripForm, setTripForm] = useState({ driver_id: '', site_id: '', notes: '', vehicle_id: '' })
  const [savingTrip, setSavingTrip] = useState(false)
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const tf = (k, v) => setTripForm(p => ({ ...p, [k]: v }))

  // Step 3B: Requisition modal state
  const [reqModal, setReqModal] = useState(false)
  const [reqForm, setReqForm] = useState({ urgency: 'normal', supplier_notes: '' })
  const [savingReq, setSavingReq] = useState(false)

  // Wage request review state
  const [reviewingWage, setReviewingWage] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [wageReviewed, setWageReviewed] = useState({})

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

  // Fetch drivers when trip modal opens (useEffect pattern)
  useEffect(() => {
    if (!tripModal) return
    setLoadingDrivers(true)
    Promise.all([
      api.get('/drivers'),
      api.get('/drivers/vehicles/all')
    ]).then(([dRes, vRes]) => {
      const active = (Array.isArray(dRes.data) ? dRes.data : (dRes.data?.data || [])).filter(d => d.is_active !== false)
      setDrivers(active)
      const allVehicles = Array.isArray(vRes.data) ? vRes.data : (vRes.data?.data || [])
      setVehicles(allVehicles)
    }).catch(e => {
      toast.error('Failed to load drivers')
    }).finally(() => setLoadingDrivers(false))
  }, [tripModal])

  // Step 2: Open stock check modal
  const openCheckModal = async (notif, meta) => {
    setStockNotif(notif)
    setStockMeta(meta)
    setStockResult(null)
    setStockModal(true)
    setCheckingStock(true)
    try {
      const res = await api.get(`/godown/stock/check?material_name=${encodeURIComponent(meta.material_name)}&quantity=${meta.quantity}`)
      setStockResult(res.data)
    } catch { toast.error('Failed to check stock') }
    setCheckingStock(false)
  }

  const closeStockModal = () => {
    setStockModal(false)
    setStockNotif(null)
    setStockMeta(null)
    setStockResult(null)
    setCheckingAll(false)
  }

  // Step 2b: Re-check including secondary godowns
  const checkAllGodowns = async () => {
    setCheckingAll(true)
    try {
      const res = await api.get(`/godown/stock/check?material_name=${encodeURIComponent(stockMeta.material_name)}&quantity=${stockMeta.quantity}&check_all=true`)
      setStockResult(res.data)
    } catch { toast.error('Failed to check all godowns') }
    setCheckingAll(false)
  }

  // Step 3A: Open trip modal (stock available)
  const openTripFromStock = async () => {
    setTripForm({ driver_id: '', site_id: stockMeta?.site_id || '', notes: '', vehicle_id: '' })
    setVehicles([])
    try {
      const sRes = await api.get('/sites')
      setSites(Array.isArray(sRes.data) ? sRes.data : (sRes.data?.data || []))
    } catch {}
    setStockModal(false)
    setTripModal(true)
  }

  // Step 3B: Open requisition modal (stock not available)
  const openReqFromStock = () => {
    setReqForm({
      material_name: stockMeta?.material_name || '',
      quantity: stockMeta?.quantity || '',
      unit: stockMeta?.unit || '',
      site_id: stockMeta?.site_id || '',
      site_name: stockMeta?.site_name || '',
      urgency: stockMeta?.urgency || 'normal',
      supplier_notes: '',
    })
    setStockModal(false)
    setReqModal(true)
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
        material_name: stockMeta?.material_name || '',
        material_quantity: stockMeta?.quantity || '',
        material_unit: stockMeta?.unit || '',
        vehicle_id: tripForm.vehicle_id || undefined,
        notes: tripForm.notes,
        status: 'pending',
      })
      // Deduct stock if available
      if (stockResult?.available && stockMeta?.material_name && stockMeta?.quantity) {
        await api.post('/godown/stock-out', {
          category_name: stockMeta.material_name,
          quantity: stockMeta.quantity,
          destination_type: 'site',
          site_id: tripForm.site_id || undefined,
          notes: 'Dispatched for material request – Trip assigned',
          godown_id: stockResult?.stocks?.[0]?.godown_id || undefined,
        }).catch(() => {})
      }
      if (stockNotif) await api.patch('/notifications/' + stockNotif.id + '/read').catch(() => {})
      toast.success('Trip created & driver assigned!')
      setTripModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create trip')
    }
    setSavingTrip(false)
  }

  const handleCreateRequisition = async () => {
    setSavingReq(true)
    try {
      await api.post('/godown/requisitions', {
        material_name: reqForm.material_name,
        quantity: reqForm.quantity,
        unit: reqForm.unit,
        site_id: reqForm.site_id,
        site_name: reqForm.site_name,
        urgency: reqForm.urgency,
      })
      toast.success('Purchase Requisition created successfully')
      if (stockNotif) await api.patch('/notifications/' + stockNotif.id + '/read').catch(() => {})
      setReqModal(false)
      load()
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

  async function reviewWageRequest(requestId, action, reason, notifId) {
    setReviewing(true)
    try {
      await api.patch(`/labour/wage-requests/${requestId}/review`, { action, rejection_reason: reason || '' })
      toast.success(action === 'approve' ? 'Wage request approved' : 'Wage request rejected')
      setReviewingWage(null)
      setRejectReason('')
      setWageReviewed(p => ({ ...p, [notifId]: { status: action === 'approve' ? 'approved' : 'rejected', rejection_reason: reason || '' } }))
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
    setReviewing(false)
  }

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
                ? <MaterialRequestCard notif={n} onCheckStock={openCheckModal} />
                : <p className="text-gray-400 text-sm mt-0.5">{n.message}</p>
              }
              {n.type === 'wage_request' && (() => {
                const meta = (n.metadata && typeof n.metadata === 'object') ? n.metadata : (() => { try { return JSON.parse(n.metadata || '{}') } catch { return {} } })()
                const localReview = wageReviewed[n.id]
                return (
                  <div style={{marginTop:'10px',padding:'10px',background:'var(--bg3)',borderRadius:'8px',border:'1px solid var(--border)'}}>
                    <div style={{fontSize:'13px',color:'var(--text)',marginBottom:'8px'}}>
                      <strong>{meta.supervisor_name}</strong> requests wage change for <strong>{meta.labour_name}</strong>
                      <br/>
                      <span style={{color:'var(--muted)'}}>₹{meta.current_wage}/day → ₹{meta.requested_wage}/day</span>
                      {meta.reason && <div style={{marginTop:'4px',color:'var(--muted)',fontStyle:'italic',fontSize:'12px'}}>Reason: {meta.reason}</div>}
                    </div>

                    {reviewingWage === n.id && (
                      <div style={{marginBottom:'8px'}}>
                        <input
                          placeholder="Rejection reason (required)"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          style={{width:'100%',background:'var(--bg2)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:'6px',padding:'6px 10px',fontSize:'13px',boxSizing:'border-box'}}
                        />
                        <div style={{display:'flex',gap:'6px',marginTop:'6px'}}>
                          <button
                            disabled={!rejectReason.trim() || reviewing}
                            onClick={() => reviewWageRequest(meta.request_id,'reject',rejectReason,n.id)}
                            style={{flex:1,background:'#dc2626',color:'white',border:'none',borderRadius:'6px',padding:'6px',fontSize:'13px',cursor:'pointer',opacity:(!rejectReason.trim()||reviewing)?0.5:1}}>
                            {reviewing ? 'Rejecting...' : 'Confirm Reject'}
                          </button>
                          <button
                            onClick={() => { setReviewingWage(null); setRejectReason('') }}
                            style={{flex:1,background:'var(--bg4)',color:'var(--text)',border:'1px solid var(--border)',borderRadius:'6px',padding:'6px',fontSize:'13px',cursor:'pointer'}}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {reviewingWage !== n.id && !localReview && (
                      <div style={{display:'flex',gap:'8px'}}>
                        <button
                          disabled={reviewing}
                          onClick={() => reviewWageRequest(meta.request_id,'approve','',n.id)}
                          style={{flex:1,background:'#16a34a',color:'white',border:'none',borderRadius:'6px',padding:'8px',fontSize:'13px',fontWeight:'bold',cursor:'pointer'}}>
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => setReviewingWage(n.id)}
                          style={{flex:1,background:'none',color:'#dc2626',border:'1px solid #dc2626',borderRadius:'6px',padding:'8px',fontSize:'13px',fontWeight:'bold',cursor:'pointer'}}>
                          ✗ Reject
                        </button>
                      </div>
                    )}

                    {localReview && (
                      <div style={{fontSize:'12px',color:localReview.status==='approved'?'#22c55e':'#dc2626',fontWeight:'bold'}}>
                        {localReview.status==='approved' ? '✓ Approved' : '✗ Rejected'}
                        {localReview.rejection_reason && ` — ${localReview.rejection_reason}`}
                      </div>
                    )}
                  </div>
                )
              })()}
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

      {/* ── Step 2: Stock Check Modal ── */}
      <Modal open={stockModal} onClose={closeStockModal} title="Godown Stock Check" size="md">
        {stockMeta && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-1">
              <p className="text-xs text-yellow-400 font-semibold">Material Request</p>
              <p className="text-sm text-white">📦 {stockMeta.quantity} {stockMeta.unit} of <strong>{stockMeta.material_name}</strong></p>
              {stockMeta.site_name && <p className="text-xs text-gray-300">📍 Site: {stockMeta.site_name}</p>}
              {stockMeta.supervisor_name && <p className="text-xs text-gray-300">👷 By: {stockMeta.supervisor_name}</p>}
            </div>

            {checkingStock ? (
              <p className="text-xs text-gray-400 animate-pulse text-center py-6">Checking godown stock…</p>
            ) : stockResult ? (
              stockResult.available ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <span className="text-green-400 font-bold text-sm">✅ Stock Available</span>
                    <span className="text-xs text-gray-400">({parseFloat(stockResult.quantity).toFixed(2)} units total)</span>
                  </div>
                  {stockResult.stocks?.filter(s => parseFloat(s.quantity) > 0).length > 0 && (
                    <div className="space-y-1 px-1">
                      {stockResult.stocks.filter(s => parseFloat(s.quantity) > 0).map(s => (
                        <div key={s.godown_id} className="flex justify-between items-center text-xs text-gray-400 py-0.5">
                          <span>{s.is_primary ? '⭐' : '📦'} {s.godown_name}</span>
                          <span className="text-green-400 font-semibold">{parseFloat(s.quantity).toFixed(2)} {stockMeta?.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={openTripFromStock} className="btn-gold w-full justify-center">
                    <Truck size={15} /> Create Trip &amp; Assign Driver
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                    <div>
                      <span className="text-red-400 font-bold text-sm">
                        {stockResult.checked_primary_only ? 'Insufficient in Primary Godowns' : 'Insufficient in All Godowns'}
                      </span>
                      <p className="text-xs text-gray-400">Only {parseFloat(stockResult.quantity).toFixed(2)} available, need {stockMeta.quantity} {stockMeta.unit}</p>
                    </div>
                  </div>
                  {stockResult.checked_primary_only && (
                    <button
                      onClick={checkAllGodowns}
                      disabled={checkingAll}
                      className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 font-semibold text-sm transition-all disabled:opacity-50"
                    >
                      <Package size={15} />
                      {checkingAll ? 'Checking all godowns…' : '🔍 Check All Godowns (incl. secondary)'}
                    </button>
                  )}
                  {!stockResult.checked_primary_only && stockResult.stocks?.filter(s => parseFloat(s.quantity) > 0).length > 0 && (
                    <div className="space-y-1 p-3 rounded-xl border border-dark-600" style={{ background: 'var(--bg3)' }}>
                      <p className="text-xs font-semibold text-gray-400 mb-1">Stock found in godowns:</p>
                      {stockResult.stocks.filter(s => parseFloat(s.quantity) > 0).map(s => (
                        <div key={s.godown_id} className="flex justify-between items-center text-xs py-0.5">
                          <span className="text-gray-400">{s.is_primary ? '⭐' : '📦'} {s.godown_name}</span>
                          <span className="text-gray-300 font-semibold">{parseFloat(s.quantity).toFixed(2)} {stockMeta.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={openReqFromStock} className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/20 hover:bg-orange-500/25 font-semibold text-sm transition-all">
                    <ShoppingCart size={15} /> Create Purchase Requisition
                  </button>
                </div>
              )
            ) : null}
          </div>
        )}
      </Modal>

      {/* ── Step 3A: Create Trip Modal ── */}
      <Modal open={tripModal} onClose={() => { setTripModal(false); setDrivers([]) }} title="Create Trip & Assign Driver" size="md">
        <div className="space-y-4">
          {stockMeta && (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-1">
              <p className="text-xs text-yellow-400 font-semibold">Material Request Details</p>
              <p className="text-sm text-white">📦 {stockMeta.quantity} {stockMeta.unit} of <strong>{stockMeta.material_name}</strong></p>
              {stockMeta.site_name && <p className="text-xs text-gray-300">📍 {stockMeta.site_name}</p>}
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
                  ? <p className="text-xs text-red-400 py-2">No drivers found. Please add a driver in the Drivers section first.</p>
                  : <DriverSelect value={tripForm.driver_id} onChange={v => tf('driver_id', v)} drivers={drivers} />
              }
            </div>
            {vehicles.length > 0 && (
              <div>
                <label className="label">Assign Vehicle</label>
                <select className="select" value={tripForm.vehicle_id} onChange={e => tf('vehicle_id', e.target.value)}>
                  <option value="">-- Select Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} {v.make ? '· ' + v.make : ''} {v.model || ''}</option>
                  ))}
                </select>
              </div>
            )}
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
      </Modal>

      {/* ── Step 3B: Purchase Requisition Modal ── */}
      <Modal open={reqModal} onClose={() => setReqModal(false)} title="Create Purchase Requisition" size="md">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-1">
            <p className="text-xs text-orange-400 font-semibold">Requisition Details</p>
            <p className="text-sm text-white">📦 {reqForm.quantity} {reqForm.unit} of <strong>{reqForm.material_name}</strong></p>
            {reqForm.site_name && <p className="text-xs text-gray-300">📍 {reqForm.site_name}</p>}
            {stockResult && <p className="text-xs text-red-400">Shortfall: {Math.max(0, parseFloat(reqForm.quantity || 0) - parseFloat(stockResult.quantity || 0)).toFixed(2)} {reqForm.unit}</p>}
          </div>
          <div>
            <label className="label">Urgency</label>
            <div className="flex gap-2">
              {['normal', 'urgent', 'critical'].map(u => (
                <button key={u} type="button" onClick={() => setReqForm(p => ({ ...p, urgency: u }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                    reqForm.urgency === u
                      ? u === 'critical' ? 'bg-red-500 text-white' : u === 'urgent' ? 'bg-orange-500 text-white' : 'bg-gold-500 text-black'
                      : 'bg-surface-300 text-gray-400'
                  }`}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Supplier Notes <span className="text-gray-500 text-xs">(optional)</span></label>
            <textarea className="input" rows={2} placeholder="Preferred supplier, brand, specifications…" value={reqForm.supplier_notes} onChange={e => setReqForm(p => ({ ...p, supplier_notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setReqModal(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleCreateRequisition} disabled={savingReq} className="btn-gold">
              <ShoppingCart size={15} />
              {savingReq ? 'Submitting...' : '📋 Submit Requisition'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Package, Plus, ArrowUp, ArrowDown, Loader2, CheckCircle, Camera, Upload, X } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, EmptyState, StatusBadge, Modal } from '../../components/ui'

// Minimal photo picker used for delivery/receipt photos
function PhotoPicker({ value, onChange, label }) {
  const cameraRef = useRef(null)
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/upload/single', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      onChange(res.data?.url || res.data?.data?.url || '')
    } catch { toast.error('Photo upload failed') }
    setUploading(false)
  }

  if (uploading) return <p className="text-xs text-gray-400 py-2">Uploading…</p>

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <img src={value} alt="photo" className="w-14 h-14 object-cover rounded-xl border border-white/10" />
        <button type="button" onClick={() => onChange('')} className="text-red-400 p-1"><X size={14} /></button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => cameraRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-2 bg-surface-400 rounded-xl text-gray-400 hover:text-primary-400 text-sm min-h-[44px]">
        <Camera size={15} /> Camera
      </button>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-2 bg-surface-400 rounded-xl text-gray-400 hover:text-primary-400 text-sm min-h-[44px]">
        <Upload size={15} /> {label || 'Upload'}
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => upload(e.target.files[0])} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => upload(e.target.files[0])} />
    </div>
  )
}

// Delivery confirmation form — defined OUTSIDE parent
function DeliveryConfirmForm({ delivery, onClose, onDone }) {
  const [photo, setPhoto] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch(`/godown/requests/${delivery.id}/confirm-delivery`, { delivery_photo: photo || undefined, notes: notes || undefined })
      if (delivery.site_id) {
        await api.post('/godown/stock-in-site', {
          site_id: delivery.site_id,
          category_name: delivery.material_name,
          quantity: delivery.quantity,
          notes: notes || undefined,
          photo: photo || undefined,
        }).catch(() => {})
      }
      toast.success('Delivery confirmed!')
      onDone()
    } catch { toast.error('Failed to confirm delivery') }
    setSaving(false)
  }

  return (
    <form onSubmit={handleConfirm} className="space-y-4">
      <div className="p-3 bg-surface-400 rounded-xl space-y-1">
        <p className="text-white font-semibold">{delivery.material_name}</p>
        <p className="text-gray-400 text-sm">{delivery.quantity} {delivery.unit || ''} · {delivery.site?.name || ''}</p>
        {delivery.notes && <p className="text-gray-500 text-xs">{delivery.notes}</p>}
      </div>
      <div>
        <label className="label">Delivery Photo <span className="text-gray-500 text-xs">(optional)</span></label>
        <PhotoPicker value={photo} onChange={setPhoto} label="Delivery" />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Condition of delivery, remarks…" />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          {saving ? 'Confirming…' : 'Confirm Receipt'}
        </button>
      </div>
    </form>
  )
}

export default function GodownSupervisor() {
  const [godowns, setGodowns]       = useState([])
  const [allGodowns, setAllGodowns] = useState([])
  const [requests, setRequests]     = useState([])
  const [sites, setSites]           = useState([])
  const [allSites, setAllSites]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('stock')
  const [selected, setSelected]     = useState(null)
  const [history, setHistory]       = useState([])

  // Request material modal
  const [reqModal, setReqModal]     = useState(false)
  const [reqForm, setReqForm]       = useState({ urgency: 'normal', quantity: '' })
  const [requesting, setRequesting] = useState(false)

  // Stock In modal
  const [stockInModal, setStockInModal]   = useState(false)
  const [stockInForm, setStockInForm]     = useState({ category_id: '', category_name: '', quantity: '', unit: 'units', delivery_photo: '', receipt_photo: '', notes: '' })
  const [stockInSaving, setStockInSaving] = useState(false)

  // Stock Out / Transfer modal
  const [outModal, setOutModal]     = useState(null)
  const [outForm, setOutForm]       = useState({ type: 'site', to_site_id: '', to_godown_id: '', quantity: '', notes: '' })
  const [outSaving, setOutSaving]   = useState(false)

  // Delivery confirmation modal
  const [delivModal, setDelivModal] = useState(null)

  // WO material hints for quick-select in request form
  const [woMaterials, setWoMaterials] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const [g, r, s, all, cats] = await Promise.all([
        api.get('/godown'),
        api.get('/godown/requests/all'),
        api.get('/sites'),
        api.get('/godown'),
        api.get('/godown/category').catch(() => ({ data: [] })),
      ])
      const godownsList = Array.isArray(g.data) ? g.data : (g.data?.data || [])
      const sitesList   = Array.isArray(s.data) ? s.data : (s.data?.data || [])
      setGodowns(godownsList)
      setAllGodowns(Array.isArray(all.data) ? all.data : (all.data?.data || []))
      setRequests(Array.isArray(r.data) ? r.data : (r.data?.data || []))
      setSites(sitesList)
      setCategories(Array.isArray(cats.data) ? cats.data : [])
      if (!selected && godownsList.length) setSelected(godownsList[0].id)
    } catch {}
    setLoading(false)
  }

  const openReqModal = async () => {
    setReqModal(true)
    try {
      const res = await api.get('/sites/all')
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      setAllSites(list)
      if (list.length === 1) setReqForm(p => ({ ...p, site_id: list[0].id }))
    } catch {
      setAllSites(sites)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('request') === 'true') {
      setReqModal(true)
      const woId = params.get('wo_id')
      if (woId) setReqForm(prev => ({ ...prev, work_order_id: woId }))
    }
  }, [])

  useEffect(() => {
    api.get('/workorders?status=active').then(r => {
      const wos = Array.isArray(r.data) ? r.data : (r.data?.data || [])
      const names = new Set()
      wos.forEach(wo => {
        const mats = wo.materials || wo.WorkOrderMaterials || []
        mats.forEach(m => { if (m.name) names.add(m.name) })
      })
      setWoMaterials([...names])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selected) {
      api.get(`/godown/${selected}/history`).then(r => setHistory(r.data)).catch(() => {})
    }
  }, [selected])

  const selectedGodown = godowns.find(g => g.id === selected)
  const otherGodowns   = allGodowns.filter(g => g.id !== selected)
  const deliveries     = requests.filter(r => r.status === 'dispatched')

  // Group history entries by date for the history tab
  const groupedHistory = history.reduce((acc, h) => {
    const date = new Date(h.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(h)
    return acc
  }, {})

  const shareDay = (date, items) => {
    const lines = [`*Stock Report — ${date}*`, '']
    items.forEach(h => {
      lines.push(
        `${h.type === 'in' ? '⬇️ IN' : '⬆️ OUT'} ${h.quantity} × ${h.category?.name || 'Material'}` +
        (h.notes ? ' | ' + h.notes : '')
      )
    })
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }

  // ── Request Material
  const [lastRequest, setLastRequest] = useState(null)

  const handleRequest = async (e) => {
    e.preventDefault(); setRequesting(true)
    try {
      const res = await api.post('/godown/requests', reqForm)
      setLastRequest({ ...reqForm, id: res.data?.id })
      toast.success(`✅ Request sent: ${reqForm.quantity} ${reqForm.unit || ''} of ${reqForm.material_name}`)
      setReqModal(false)
      setReqForm({ urgency: 'normal', quantity: '' })
      const updated = await api.get('/godown/requests/all')
      setRequests(Array.isArray(updated.data) ? updated.data : (updated.data?.data || []))
    } catch { toast.error('Request failed') }
    setRequesting(false)
  }

  // ── Stock In
  const handleStockIn = async (e) => {
    e.preventDefault(); setStockInSaving(true)
    try {
      const site = selectedGodown?.site_id
        ? `godown ${selectedGodown.name}`
        : selectedGodown?.name || 'godown'
      await api.post('/godown/stock-in', {
        godown_id: selected,
        category_id: stockInForm.category_id || undefined,
        category_name: !stockInForm.category_id ? stockInForm.category_name : undefined,
        quantity: stockInForm.quantity,
        unit: stockInForm.unit,
        notes: [
          stockInForm.notes,
          stockInForm.delivery_photo ? `Delivery photo: ${stockInForm.delivery_photo}` : '',
          stockInForm.receipt_photo  ? `Receipt photo: ${stockInForm.receipt_photo}`   : '',
        ].filter(Boolean).join(' | '),
        photo: stockInForm.delivery_photo || stockInForm.receipt_photo || undefined,
      })
      await api.post('/godown/requests', {
        material_name: stockInForm.category_name || categories.find(c => c.id === stockInForm.category_id)?.name || 'Material',
        quantity: stockInForm.quantity,
        unit: stockInForm.unit,
        notes: `Stock IN recorded at ${site}. ${stockInForm.notes || ''}`,
        urgency: 'normal',
        site_id: selectedGodown?.site_id || undefined,
        _info_only: true,
      }).catch(() => {})
      toast.success('Stock IN recorded!')
      setStockInModal(false)
      setStockInForm({ category_id: '', category_name: '', quantity: '', unit: 'units', delivery_photo: '', receipt_photo: '', notes: '' })
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Stock In failed') }
    setStockInSaving(false)
  }

  // ── Stock Out / Transfer
  const handleStockOut = async (e) => {
    e.preventDefault(); setOutSaving(true)
    try {
      if (outForm.type === 'site') {
        await api.post('/godown/transfer/site', {
          godown_id: selected,
          site_id: outForm.to_site_id,
          category_id: outModal?.category_id,
          quantity: outForm.quantity,
          notes: outForm.notes,
        })
        toast.success('Stock dispatched to site!')
      } else if (outForm.type === 'godown') {
        await api.post('/godown/transfer/godown', {
          from_godown_id: selected,
          to_godown_id: outForm.to_godown_id,
          category_id: outModal?.category_id,
          quantity: outForm.quantity,
          notes: outForm.notes,
        })
        toast.success('Stock returned to godown!')
      } else {
        await api.post('/godown/stock-out', {
          godown_id: selected,
          category_id: outModal?.category_id,
          quantity: outForm.quantity,
          destination_type: 'dispatch',
          notes: outForm.notes,
        })
        toast.success('Stock dispatched!')
      }
      setOutModal(null)
      setOutForm({ type: 'site', to_site_id: '', to_godown_id: '', quantity: '', notes: '' })
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Transfer failed') }
    setOutSaving(false)
  }

  const markReceived = async (id) => {
    try {
      await api.patch(`/godown/requests/${id}/status`, { status: 'received' })
      toast.success('Marked as received'); load()
    } catch { toast.error('Failed') }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="page-content space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-surface-400 rounded-xl p-1 overflow-x-auto">
        {['stock', 'request', 'deliveries', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap ${tab === t ? 'bg-primary-500 text-white' : 'text-gray-400'}`}>
            {t === 'request'
              ? `Requests (${requests.filter(r => r.status === 'pending').length})`
              : t === 'deliveries'
              ? `Deliveries${deliveries.length ? ` (${deliveries.length})` : ''}`
              : t === 'stock' ? 'My Stock' : 'History'}
          </button>
        ))}
      </div>

      {/* ── REQUEST TAB ── */}
      {tab === 'request' && (
        <div className="space-y-3">
          <button onClick={openReqModal} className="btn-primary w-full">
            <Plus size={18} /> Request Material from Godown
          </button>
          {lastRequest && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl space-y-1">
              <p className="text-green-400 font-semibold text-sm">✅ Last Request Sent</p>
              <p className="text-xs text-gray-300">📦 {lastRequest.quantity} {lastRequest.unit || ''} of <strong>{lastRequest.material_name}</strong></p>
              <p className="text-xs text-gray-400">Urgency: {lastRequest.urgency} · Admin will review and dispatch</p>
            </div>
          )}
          {requests.map(r => (
            <div key={r.id} className="card space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold">{r.material_name}</p>
                  <p className="text-gray-400 text-xs">{r.quantity} {r.unit} · {r.site?.name}</p>
                  <p className="text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={r.urgency === 'critical' ? 'badge-red' : r.urgency === 'urgent' ? 'badge-orange' : 'badge-gray'}>{r.urgency}</span>
                  <StatusBadge status={r.status} />
                </div>
              </div>
              {r.notes && <p className="text-gray-500 text-xs">{r.notes}</p>}
              {r.status === 'dispatched' && (
                <button onClick={() => setDelivModal(r)} className="btn-primary w-full py-2 text-sm">
                  <CheckCircle size={16} /> Confirm Delivery
                </button>
              )}
            </div>
          ))}
          {!requests.length && <EmptyState icon={Package} title="No requests" message="Request materials from admin godown" />}
        </div>
      )}

      {/* ── DELIVERIES TAB ── */}
      {tab === 'deliveries' && (
        <div className="space-y-3">
          {deliveries.length === 0 && (
            <EmptyState icon={Package} title="No pending deliveries" message="Dispatched materials will appear here for confirmation" />
          )}
          {deliveries.map(d => (
            <div key={d.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white font-semibold">{d.material_name}</p>
                  <p className="text-gray-400 text-xs">{d.quantity} {d.unit || ''} · {d.site?.name}</p>
                  <p className="text-gray-500 text-xs">{new Date(d.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <span className="badge-orange text-xs">Dispatched</span>
              </div>
              {d.notes && <p className="text-gray-500 text-xs">{d.notes}</p>}
              <button
                onClick={() => setDelivModal(d)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/15 text-green-400 border border-green-500/20 text-sm font-semibold">
                <CheckCircle size={16} /> Confirm Receipt
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── STOCK TAB ── */}
      {tab === 'stock' && (
        <div className="space-y-3">
          {godowns.length > 1 && (
            <select className="select" value={selected || ''} onChange={e => setSelected(e.target.value)}>
              {godowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}

          {selectedGodown ? (
            <>
              <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-between gap-2">
                <div>
                  <p className="text-primary-400 font-semibold">{selectedGodown.name}</p>
                  <p className="text-gray-400 text-xs">{selectedGodown.location} · {selectedGodown.stocks?.length || 0} materials</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStockInModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/20 text-green-400 text-xs font-semibold min-h-[40px]">
                    <ArrowDown size={14} /> Stock In
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {selectedGodown.stocks?.map(stock => (
                  <div key={stock.id} className="card flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                      <Package size={18} className="text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{stock.category?.name}</p>
                      <p className="text-gray-500 text-xs">{stock.category?.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${stock.min_threshold && parseFloat(stock.quantity) <= parseFloat(stock.min_threshold) ? 'text-red-400' : 'text-primary-400'}`}>
                        {stock.quantity}
                      </p>
                      <button
                        onClick={() => {
                          setOutModal({ stockId: stock.id, name: stock.category?.name, qty: stock.quantity, category_id: stock.category_id })
                          setOutForm({ type: 'site', to_site_id: '', to_godown_id: '', quantity: '', notes: '' })
                        }}
                        className="text-xs text-gray-400 hover:text-primary-400 flex items-center gap-1 mt-0.5">
                        <ArrowUp size={10} /> Stock Out
                      </button>
                    </div>
                  </div>
                ))}
                {!selectedGodown.stocks?.length && <p className="text-center text-gray-500 py-8">No stock in this godown</p>}
              </div>
            </>
          ) : (
            <EmptyState icon={Package} title="No godown assigned" message="Contact admin to assign a godown to you" />
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── grouped by date with WhatsApp share */}
      {tab === 'history' && (
        <div className="space-y-4">
          {Object.keys(groupedHistory).length === 0 && (
            <p className="text-center text-gray-500 py-10">No history yet</p>
          )}
          {Object.entries(groupedHistory).map(([date, items]) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{date}</p>
                <button
                  onClick={() => shareDay(date, items)}
                  className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">
                  📤 Share
                </button>
              </div>
              {items.map(h => (
                <div key={h.id} className="card-sm flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${h.type === 'in' ? 'bg-green-500/20' : h.type === 'dispatch' ? 'bg-orange-500/20' : 'bg-red-500/20'}`}>
                    <span className={`text-base font-bold ${h.type === 'in' ? 'text-green-400' : h.type === 'dispatch' ? 'text-orange-400' : 'text-red-400'}`}>
                      {h.type === 'in' ? '↓' : h.type === 'dispatch' ? '🚚' : '↑'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{h.category?.name || 'Material'}</p>
                    {h.notes && <p className="text-gray-600 text-xs truncate">{h.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold text-sm ${h.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                      {h.type === 'in' ? '+' : '-'}{h.quantity}
                    </p>
                    <p className="text-gray-500 text-xs capitalize">{h.type}</p>
                    {h.photo && <a href={h.photo} target="_blank" rel="noreferrer" className="text-xs text-blue-400">📷</a>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── REQUEST MATERIAL MODAL ── */}
      <Modal open={reqModal} onClose={() => setReqModal(false)} title="Request Material"><div style={{ paddingBottom: 100 }}>
        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label className="label">Material Name *</label>
            {woMaterials.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {woMaterials.map(m => (
                  <button key={m} type="button"
                    onClick={() => setReqForm(p => ({ ...p, material_name: m }))}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${reqForm.material_name === m ? 'bg-primary-500 text-white' : 'bg-surface-400 text-gray-400'}`}>
                    {m}
                  </button>
                ))}
              </div>
            )}
            <input className="input" required value={reqForm.material_name || ''} onChange={e => setReqForm(p => ({ ...p, material_name: e.target.value }))} placeholder="e.g. Cement, Steel rods…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity *</label>
              <input type="number" className="input" required value={reqForm.quantity} onChange={e => setReqForm(p => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" value={reqForm.unit || ''} onChange={e => setReqForm(p => ({ ...p, unit: e.target.value }))} placeholder="bags, kg, pcs…" />
            </div>
          </div>
          <div>
            <label className="label">Site *</label>
            <select className="select" required value={reqForm.site_id || ''} onChange={e => setReqForm(p => ({ ...p, site_id: e.target.value }))}>
              <option value="">Select site</option>
              {(allSites.length > 0 ? allSites : sites).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Urgency</label>
            <div className="flex gap-2">
              {['normal', 'urgent', 'critical'].map(u => (
                <button key={u} type="button" onClick={() => setReqForm(p => ({ ...p, urgency: u }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                    reqForm.urgency === u
                      ? u === 'critical' ? 'bg-red-500 text-white'
                      : u === 'urgent' ? 'bg-orange-500 text-white'
                      : 'bg-primary-500 text-white'
                      : 'bg-surface-200 text-gray-400'
                  }`}>{u}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={reqForm.notes || ''} onChange={e => setReqForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <button type="submit" disabled={requesting} className="btn-primary w-full">
            {requesting ? <Loader2 size={18} className="animate-spin" /> : null}
            {requesting ? 'Sending…' : 'Send Request'}
          </button>
        </form>
      </div></Modal>

      {/* ── STOCK IN MODAL ── */}
      <Modal open={stockInModal} onClose={() => setStockInModal(false)} title="📥 Stock In">
        <form onSubmit={handleStockIn} className="space-y-4">
          <div>
            <label className="label">Material</label>
            {categories.length > 0 ? (
              <select className="select" value={stockInForm.category_id} onChange={e => setStockInForm(p => ({ ...p, category_id: e.target.value, category_name: '' }))}>
                <option value="">Select or type below</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : null}
            {!stockInForm.category_id && (
              <input className="input mt-2" placeholder="Or type material name…" value={stockInForm.category_name} onChange={e => setStockInForm(p => ({ ...p, category_name: e.target.value }))} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity *</label>
              <input type="number" step="any" min="0.01" className="input" required value={stockInForm.quantity} onChange={e => setStockInForm(p => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="label">Unit</label>
              <input className="input" placeholder="kg, bags…" value={stockInForm.unit} onChange={e => setStockInForm(p => ({ ...p, unit: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Delivery Photo</label>
            <PhotoPicker value={stockInForm.delivery_photo} onChange={v => setStockInForm(p => ({ ...p, delivery_photo: v }))} label="Delivery" />
          </div>
          <div>
            <label className="label">Receipt Photo <span className="text-gray-500 text-xs">(optional)</span></label>
            <PhotoPicker value={stockInForm.receipt_photo} onChange={v => setStockInForm(p => ({ ...p, receipt_photo: v }))} label="Receipt" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={stockInForm.notes} onChange={e => setStockInForm(p => ({ ...p, notes: e.target.value }))} placeholder="Supplier name, bill number…" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStockInModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={stockInSaving || (!stockInForm.category_id && !stockInForm.category_name) || !stockInForm.quantity} className="btn-primary flex-1">
              {stockInSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              {stockInSaving ? 'Saving…' : 'Record Stock In'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── STOCK OUT / TRANSFER MODAL ── */}
      <Modal open={!!outModal} onClose={() => setOutModal(null)} title={`Stock Out: ${outModal?.name}`}>
        <form onSubmit={handleStockOut} className="space-y-4">
          <div className="p-3 bg-surface-400 rounded-xl text-sm">
            <p className="text-gray-400">Available: <span className="text-primary-400 font-bold">{outModal?.qty}</span></p>
          </div>
          <div>
            <label className="label">Destination *</label>
            <div className="flex gap-2">
              {[{ v: 'site', label: '🏗️ To Site' }, { v: 'godown', label: '🏭 To Godown' }, { v: 'dispatch', label: '🚚 Dispatch' }].map(opt => (
                <button key={opt.v} type="button"
                  onClick={() => setOutForm(p => ({ ...p, type: opt.v, to_site_id: '', to_godown_id: '' }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${outForm.type === opt.v ? 'bg-primary-500 text-white' : 'bg-surface-200 text-gray-400'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {outForm.type === 'site' && (
            <div>
              <label className="label">Destination Site *</label>
              <select className="select" required value={outForm.to_site_id} onChange={e => setOutForm(p => ({ ...p, to_site_id: e.target.value }))}>
                <option value="">Select</option>
                {(allSites.length > 0 ? allSites : sites).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <p className="text-xs text-orange-400 mt-1">Admin will be notified to create a delivery trip.</p>
            </div>
          )}
          {outForm.type === 'godown' && (
            <div>
              <label className="label">Destination Godown *</label>
              <select className="select" required value={outForm.to_godown_id} onChange={e => setOutForm(p => ({ ...p, to_godown_id: e.target.value }))}>
                <option value="">Select</option>
                {otherGodowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          {outForm.type === 'dispatch' && (
            <p className="text-xs text-gray-400 bg-surface-400 rounded-xl p-3">Stock will be marked as dispatched out of godown.</p>
          )}
          <div>
            <label className="label">Quantity *</label>
            <input type="number" step="any" min="0.01" className="input" required max={outModal?.qty} value={outForm.quantity} onChange={e => setOutForm(p => ({ ...p, quantity: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={outForm.notes} onChange={e => setOutForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setOutModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={outSaving} className="btn-primary flex-1">
              {outSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              {outSaving ? 'Processing…' : 'Confirm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── DELIVERY CONFIRM MODAL ── */}
      <Modal open={!!delivModal} onClose={() => setDelivModal(null)} title="Confirm Delivery">
        {delivModal && (
          <DeliveryConfirmForm
            delivery={delivModal}
            onClose={() => setDelivModal(null)}
            onDone={() => { setDelivModal(null); load() }}
          />
        )}
      </Modal>
    </div>
  )
}

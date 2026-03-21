import { useEffect, useState } from 'react'
import { Package, Truck, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, EmptyState, StatusBadge, Modal } from '../../components/ui'

export default function MaterialRequests() {
  const [requests, setRequests]   = useState([])
  const [godowns, setGodowns]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('approved') // approved = driver action needed
  const [dispatchModal, setDispatchModal] = useState(null)
  const [dispatchForm, setDispatchForm]   = useState({ godown_id: '', quantity: '', notes: '' })
  const [dispatching, setDispatching]     = useState(false)
  const [stockCheck, setStockCheck]       = useState(null) // available stock for selected godown

  const load = async () => {
    setLoading(true)
    try {
      const [r, g] = await Promise.all([api.get('/godown/requests/all'), api.get('/godown')])
      setRequests(r.data); setGodowns(g.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const checkStock = async (godownId, materialName) => {
    if (!godownId) { setStockCheck(null); return }
    try {
      const g = await api.get(`/godown/${godownId}`)
      const match = g.data.stocks?.find(s =>
        s.category?.name?.toLowerCase().includes(materialName?.toLowerCase())
      )
      setStockCheck(match ? { available: match.quantity, unit: match.category?.unit, category_id: match.category_id } : { available: 0 })
    } catch { setStockCheck(null) }
  }

  const handleDispatch = async (e) => {
    e.preventDefault()
    if (!dispatchForm.godown_id) return toast.error('Select godown')
    setDispatching(true)
    try {
      // Transfer from godown to site
      await api.post('/godown/transfer/site', {
        godown_id: dispatchForm.godown_id,
        site_id:   dispatchModal.site_id,
        category_id: stockCheck?.category_id,
        category_name: dispatchModal.material_name,
        quantity:  dispatchForm.quantity || dispatchModal.quantity,
        notes:     dispatchForm.notes,
        request_id: dispatchModal.id
      })
      // Update request status to dispatched
      await api.patch(`/godown/requests/${dispatchModal.id}/status`, { status: 'dispatched' })
      toast.success(`${dispatchModal.material_name} dispatched to ${dispatchModal.site?.name}!`)
      setDispatchModal(null)
      setDispatchForm({ godown_id: '', quantity: '', notes: '' })
      setStockCheck(null)
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Dispatch failed') }
    setDispatching(false)
  }

  const filtered = requests.filter(r => {
    if (filter === 'approved') return r.status === 'approved'
    if (filter === 'dispatched') return r.status === 'dispatched'
    if (filter === 'all') return true
    return r.status === filter
  })

  if (loading) return <LoadingPage />

  return (
    <div className="page-content space-y-4">
      {/* Filter */}
      <div className="flex gap-1 bg-surface-400 rounded-xl p-1">
        {[
          ['approved', `Action Needed (${requests.filter(r=>r.status==='approved').length})`],
          ['dispatched', 'Dispatched'],
          ['all', 'All'],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${filter===val ? 'bg-primary-500 text-white' : 'text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(r => (
          <div key={r.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-white font-semibold">{r.material_name}</p>
                <p className="text-gray-400 text-sm">{r.quantity} {r.unit}</p>
                <p className="text-gray-500 text-xs">Site: {r.site?.name}</p>
                <p className="text-gray-600 text-xs">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={r.urgency==='critical' ? 'badge-red' : r.urgency==='urgent' ? 'badge-orange' : 'badge-gray'}>{r.urgency}</span>
                <StatusBadge status={r.status}/>
              </div>
            </div>
            {r.notes && <p className="text-gray-500 text-xs bg-surface-400 p-2 rounded-lg">{r.notes}</p>}
            {r.status === 'approved' && (
              <button
                onClick={() => { setDispatchModal(r); setDispatchForm({ godown_id:'', quantity: r.quantity, notes:'' }); setStockCheck(null) }}
                className="btn-primary w-full py-2.5">
                <Truck size={16}/> Check Stock & Dispatch
              </button>
            )}
            {r.status === 'dispatched' && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle size={16}/> Dispatched — waiting for supervisor to confirm
              </div>
            )}
          </div>
        ))}
        {!filtered.length && (
          <EmptyState icon={Package} title="No requests"
            message={filter==='approved' ? 'No material requests need your action' : 'No requests found'}/>
        )}
      </div>

      {/* Dispatch Modal */}
      <Modal open={!!dispatchModal} onClose={() => { setDispatchModal(null); setStockCheck(null) }}
        title={`Dispatch: ${dispatchModal?.material_name}`}>
        <form onSubmit={handleDispatch} className="space-y-4">
          {/* Request summary */}
          <div className="p-3 bg-surface-400 rounded-xl text-sm space-y-1">
            <p className="text-gray-400">Material: <span className="text-white font-medium">{dispatchModal?.material_name}</span></p>
            <p className="text-gray-400">Required: <span className="text-primary-400 font-bold">{dispatchModal?.quantity} {dispatchModal?.unit}</span></p>
            <p className="text-gray-400">To Site: <span className="text-white">{dispatchModal?.site?.name}</span></p>
          </div>

          {/* Godown selection + stock check */}
          <div>
            <label className="label">Select Godown to Pick From</label>
            <select className="select" value={dispatchForm.godown_id}
              onChange={e => { setDispatchForm(p=>({...p,godown_id:e.target.value})); checkStock(e.target.value, dispatchModal?.material_name) }}>
              <option value="">Select godown</option>
              {godowns.map(g => <option key={g.id} value={g.id}>{g.name} — {g.location}</option>)}
            </select>
          </div>

          {/* Stock availability */}
          {dispatchForm.godown_id && (
            <div className={`p-3 rounded-xl text-sm ${
              stockCheck === null ? 'bg-surface-400' :
              stockCheck.available >= parseFloat(dispatchModal?.quantity||0) ? 'bg-green-500/10 border border-green-500/20' :
              'bg-red-500/10 border border-red-500/20'
            }`}>
              {stockCheck === null
                ? <p className="text-gray-400">Checking stock…</p>
                : stockCheck.available === 0
                  ? <div className="flex items-center gap-2 text-red-400"><AlertTriangle size={16}/><p>Material not found in this godown</p></div>
                  : stockCheck.available < parseFloat(dispatchModal?.quantity||0)
                    ? <div className="flex items-center gap-2 text-orange-400"><AlertTriangle size={16}/><p>Only {stockCheck.available} {stockCheck.unit} available (need {dispatchModal?.quantity})</p></div>
                    : <div className="flex items-center gap-2 text-green-400"><CheckCircle size={16}/><p>Available: {stockCheck.available} {stockCheck.unit} ✓</p></div>
              }
            </div>
          )}

          <div>
            <label className="label">Quantity to Dispatch</label>
            <input type="number" className="input" required
              max={stockCheck?.available}
              value={dispatchForm.quantity}
              onChange={e => setDispatchForm(p=>({...p,quantity:e.target.value}))}/>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={dispatchForm.notes} onChange={e => setDispatchForm(p=>({...p,notes:e.target.value}))} placeholder="Delivery notes…"/>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => { setDispatchModal(null); setStockCheck(null) }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={dispatching || !dispatchForm.godown_id}
              className="btn-primary flex-1">
              {dispatching ? <Loader2 size={16} className="animate-spin"/> : <Truck size={16}/>}
              {dispatching ? 'Dispatching…' : 'Dispatch Now'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

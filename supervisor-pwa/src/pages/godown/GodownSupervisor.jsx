import { useEffect, useState } from 'react'
import { Package, Plus, ArrowUp, Loader2, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, EmptyState, StatusBadge, Modal } from '../../components/ui'

export default function GodownSupervisor() {
  const [godowns, setGodowns]     = useState([])   // godowns incharge has
  const [allGodowns, setAllGodowns] = useState([]) // all godowns for return transfer
  const [requests, setRequests]   = useState([])
  const [sites, setSites]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('stock')  // stock | request | history
  const [selected, setSelected]   = useState(null)
  const [history, setHistory]     = useState([])

  // Request material modal
  const [reqModal, setReqModal]   = useState(false)
  const [reqForm, setReqForm]     = useState({ urgency: 'normal', quantity: '' })
  const [requesting, setRequesting] = useState(false)

  // Stock out modal (send to site or return to main godown)
  const [outModal, setOutModal]   = useState(null)  // { stockId, name, qty, category_id }
  const [outForm, setOutForm]     = useState({ type: 'site', to_site_id: '', to_godown_id: '', quantity: '', notes: '', photo: '' })
  const [outSaving, setOutSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [g, r, s, all] = await Promise.all([
        api.get('/godown'),          // godowns this supervisor manages
        api.get('/godown/requests/all'),
        api.get('/sites'),
        api.get('/godown'),
      ])
      const godownsList = Array.isArray(g.data) ? g.data : (g.data?.data || [])
      const sitesList   = Array.isArray(s.data) ? s.data : (s.data?.data || [])
      setGodowns(godownsList); setAllGodowns(Array.isArray(all.data) ? all.data : (all.data?.data || []))
      setRequests(Array.isArray(r.data) ? r.data : (r.data?.data || [])); setSites(sitesList)
      if (!selected && godownsList.length) setSelected(godownsList[0].id)
      if (sitesList.length === 1) setReqForm(p => ({ ...p, site_id: sitesList[0].id }))
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (selected) {
      api.get(`/godown/${selected}/history`).then(r => setHistory(r.data)).catch(() => {})
    }
  }, [selected])

  const selectedGodown = godowns.find(g => g.id === selected)

  const handleRequest = async (e) => {
    e.preventDefault(); setRequesting(true)
    try {
      await api.post('/godown/requests', reqForm)
      toast.success('Material request sent to admin & driver!')
      setReqModal(false)
      setReqForm({ urgency: 'normal', quantity: '' })
      load()
    } catch { toast.error('Request failed') }
    setRequesting(false)
  }

  const handleStockOut = async (e) => {
    e.preventDefault(); setOutSaving(true)
    try {
      if (outForm.type === 'site') {
        await api.post('/godown/transfer/site', {
          godown_id: selected,
          site_id: outForm.to_site_id,
          category_id: outModal?.category_id,
          quantity: outForm.quantity,
          notes: outForm.notes
        })
        toast.success('Stock dispatched to site!')
      } else {
        await api.post('/godown/transfer/godown', {
          from_godown_id: selected,
          to_godown_id: outForm.to_godown_id,
          category_id: outModal?.category_id,
          quantity: outForm.quantity,
          notes: outForm.notes
        })
        toast.success('Stock returned to main godown!')
      }
      setOutModal(null); setOutForm({ type: 'site', to_site_id: '', to_godown_id: '', quantity: '', notes: '', photo: '' }); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Transfer failed') }
    setOutSaving(false)
  }

  const markReceived = async (id) => {
    try {
      await api.patch(`/godown/requests/${id}/status`, { status: 'received' })
      toast.success('Marked as received'); load()
    } catch { toast.error('Failed') }
  }

  const otherGodowns = allGodowns.filter(g => g.id !== selected)

  if (loading) return <LoadingPage />

  return (
    <div className="page-content space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-surface-400 rounded-xl p-1">
        {['stock', 'request', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${tab===t ? 'bg-primary-500 text-white' : 'text-gray-400'}`}>
            {t === 'request' ? `Requests (${requests.filter(r=>r.status==='pending').length})` : t === 'stock' ? 'My Stock' : 'History'}
          </button>
        ))}
      </div>

      {/* REQUEST MATERIAL TAB */}
      {tab === 'request' && (
        <div className="space-y-3">
          <button onClick={() => setReqModal(true)} className="btn-primary w-full">
            <Plus size={18}/> Request Material from Godown
          </button>
          {requests.map(r => (
            <div key={r.id} className="card space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold">{r.material_name}</p>
                  <p className="text-gray-400 text-xs">{r.quantity} {r.unit} · {r.site?.name}</p>
                  <p className="text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={r.urgency==='critical' ? 'badge-red' : r.urgency==='urgent' ? 'badge-orange' : 'badge-gray'}>{r.urgency}</span>
                  <StatusBadge status={r.status}/>
                </div>
              </div>
              {r.notes && <p className="text-gray-500 text-xs">{r.notes}</p>}
              {r.status === 'dispatched' && (
                <button onClick={() => markReceived(r.id)} className="btn-primary w-full py-2 text-sm">
                  <CheckCircle size={16}/> Mark as Received
                </button>
              )}
            </div>
          ))}
          {!requests.length && <EmptyState icon={Package} title="No requests" message="Request materials from admin godown"/>}
        </div>
      )}

      {/* STOCK TAB */}
      {tab === 'stock' && (
        <div className="space-y-3">
          {/* Godown selector */}
          {godowns.length > 1 && (
            <select className="select" value={selected||''} onChange={e => setSelected(e.target.value)}>
              {godowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
          {selectedGodown ? (
            <>
              <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                <p className="text-primary-400 font-semibold">{selectedGodown.name}</p>
                <p className="text-gray-400 text-xs">{selectedGodown.location} · {selectedGodown.stocks?.length || 0} materials</p>
              </div>
              <div className="space-y-2">
                {selectedGodown.stocks?.map(stock => (
                  <div key={stock.id} className="card flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                      <Package size={18} className="text-primary-400"/>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{stock.category?.name}</p>
                      <p className="text-gray-500 text-xs">{stock.category?.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${stock.min_threshold && parseFloat(stock.quantity)<=parseFloat(stock.min_threshold) ? 'text-red-400' : 'text-primary-400'}`}>
                        {stock.quantity}
                      </p>
                      <button
                        onClick={() => { setOutModal({ stockId: stock.id, name: stock.category?.name, qty: stock.quantity, category_id: stock.category_id }); setOutForm({ type:'site', to_site_id:'', to_godown_id:'', quantity:'', notes:'' }) }}
                        className="text-xs text-gray-400 hover:text-primary-400 flex items-center gap-1 mt-0.5">
                        <ArrowUp size={10}/> Transfer out
                      </button>
                    </div>
                  </div>
                ))}
                {!selectedGodown.stocks?.length && <p className="text-center text-gray-500 py-8">No stock in this godown</p>}
              </div>
            </>
          ) : (
            <EmptyState icon={Package} title="No godown assigned" message="Contact admin to assign a godown to you"/>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-2">
          {history.map(h => (
            <div key={h.id} className="card-sm flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${h.type==='in' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                <span className={`text-sm font-bold ${h.type==='in' ? 'text-green-400' : 'text-red-400'}`}>{h.type==='in'?'↑':'↓'}</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">{h.category?.name}</p>
                <p className="text-gray-500 text-xs">{h.notes || '—'} · {new Date(h.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <p className={`font-bold ${h.type==='in' ? 'text-green-400' : 'text-red-400'}`}>{h.type==='in'?'+':'-'}{h.quantity}</p>
            </div>
          ))}
          {!history.length && <p className="text-center text-gray-500 py-10">No history yet</p>}
        </div>
      )}

      {/* Request Modal */}
      <Modal open={reqModal} onClose={() => setReqModal(false)} title="Request Material">
        <form onSubmit={handleRequest} className="space-y-4">
          <div><label className="label">Material Name *</label><input className="input" required value={reqForm.material_name||''} onChange={e => setReqForm(p=>({...p,material_name:e.target.value}))} placeholder="e.g. Cement, Steel rods…"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Quantity *</label><input type="number" className="input" required value={reqForm.quantity} onChange={e => setReqForm(p=>({...p,quantity:e.target.value}))}/></div>
            <div><label className="label">Unit</label><input className="input" value={reqForm.unit||''} onChange={e => setReqForm(p=>({...p,unit:e.target.value}))} placeholder="bags, kg, pcs…"/></div>
          </div>
          <div><label className="label">Site</label>
            <select className="select" value={reqForm.site_id||''} onChange={e => setReqForm(p=>({...p,site_id:e.target.value}))}>
              <option value="">Select site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="label">Urgency</label>
            <div className="flex gap-2">
              {['normal','urgent','critical'].map(u => (
                <button key={u} type="button" onClick={() => setReqForm(p=>({...p,urgency:u}))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                    reqForm.urgency===u
                      ? u==='critical' ? 'bg-red-500 text-white'
                      : u==='urgent' ? 'bg-orange-500 text-white'
                      : 'bg-primary-500 text-white'
                      : 'bg-surface-200 text-gray-400'
                  }`}>{u}</button>
              ))}
            </div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={reqForm.notes||''} onChange={e => setReqForm(p=>({...p,notes:e.target.value}))}/></div>
          <button type="submit" disabled={requesting} className="btn-primary w-full">
            {requesting ? <Loader2 size={18} className="animate-spin"/> : null}
            {requesting ? 'Sending…' : 'Send Request'}
          </button>
        </form>
      </Modal>

      {/* Stock Out / Transfer Modal */}
      <Modal open={!!outModal} onClose={() => setOutModal(null)} title={`Transfer: ${outModal?.name}`}>
        <form onSubmit={handleStockOut} className="space-y-4">
          <div className="p-3 bg-surface-400 rounded-xl text-sm">
            <p className="text-gray-400">Available stock: <span className="text-primary-400 font-bold">{outModal?.qty}</span></p>
          </div>
          <div className="flex gap-2">
            {['site','godown'].map(t => (
              <button key={t} type="button" onClick={() => setOutForm(p=>({...p,type:t}))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${outForm.type===t ? 'bg-primary-500 text-white' : 'bg-surface-200 text-gray-400'}`}>
                {t==='site' ? '🏗️ To Site' : '🏭 Return to Godown'}
              </button>
            ))}
          </div>
          {outForm.type==='site' ? (
            <div><label className="label">Destination Site *</label>
              <select className="select" required value={outForm.to_site_id} onChange={e => setOutForm(p=>({...p,to_site_id:e.target.value}))}>
                <option value="">Select</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          ) : (
            <div><label className="label">Destination Godown *</label>
              <select className="select" required value={outForm.to_godown_id} onChange={e => setOutForm(p=>({...p,to_godown_id:e.target.value}))}>
                <option value="">Select</option>{otherGodowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          <div><label className="label">Quantity *</label><input type="number" className="input" required max={outModal?.qty} value={outForm.quantity} onChange={e => setOutForm(p=>({...p,quantity:e.target.value}))}/></div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={outForm.notes} onChange={e => setOutForm(p=>({...p,notes:e.target.value}))}/></div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setOutModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={outSaving} className="btn-primary flex-1">
              {outSaving ? <Loader2 size={16} className="animate-spin"/> : null}
              {outSaving ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

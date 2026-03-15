import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal, StatusBadge } from '../../components/ui'
import { DocUpload } from '../../components/ui/PhotoUpload'
import { Plus, ArrowUp, ArrowDown, ArrowRightLeft, AlertTriangle, Search, Package } from 'lucide-react'

export default function Godown() {
  const [godowns, setGodowns] = useState([])
  const [sites, setSites] = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [requests, setRequests] = useState([])
  const [modal, setModal] = useState(false)
  const [stockModal, setStockModal] = useState(null)
  const [transferModal, setTransferModal] = useState(false)
  const [tab, setTab] = useState('stock')
  const [form, setForm] = useState({})
  const [stockForm, setStockForm] = useState({ type: 'in', quantity: '', notes: '', material_name: '' })
  const [transferForm, setTransferForm] = useState({ type: 'godown', to_godown_id: '', to_site_id: '', quantity: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [g, s, u, l, r] = await Promise.all([
        api.get('/godown'),
        api.get('/sites'),
        api.get('/users?role=supervisor'),
        api.get('/godown/alerts/low-stock'),
        api.get('/godown/requests/all').catch(() => ({ data: [] }))
      ])
      setGodowns(g.data); setSites(s.data); setSupervisors(u.data)
      setLowStock(l.data); setRequests(r.data)
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

  const filteredStock = selectedGodown?.stocks?.filter(s =>
    !search || s.category?.name?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const handleCreateGodown = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/godown', form); toast.success('Godown created'); setModal(false); setForm({}); load() }
    catch { toast.error('Failed') }
    setSaving(false)
  }

  const handleStock = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post(`/godown/${selected}/stock`, {
        category_id: stockModal?.category_id,
        category_name: stockModal?.category_name || stockForm.material_name,
        type: stockForm.type,
        quantity: stockForm.quantity,
        unit_price: stockForm.unit_price,
        notes: stockForm.notes,
        photo: stockForm.photo
      })
      toast.success(stockForm.type === 'in' ? 'Stock added' : 'Stock removed')
      setStockModal(null); setStockForm({ type: 'in', quantity: '', notes: '', material_name: '' }); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const handleTransfer = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const stockItem = selectedGodown?.stocks?.find(s => s.id === transferModal?.stockId)
      if (transferForm.type === 'godown') {
        await api.post('/godown/transfer/godown', {
          from_godown_id: selected,
          to_godown_id: transferForm.to_godown_id,
          category_id: stockItem?.category_id,
          quantity: transferForm.quantity,
          notes: transferForm.notes
        })
        toast.success('Transferred to godown')
      } else {
        await api.post('/godown/transfer/site', {
          godown_id: selected,
          site_id: transferForm.to_site_id,
          category_id: stockItem?.category_id,
          quantity: transferForm.quantity,
          notes: transferForm.notes
        })
        toast.success('Dispatched to site')
      }
      setTransferModal(false); setTransferForm({ type: 'godown', to_godown_id: '', to_site_id: '', quantity: '', notes: '' }); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Transfer failed') }
    setSaving(false)
  }

  const approveRequest = async (id) => {
    try { await api.patch(`/godown/requests/${id}/status`, { status: 'approved' }); toast.success('Approved'); load() }
    catch { toast.error('Failed') }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Godown & Inventory"
        action={<button onClick={() => { setModal(true); setForm({}) }} className="btn-gold"><Plus size={16} />New Godown</button>}
      />

      {lowStock.length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 font-semibold text-sm">{lowStock.length} items below minimum stock</p>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)' }}>
        {['stock', 'requests'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}>
            {t === 'stock' ? 'Godowns & Stock' : `Material Requests (${requests.filter(r => r.status === 'pending').length})`}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Material</th><th>Site</th><th>Qty</th><th>Urgency</th><th>Status</th><th>Notes</th><th>Action</th></tr></thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td className="font-medium">{r.material_name}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.site?.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.quantity} {r.unit}</td>
                  <td><span className={r.urgency === 'critical' ? 'badge-red' : r.urgency === 'urgent' ? 'badge-gold' : 'badge-gray'}>{r.urgency}</span></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td style={{ color: 'var(--muted)' }} className="max-w-xs truncate">{r.notes || '—'}</td>
                  <td>{r.status === 'pending' && <button onClick={() => approveRequest(r.id)} className="btn-gold py-1 text-xs">Approve</button>}</td>
                </tr>
              ))}
              {!requests.length && <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--muted)' }}>No requests</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'stock' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Godown list */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium px-2" style={{ color: 'var(--muted)' }}>Godowns</h3>
            {godowns.map(g => (
              <button key={g.id} onClick={() => setSelected(g.id)}
                className={`w-full text-left p-3 rounded-xl transition-all ${selected === g.id ? 'bg-gold-500/20 border border-gold-500/50 text-gold-400' : 'border text-gray-300 hover:border-gold-500/30'}`}
                style={{ borderColor: selected === g.id ? undefined : 'var(--border)', background: selected === g.id ? undefined : 'var(--bg2)' }}>
                <p className="font-medium text-sm">{g.name}</p>
                <p className="text-xs opacity-60">{g.location}</p>
                <p className="text-xs opacity-60">{g.stocks?.length || 0} materials</p>
              </button>
            ))}
            {!godowns.length && <p className="text-sm px-2" style={{ color: 'var(--muted)' }}>No godowns</p>}
          </div>

          {/* Stock panel */}
          <div className="lg:col-span-3">
            {selected && selectedGodown ? (
              <div className="card space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold text-lg" style={{ color: 'var(--text)' }}>{selectedGodown.name}</h3>
                  <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg3)' }}>
                    {['stock', 'history'].map(t => (
                      <button key={t} onClick={() => setTab(`stock_${t}`)}
                        className={`px-3 py-1 rounded text-sm transition-all ${tab === `stock_${t}` ? 'bg-gold-500 text-black font-medium' : 'text-gray-400'}`}>
                        {t === 'stock' ? 'Stock' : 'History'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input pl-9 text-sm" placeholder="Search material..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {/* Add new material button */}
                <button onClick={() => { setStockModal({ category_name: '' }); setStockForm({ type: 'in', quantity: '', notes: '', material_name: '' }) }}
                  className="btn-outline w-full justify-center text-sm py-2"><Plus size={14} />Add New Material</button>

                {(tab === 'stock' || tab === 'stock_stock') && (
                  <div className="space-y-2">
                    {filteredStock.map(stock => (
                      <div key={stock.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg3)' }}>
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{stock.category?.name}</p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>{stock.category?.unit} · ₹{stock.unit_price}/unit</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${stock.min_threshold && parseFloat(stock.quantity) <= parseFloat(stock.min_threshold) ? 'text-red-400' : 'text-gold-400'}`}>{stock.quantity}</p>
                          <div className="flex gap-1 mt-1">
                            <button onClick={() => { setStockModal({ category_id: stock.category_id, category_name: stock.category?.name }); setStockForm({ type: 'in', quantity: '', notes: '', material_name: stock.category?.name }) }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-all text-xs"><ArrowUp size={14} /></button>
                            <button onClick={() => { setStockModal({ category_id: stock.category_id, category_name: stock.category?.name }); setStockForm({ type: 'out', quantity: '', notes: '', material_name: stock.category?.name }) }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all text-xs"><ArrowDown size={14} /></button>
                            <button onClick={() => { setTransferModal({ stockId: stock.id, name: stock.category?.name, qty: stock.quantity }); setTransferForm({ type: 'godown', to_godown_id: '', to_site_id: '', quantity: '', notes: '' }) }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-all text-xs"><ArrowRightLeft size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!filteredStock.length && (
                      <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
                        <Package size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">{search ? 'No matching materials' : 'No stock yet'}</p>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'stock_history' && (
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Date</th><th>Material</th><th>Type</th><th>Qty</th><th>Notes</th><th>Receipt</th></tr></thead>
                      <tbody>
                        {history.map(h => (
                          <tr key={h.id}>
                            <td style={{ color: 'var(--muted)' }}>{new Date(h.createdAt).toLocaleDateString('en-IN')}</td>
                            <td>{h.category?.name}</td>
                            <td><span className={h.type === 'in' ? 'badge-green' : 'badge-red'}>{h.type}</span></td>
                            <td className={h.type === 'in' ? 'text-green-400' : 'text-red-400'}>{h.type === 'in' ? '+' : '-'}{h.quantity}</td>
                            <td style={{ color: 'var(--muted)', maxWidth: '180px' }} className="truncate">{h.notes || '—'}</td>
                            <td>{h.photo ? <a href={h.photo} target="_blank" className="text-blue-400 text-xs">View</a> : '—'}</td>
                          </tr>
                        ))}
                        {!history.length && <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--muted)' }}>No history</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="card flex items-center justify-center h-64" style={{ color: 'var(--muted)' }}>
                Select a godown to view stock
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Godown Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Godown" size="sm">
        <form onSubmit={handleCreateGodown} className="space-y-4">
          <div><label className="label">Name *</label><input className="input" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Location</label><input className="input" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
          <div><label className="label">Incharge (Supervisor)</label>
            <select className="select" value={form.incharge_id || ''} onChange={e => setForm({ ...form, incharge_id: e.target.value })}>
              <option value="">Select supervisor</option>
              {supervisors.map(u => <option key={u.id} value={u.id}>{u.name} ({u.employee_id})</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">Create</button></div>
        </form>
      </Modal>

      {/* Stock in/out Modal */}
      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={stockForm.type === 'in' ? 'Stock In' : 'Stock Out'} size="md">
        <form onSubmit={handleStock} className="space-y-4">
          <div><label className="label">Material Name</label>
            <input className="input" value={stockModal?.category_name || stockForm.material_name} onChange={e => setStockForm({ ...stockForm, material_name: e.target.value })} placeholder="e.g. Cement, Steel, Sand" readOnly={!!stockModal?.category_id} />
          </div>
          <div className="flex gap-2">
            {['in', 'out'].map(t => (
              <button key={t} type="button" onClick={() => setStockForm({ ...stockForm, type: t })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${stockForm.type === t ? (t === 'in' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-white/5 text-gray-400'}`}>
                {t === 'in' ? '⬆️ Stock In' : '⬇️ Stock Out'}
              </button>
            ))}
          </div>
          <div><label className="label">Quantity *</label><input type="number" className="input" required value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} /></div>
          <div><label className="label">Unit Price (₹)</label><input type="number" className="input" value={stockForm.unit_price || ''} onChange={e => setStockForm({ ...stockForm, unit_price: e.target.value })} /></div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={stockForm.notes} onChange={e => setStockForm({ ...stockForm, notes: e.target.value })} /></div>
          <div>
            <label className="label">{stockForm.type === 'in' ? 'Stock In Photo' : 'Stock Out Photo'}</label>
            <DocUpload value={stockForm.photo} onChange={v => setStockForm({ ...stockForm, photo: v })} folder="dgsystem/stock" label="Upload photo" />
          </div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={() => setStockModal(null)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">Confirm</button></div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal open={!!transferModal} onClose={() => setTransferModal(false)} title={`Transfer: ${transferModal?.name}`} size="md">
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg3)' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Available: <span className="text-gold-400 font-bold">{transferModal?.qty}</span></p>
          </div>
          <div className="flex gap-2">
            {['godown', 'site'].map(t => (
              <button key={t} type="button" onClick={() => setTransferForm({ ...transferForm, type: t })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${transferForm.type === t ? 'bg-gold-500 text-black' : 'bg-white/5 text-gray-400'}`}>
                {t === 'godown' ? '🏭 To Godown' : '🏗️ To Site'}
              </button>
            ))}
          </div>
          {transferForm.type === 'godown' ? (
            <div><label className="label">Destination Godown *</label>
              <select className="select" required value={transferForm.to_godown_id} onChange={e => setTransferForm({ ...transferForm, to_godown_id: e.target.value })}>
                <option value="">Select godown</option>
                {godowns.filter(g => g.id !== selected).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          ) : (
            <div><label className="label">Destination Site *</label>
              <select className="select" required value={transferForm.to_site_id} onChange={e => setTransferForm({ ...transferForm, to_site_id: e.target.value })}>
                <option value="">Select site</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div><label className="label">Quantity *</label><input type="number" className="input" required max={transferModal?.qty} value={transferForm.quantity} onChange={e => setTransferForm({ ...transferForm, quantity: e.target.value })} /></div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={transferForm.notes} onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })} /></div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={() => setTransferModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">{saving ? 'Transferring...' : 'Transfer'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

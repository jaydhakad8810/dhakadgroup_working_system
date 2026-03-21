import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal } from '../../components/ui'
import { Plus, Trash2, Edit } from 'lucide-react'

export default function BOQ() {
  const [labourItems, setLabourItems]     = useState([])
  const [materialItems, setMaterialItems] = useState([])
  const [sites, setSites]   = useState([])
  const [cats, setCats]     = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState('labour')
  const [filterSite, setFilterSite] = useState('')
  const [modal, setModal]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]     = useState({})
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState(null)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Determine available tabs based on selected site's contract_type
  const selectedSite = sites.find(s => s.id === filterSite)
  const contractType = selectedSite?.contract_type || 'material_labour'
  const showLabour   = !filterSite || contractType === 'material_labour' || contractType === 'labour_only'
  const showMaterial = !filterSite || contractType === 'material_labour' || contractType === 'material_only'

  // Auto-switch tab if current tab is hidden for this contract type
  useEffect(() => {
    if (filterSite) {
      if (tab === 'labour' && !showLabour) setTab('material')
      if (tab === 'material' && !showMaterial) setTab('labour')
    }
  }, [filterSite, contractType])

  const load = async () => {
    setLoading(true)
    try {
      const params = filterSite ? `?site_id=${filterSite}` : ''
      const [l, m, s, c] = await Promise.all([
        api.get(`/boq/labour${params}`),
        api.get(`/boq/material${params}`),
        api.get('/sites'),
        api.get('/godown/categories')
      ])
      setLabourItems(l.data); setMaterialItems(m.data)
      setSites(s.data); setCats(c.data)
      if (filterSite) {
        const sum = await api.get(`/boq/summary/${filterSite}`)
        setSummary(sum.data)
      } else setSummary(null)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [filterSite])

  const openAdd = () => {
    setEditingId(null)
    setForm({ site_id: filterSite || '' })
    setModal(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({ ...item })
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const url = tab === 'labour' ? '/boq/labour' : '/boq/material'
      const data = { ...form, site_id: filterSite || form.site_id }
      if (form.rate && form.estimated_quantity) {
        data.estimated_amount = (parseFloat(form.rate) * parseFloat(form.estimated_quantity)).toFixed(2)
      }
      if (editingId) {
        await api.put(`${url}/${editingId}`, data)
        toast.success('Updated')
      } else {
        await api.post(url, data)
        toast.success('Item added')
      }
      setModal(false); setEditingId(null); setForm({}); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return
    try {
      const url = tab === 'labour' ? `/boq/labour/${id}` : `/boq/material/${id}`
      await api.delete(url); toast.success('Deleted'); load()
    } catch { toast.error('Failed') }
  }

  const items = tab === 'labour' ? labourItems : materialItems
  const totalEstimated = items.reduce((s, i) => s + parseFloat(i.estimated_amount || 0), 0)
  const totalActual    = items.reduce((s, i) => s + parseFloat(i.actual_amount || 0), 0)

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Bill of Quantities (BOQ)"
        action={<button onClick={openAdd} className="btn-gold"><Plus size={16} />Add Item</button>}
      />

      {/* Site filter */}
      <div className="flex gap-3 flex-wrap items-center">
        <select className="select w-56" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.contract_type?.replace(/_/g, ' +')})</option>)}
        </select>
        {selectedSite?.contract_type && (
          <span className="badge-blue capitalize">{selectedSite.contract_type.replace(/_/g, ' + ')}</span>
        )}
      </div>

      {/* Tabs — only show tabs relevant to contract type */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)' }}>
        {showLabour && (
          <button onClick={() => setTab('labour')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'labour' ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}>
            Labour BOQ ({labourItems.length})
          </button>
        )}
        {showMaterial && (
          <button onClick={() => setTab('material')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'material' ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}>
            Material BOQ ({materialItems.length})
          </button>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {showLabour && <>
            <div className="card text-center p-3"><p className="text-xs" style={{ color: 'var(--muted)' }}>Labour Estimated</p><p className="text-white font-bold">₹{parseFloat(summary.labour.estimated).toLocaleString('en-IN')}</p></div>
            <div className="card text-center p-3"><p className="text-xs" style={{ color: 'var(--muted)' }}>Labour Actual</p><p className="text-gold-400 font-bold">₹{parseFloat(summary.labour.actual).toLocaleString('en-IN')}</p></div>
          </>}
          {showMaterial && <>
            <div className="card text-center p-3"><p className="text-xs" style={{ color: 'var(--muted)' }}>Material Estimated</p><p className="text-white font-bold">₹{parseFloat(summary.material.estimated).toLocaleString('en-IN')}</p></div>
            <div className="card text-center p-3"><p className="text-xs" style={{ color: 'var(--muted)' }}>Material Actual</p><p className="text-gold-400 font-bold">₹{parseFloat(summary.material.actual).toLocaleString('en-IN')}</p></div>
          </>}
        </div>
      )}

      {/* Current tab totals */}
      {items.length > 0 && (
        <div className="flex gap-4 text-sm" style={{ color: 'var(--muted)' }}>
          <span>Estimated: <strong className="text-white">₹{totalEstimated.toLocaleString('en-IN')}</strong></span>
          <span>Actual: <strong className="text-gold-400">₹{totalActual.toLocaleString('en-IN')}</strong></span>
          <span>Variance: <strong className={totalActual > totalEstimated ? 'text-red-400' : 'text-green-400'}>
            {totalActual > totalEstimated ? '+' : ''}₹{(totalActual - totalEstimated).toLocaleString('en-IN')}
          </strong></span>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Unit</th>
              <th>Rate (₹)</th>
              <th>Est. Qty</th>
              <th>Act. Qty</th>
              <th>Est. Amount</th>
              <th>Act. Amount</th>
              {!filterSite && <th>Site</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td className="font-medium">{item.item_name}</td>
                <td style={{ color: 'var(--muted)' }}>{item.unit || '—'}</td>
                <td style={{ color: 'var(--muted)' }}>₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}</td>
                <td style={{ color: 'var(--muted)' }}>{item.estimated_quantity}</td>
                <td className="text-gold-400">{item.actual_quantity}</td>
                <td>₹{parseFloat(item.estimated_amount || 0).toLocaleString('en-IN')}</td>
                <td className="text-gold-400">₹{parseFloat(item.actual_amount || 0).toLocaleString('en-IN')}</td>
                {!filterSite && <td style={{ color: 'var(--muted)' }}>{item.site?.name || '—'}</td>}
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(item)} className="btn-ghost px-2 py-1 text-xs"><Edit size={13} /></button>
                    <button onClick={() => handleDelete(item.id)} className="btn-ghost px-2 py-1 text-red-400"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--muted)' }}>
                No items. {filterSite && !showLabour && tab === 'labour' ? 'This site uses Material Only contract.' : 'Add items to get started.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditingId(null) }}
        title={`${editingId ? 'Edit' : 'Add'} ${tab === 'labour' ? 'Labour' : 'Material'} BOQ Item`} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!filterSite && (
            <div>
              <label className="label">Site *</label>
              <select className="select" required value={form.site_id || ''} onChange={e => f('site_id', e.target.value)}>
                <option value="">Select site</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {tab === 'material' && (
            <div>
              <label className="label">Category</label>
              <select className="select" value={form.category_id || ''} onChange={e => f('category_id', e.target.value)}>
                <option value="">Select / leave blank</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div><label className="label">Item Name *</label><input className="input" required value={form.item_name || ''} onChange={e => f('item_name', e.target.value)} placeholder="e.g. Brick laying, Cement bags" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Unit</label><input className="input" placeholder="sqft, kg, bags…" value={form.unit || ''} onChange={e => f('unit', e.target.value)} /></div>
            <div><label className="label">Rate (₹)</label><input type="number" className="input" value={form.rate || ''} onChange={e => f('rate', e.target.value)} /></div>
            <div><label className="label">Est. Qty</label><input type="number" className="input" value={form.estimated_quantity || ''} onChange={e => f('estimated_quantity', e.target.value)} /></div>
          </div>
          {editingId && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Actual Qty</label><input type="number" className="input" value={form.actual_quantity || ''} onChange={e => f('actual_quantity', e.target.value)} /></div>
              <div><label className="label">Actual Amount (₹)</label><input type="number" className="input" value={form.actual_amount || ''} onChange={e => f('actual_amount', e.target.value)} /></div>
            </div>
          )}
          {form.rate && form.estimated_quantity && (
            <p className="text-gold-400 text-sm">Estimated Amount: ₹{(parseFloat(form.rate || 0) * parseFloat(form.estimated_quantity || 0)).toLocaleString('en-IN')}</p>
          )}
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => f('notes', e.target.value)} /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : editingId ? 'Update' : 'Add Item'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

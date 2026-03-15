import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal } from '../../components/ui'
import { Plus, Trash2 } from 'lucide-react'

export default function BOQ() {
  const [labourItems, setLabourItems] = useState([])
  const [materialItems, setMaterialItems] = useState([])
  const [sites, setSites] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('labour')
  const [filterSite, setFilterSite] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = filterSite ? `?site_id=${filterSite}` : ''
      const [l, m, s, c] = await Promise.all([api.get(`/boq/labour${params}`), api.get(`/boq/material${params}`), api.get('/sites'), api.get('/godown/categories')])
      setLabourItems(l.data); setMaterialItems(m.data); setSites(s.data); setCats(c.data)
      if (filterSite) { const sum = await api.get(`/boq/summary/${filterSite}`); setSummary(sum.data) }
      else setSummary(null)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [filterSite])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const url = tab === 'labour' ? '/boq/labour' : '/boq/material'
      const data = { ...form, site_id: filterSite || form.site_id }
      if (form.rate && form.estimated_quantity) { data.estimated_amount = parseFloat(form.rate) * parseFloat(form.estimated_quantity) }
      await api.post(url, data)
      toast.success('Item added'); setModal(false); setForm({}); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      const url = tab === 'labour' ? `/boq/labour/${id}` : `/boq/material/${id}`
      await api.delete(url); toast.success('Deleted'); load()
    } catch { toast.error('Failed') }
  }

  if (loading) return <LoadingPage />
  const items = tab === 'labour' ? labourItems : materialItems

  return (
    <div className="space-y-6">
      <PageHeader title="Bill of Quantities (BOQ)"
        action={<button onClick={() => setModal(true)} className="btn-gold"><Plus size={16} />Add Item</button>}
      />
      <div className="flex gap-3 flex-wrap items-center">
        <select className="select w-48" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
          {['labour', 'material'].map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${tab === t ? 'bg-gold-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>{t === 'labour' ? 'Labour BOQ' : 'Material BOQ'}</button>)}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center"><p className="text-gray-400 text-sm">Labour Estimated</p><p className="text-white font-bold">₹{parseFloat(summary.labour.estimated).toLocaleString('en-IN')}</p></div>
          <div className="card text-center"><p className="text-gray-400 text-sm">Labour Actual</p><p className="text-gold-400 font-bold">₹{parseFloat(summary.labour.actual).toLocaleString('en-IN')}</p></div>
          <div className="card text-center"><p className="text-gray-400 text-sm">Material Estimated</p><p className="text-white font-bold">₹{parseFloat(summary.material.estimated).toLocaleString('en-IN')}</p></div>
          <div className="card text-center"><p className="text-gray-400 text-sm">Material Actual</p><p className="text-gold-400 font-bold">₹{parseFloat(summary.material.actual).toLocaleString('en-IN')}</p></div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead><tr><th>Item</th><th>Unit</th><th>Rate (₹)</th><th>Est. Qty</th><th>Act. Qty</th><th>Est. Amt</th><th>Act. Amt</th><th></th></tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td className="font-medium">{item.item_name}</td>
                <td className="text-gray-400">{item.unit || '—'}</td>
                <td className="text-gray-400">₹{parseFloat(item.rate||0).toLocaleString('en-IN')}</td>
                <td className="text-gray-400">{item.estimated_quantity}</td>
                <td className="text-gold-400">{item.actual_quantity}</td>
                <td>₹{parseFloat(item.estimated_amount||0).toLocaleString('en-IN')}</td>
                <td className="text-gold-400">₹{parseFloat(item.actual_amount||0).toLocaleString('en-IN')}</td>
                <td><button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-8">No items</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={`Add ${tab === 'labour' ? 'Labour' : 'Material'} BOQ Item`} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!filterSite && <div><label className="label">Site *</label><select className="select" required value={form.site_id||''} onChange={e=>setForm({...form,site_id:e.target.value})}><option value="">Select</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
          {tab === 'material' && <div><label className="label">Category</label><select className="select" value={form.category_id||''} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">Select</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
          <div><label className="label">Item Name *</label><input className="input" required value={form.item_name||''} onChange={e=>setForm({...form,item_name:e.target.value})} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Unit</label><input className="input" placeholder="sqft, kg..." value={form.unit||''} onChange={e=>setForm({...form,unit:e.target.value})} /></div>
            <div><label className="label">Rate (₹)</label><input type="number" className="input" value={form.rate||''} onChange={e=>setForm({...form,rate:e.target.value})} /></div>
            <div><label className="label">Est. Qty</label><input type="number" className="input" value={form.estimated_quantity||''} onChange={e=>setForm({...form,estimated_quantity:e.target.value})} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={()=>setModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">Add Item</button></div>
        </form>
      </Modal>
    </div>
  )
}

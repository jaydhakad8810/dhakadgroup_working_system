import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal, StatusBadge, ConfirmDialog } from '../../components/ui'
import { MultiPhotoUpload, DocUpload } from '../../components/ui/PhotoUpload'
import { Plus, Trash2, CheckCircle, Edit } from 'lucide-react'

export default function Machines() {
  const [machines, setMachines] = useState([])
  const [cats, setCats] = useState([])
  const [sites, setSites] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('machines')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ status: 'available', photos: [] })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const [m, c, s, r] = await Promise.all([api.get('/machines'), api.get('/machines/categories'), api.get('/sites'), api.get('/machines/requests/all')])
      setMachines(m.data); setCats(c.data); setSites(s.data); setRequests(r.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm({ status: 'available', photos: [] }); setModal(true) }
  const openEdit = (m) => { setEditing(m.id); setForm({ ...m, photos: m.photos || [] }); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await api.put(`/machines/${editing}`, form); toast.success('Updated') }
      else { await api.post('/machines', form); toast.success('Machine added') }
      setModal(false); setEditing(null); setForm({ status: 'available', photos: [] }); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/machines/${id}`); toast.success('Deleted'); setDeleting(null); load() }
    catch { toast.error('Failed') }
  }

  const approveRequest = async (id) => {
    try { await api.patch(`/machines/requests/${id}/status`, { status: 'approved' }); toast.success('Approved'); load() }
    catch { toast.error('Failed') }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Machines" action={<button onClick={openAdd} className="btn-gold"><Plus size={16} />Add Machine</button>} />
      <div className="flex gap-1 bg-dark-800 rounded-lg p-1 w-fit">
        {['machines', 'requests'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${tab === t ? 'bg-gold-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>
            {t === 'machines' ? `Machines (${machines.length})` : `Requests (${requests.filter(r => r.status === 'pending').length})`}
          </button>
        ))}
      </div>

      {tab === 'machines' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {machines.map(m => (
            <div key={m.id} className="card">
              {m.photos?.[0] && <img src={m.photos[0]} className="w-full h-36 object-cover rounded-xl mb-3" alt={m.name} />}
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="text-white font-semibold">{m.name}</h3><p className="text-gray-400 text-sm">{m.category?.name}</p></div>
                <StatusBadge status={m.status} />
              </div>
              <div className="text-sm text-gray-400 space-y-1 mb-3">
                {m.serial_number && <p>S/N: {m.serial_number}</p>}
                {m.site && <p>📍 {m.site.name}</p>}
                {m.purchase_cost && <p>💰 ₹{parseFloat(m.purchase_cost).toLocaleString('en-IN')}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(m)} className="btn-outline flex-1 justify-center text-sm py-1.5"><Edit size={14} />Edit</button>
                <button onClick={() => setDeleting(m.id)} className="btn-ghost px-2 text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {!machines.length && <p className="col-span-3 text-center text-gray-500 py-16">No machines yet</p>}
        </div>
      )}

      {tab === 'requests' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Machine</th><th>Date</th><th>Notes</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td>{r.machine?.name || '—'}</td>
                  <td className="text-gray-400">{r.request_date}</td>
                  <td className="text-gray-400">{r.notes || '—'}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.status === 'pending' && <button onClick={() => approveRequest(r.id)} className="btn-gold py-1 text-xs"><CheckCircle size={12} />Approve</button>}</td>
                </tr>
              ))}
              {!requests.length && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No requests</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Machine' : 'Add Machine'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Machine photos */}
          <div>
            <label className="label">Machine Photos</label>
            <MultiPhotoUpload value={form.photos} onChange={v => f('photos', v)} folder="dgsystem/machines" label="Add" max={5} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Name *</label><input className="input" required value={form.name || ''} onChange={e => f('name', e.target.value)} /></div>
            <div><label className="label">Category</label>
              <select className="select" value={form.category_id || ''} onChange={e => f('category_id', e.target.value)}>
                <option value="">Select</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="label">Status</label>
              <select className="select" value={form.status} onChange={e => f('status', e.target.value)}>
                <option value="available">Available</option><option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option><option value="retired">Retired</option>
              </select>
            </div>
            <div><label className="label">Serial Number</label><input className="input" value={form.serial_number || ''} onChange={e => f('serial_number', e.target.value)} /></div>
            <div><label className="label">Purchase Cost (₹)</label><input type="number" className="input" value={form.purchase_cost || ''} onChange={e => f('purchase_cost', e.target.value)} /></div>
            <div><label className="label">Purchase Date</label><input type="date" className="input" value={form.purchase_date || ''} onChange={e => f('purchase_date', e.target.value)} /></div>
            <div><label className="label">Assign Site</label>
              <select className="select" value={form.assigned_site_id || ''} onChange={e => f('assigned_site_id', e.target.value)}>
                <option value="">None</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Maintenance Photo</label>
              <DocUpload value={form.maintenance_photo} onChange={v => f('maintenance_photo', v)} folder="dgsystem/machines" label="Upload maintenance photo" />
            </div>
            <div className="col-span-2"><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => f('notes', e.target.value)} /></div>
          </div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={() => setModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : editing ? 'Save' : 'Add Machine'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} title="Delete Machine" message="Cannot be undone." />
    </div>
  )
}

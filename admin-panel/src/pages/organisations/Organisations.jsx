import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal, ConfirmDialog } from '../../components/ui'
import { DocUpload } from '../../components/ui/PhotoUpload'
import { Plus, Trash2, Edit } from 'lucide-react'

export default function Organisations() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/organisations'); setOrgs(r.data) }
    catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await api.put(`/organisations/${editing}`, form); toast.success('Updated') }
      else { await api.post('/organisations', form); toast.success('Created') }
      setModal(false); setEditing(null); setForm({}); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const openEdit = (org) => { setEditing(org.id); setForm(org); setModal(true) }

  const handleDelete = async (id) => {
    try { await api.delete(`/organisations/${id}`); toast.success('Deleted'); setDeleting(null); load() }
    catch { toast.error('Failed') }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Organisations" subtitle={`${orgs.length} organisations`}
        action={<button onClick={() => { setModal(true); setEditing(null); setForm({}) }} className="btn-gold"><Plus size={16} />Add Organisation</button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {orgs.map(org => (
          <div key={org.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div><h3 className="text-white font-semibold">{org.name}</h3>{org.gst_number && <p className="text-gray-400 text-xs font-mono">GST: {org.gst_number}</p>}</div>
              <span className={org.is_active ? 'badge-green' : 'badge-red'}>{org.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="text-sm text-gray-400 space-y-1 mb-4">
              {org.owner_name && <p>👤 {org.owner_name}</p>}
              {org.contact_number && <p>📞 {org.contact_number}</p>}
              {org.email && <p>✉️ {org.email}</p>}
              {org.address && <p className="truncate">📍 {org.address}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(org)} className="btn-outline flex-1 justify-center text-sm py-1.5"><Edit size={14} />Edit</button>
              <button onClick={() => setDeleting(org.id)} className="btn-ghost px-2 text-red-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {orgs.length === 0 && <div className="col-span-3 text-center text-gray-400 py-16">No organisations yet</div>}
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); setForm({}) }} title={editing ? 'Edit Organisation' : 'New Organisation'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Organisation Name *</label><input className="input" required value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Owner Name</label><input className="input" value={form.owner_name||''} onChange={e=>setForm({...form,owner_name:e.target.value})} /></div>
            <div><label className="label">GST Number</label><input className="input" value={form.gst_number||''} onChange={e=>setForm({...form,gst_number:e.target.value})} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.contact_number||''} onChange={e=>setForm({...form,contact_number:e.target.value})} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></div>
          </div>
          <div><label className="label">Address</label><textarea className="input" rows={2} value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})} /></div>
          <div>
            <label className="label">GST Certificate / Registration Document</label>
            <DocUpload value={form.document_url} onChange={v=>setForm({...form,document_url:v})} folder="dgsystem/organisations" label="Upload PDF, JPG, PNG, WEBP" />
            {form.document_url && (
              <a href={form.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-400 text-sm mt-1 hover:underline">
                📄 View Document
              </a>
            )}
          </div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={()=>{setModal(false);setEditing(null);setForm({})}} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">{saving?'Saving...':editing?'Save Changes':'Create'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={()=>setDeleting(null)} onConfirm={()=>handleDelete(deleting)} title="Delete Organisation" message="This cannot be undone." />
    </div>
  )
}

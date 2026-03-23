import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal, ConfirmDialog } from '../../components/ui'
import { Plus, Trash2, Edit, FileText, Building2, Phone, Mail, MapPin, User } from 'lucide-react'
import { DocUpload } from '../../components/ui/PhotoUpload'

export default function Organisations() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [docModal, setDocModal] = useState(null)

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/organisations'); setOrgs(r.data) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await api.put('/organisations/'+editing, form); toast.success('Updated') }
      else { await api.post('/organisations', form); toast.success('Created') }
      setModal(false); setEditing(null); setForm({}); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const openEdit = (org) => { setEditing(org.id); setForm(org); setModal(true) }
  const handleDelete = async (id) => {
    try { await api.delete('/organisations/'+id); toast.success('Deleted'); setDeleting(null); load() }
    catch { toast.error('Failed') }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Organisations" subtitle={orgs.length+' organisations'}
        action={<button onClick={() => { setModal(true); setEditing(null); setForm({}) }} className="btn-gold"><Plus size={16}/>Add Organisation</button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {orgs.map(org => (
          <div key={org.id} className="card overflow-hidden hover:border-gold-500/30 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gold-500/15 flex items-center justify-center overflow-hidden">
                  {org.document_url && org.document_url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                    ? <img src={org.document_url} alt={org.name} className="w-11 h-11 object-cover rounded-xl"/>
                    : <Building2 size={20} className="text-gold-400"/>}
                </div>
                <div>
                  <h3 className="font-bold text-white">{org.name}</h3>
                  {org.gst_number && <p className="text-xs font-mono text-gray-500">GST: {org.gst_number}</p>}
                </div>
              </div>
              <span className={'text-xs px-2 py-0.5 rounded-full font-semibold '+(org.is_active?'bg-green-500/15 text-green-400':'bg-red-500/15 text-red-400')}>
                {org.is_active?'Active':'Inactive'}
              </span>
            </div>
            <div className="space-y-2 mb-4">
              {org.owner_name && <div className="flex items-center gap-2 text-sm text-gray-400"><User size={13} className="text-gray-500"/><span>{org.owner_name}</span></div>}
              {org.contact_number && <div className="flex items-center gap-2 text-sm text-gray-400"><Phone size={13} className="text-gray-500"/><span>{org.contact_number}</span></div>}
              {org.email && <div className="flex items-center gap-2 text-sm text-gray-400"><Mail size={13} className="text-gray-500"/><span className="truncate">{org.email}</span></div>}
              {org.address && <div className="flex items-center gap-2 text-sm text-gray-400"><MapPin size={13} className="text-gray-500"/><span className="truncate">{org.address}</span></div>}
            </div>
            {org.document_url ? (
              <button onClick={() => setDocModal(org)} className="w-full flex items-center justify-center gap-2 py-2 mb-3 rounded-xl text-sm font-semibold text-gold-400 bg-gold-500/10 border border-gold-500/20 hover:bg-gold-500/20 transition-all">
                <FileText size={14}/>View Document
              </button>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 py-2 mb-3 rounded-xl text-sm text-gray-600 bg-surface-400 border border-dark-600">
                <FileText size={14}/>No Document
              </div>
            )}
            <div className="flex gap-2 pt-3 border-t border-dark-600">
              <button onClick={() => openEdit(org)} className="btn-outline flex-1 justify-center text-sm py-1.5"><Edit size={13}/>Edit</button>
              <button onClick={() => setDeleting(org.id)} className="btn-ghost px-3 text-red-400"><Trash2 size={14}/></button>
            </div>
          </div>
        ))}
        {orgs.length === 0 && <div className="col-span-3 text-center text-gray-500 py-20"><Building2 size={40} className="mx-auto mb-3 opacity-30"/><p>No organisations yet</p></div>}
      </div>

      <Modal open={!!docModal} onClose={() => setDocModal(null)} title={'Document — '+(docModal?.name||'')} size="lg">
        {docModal?.document_url && (
          <div className="space-y-3">
            {docModal.document_url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
              ? <img src={docModal.document_url} alt="Doc" className="w-full rounded-xl border border-dark-600"/>
              : docModal.document_url.match(/\.pdf$/i)
              ? <iframe src={docModal.document_url} className="w-full h-96 rounded-xl" title="PDF"/>
              : <div className="text-center py-8"><FileText size={48} className="mx-auto mb-3 text-gray-500"/><p className="text-gray-400 mb-4">Preview not available</p></div>
            }
            <a href={docModal.document_url} target="_blank" rel="noreferrer" className="btn-gold w-full justify-center"><FileText size={14}/>Open / Download</a>
          </div>
        )}
      </Modal>

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); setForm({}) }} title={editing?'Edit Organisation':'New Organisation'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Organisation Name *</label><input className="input" required value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Owner Name</label><input className="input" value={form.owner_name||''} onChange={e=>setForm({...form,owner_name:e.target.value})}/></div>
            <div><label className="label">GST Number</label><input className="input" value={form.gst_number||''} onChange={e=>setForm({...form,gst_number:e.target.value})}/></div>
            <div><label className="label">Phone</label><input className="input" value={form.contact_number||''} onChange={e=>setForm({...form,contact_number:e.target.value})}/></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></div>
          </div>
          <div><label className="label">Address</label><textarea className="input" rows={2} value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})}/></div>
          <div><label className="label">Organisation Image / Document</label>
            <DocUpload value={form.document_url||''} onChange={v=>setForm({...form,document_url:v})} folder="dgsystem/organisations" label="Upload image or PDF" />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={()=>{setModal(false);setEditing(null);setForm({})}} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving?'Saving...':editing?'Save Changes':'Create'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={()=>setDeleting(null)} onConfirm={()=>handleDelete(deleting)} title="Delete Organisation" message="This cannot be undone."/>
    </div>
  )
}

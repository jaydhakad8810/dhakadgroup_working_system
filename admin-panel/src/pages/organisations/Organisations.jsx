import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal, ConfirmDialog } from '../../components/ui'
import { Plus, Trash2, Edit, FileText, Building2, Phone, Mail, MapPin, User, Upload, X } from 'lucide-react'
import { DocUpload } from '../../components/ui/PhotoUpload'

const SERVICE_TYPE_OPTIONS = [
  'Painting Services',
  'Gypsum',
  'Wall Coating',
  'Waterproofing',
]
const GST_TYPE_OPTIONS = ['Regular', 'Composition', 'Unregistered', 'Other']
const ROLE_OPTIONS = ['Owner', 'Partner', 'Director', 'Manager', 'Authorised Signatory']

const DEFAULT_FORM = {
  name: '', gst_number: '', contact_number: '', email: '', address: '', document_url: '',
  owners: [], service_types: [], service_other: '', gst_type: '', gst_type_other: '',
  udyam_number: '', pan_number: '',
  bank_name: '', account_type: 'Current', account_number: '', ifsc_code: '', branch: '', bank_passbook_url: '',
}

function SignatureUpload({ value, onChange }) {
  const ref = useRef()
  const [uploading, setUploading] = useState(false)
  const upload = async (file) => {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await api.post('/upload/single', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onChange(r.data?.url || r.data?.data?.url || '')
    } catch { toast.error('Upload failed') }
    setUploading(false)
  }
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && upload(e.target.files[0])} />
      {value
        ? <div className="relative inline-block">
            <img src={value} alt="Signature" className="h-14 rounded border border-white/10 bg-white" />
            <button type="button" onClick={() => onChange('')} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"><X size={10}/></button>
          </div>
        : <button type="button" onClick={() => ref.current.click()} disabled={uploading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all">
            <Upload size={12}/>{uploading ? 'Uploading…' : 'Upload Signature'}
          </button>
      }
    </div>
  )
}

export default function Organisations() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [docModal, setDocModal] = useState(null)

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/organisations'); setOrgs(r.data) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleService = (svc) => {
    setForm(f => {
      const arr = Array.isArray(f.service_types) ? f.service_types : []
      return { ...f, service_types: arr.includes(svc) ? arr.filter(x => x !== svc) : [...arr, svc] }
    })
  }

  const addOwner = () => setForm(f => ({ ...f, owners: [...(f.owners||[]), { name: '', phone: '', role: 'Owner', signature_url: '' }] }))
  const removeOwner = (i) => setForm(f => ({ ...f, owners: f.owners.filter((_, idx) => idx !== i) }))
  const updateOwner = (i, k, v) => setForm(f => ({ ...f, owners: f.owners.map((o, idx) => idx === i ? { ...o, [k]: v } : o) }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form }
      const gstType = form.gst_type === 'Other' ? form.gst_type_other : form.gst_type
      payload.gst_type = gstType
      delete payload.gst_type_other
      const svcTypes = (Array.isArray(form.service_types) ? form.service_types : [])
        .map(s => s === 'Other' ? (form.service_other || 'Other') : s).filter(Boolean)
      payload.service_types = svcTypes
      delete payload.service_other
      if (editing) { await api.put('/organisations/'+editing, payload); toast.success('Updated') }
      else { await api.post('/organisations', payload); toast.success('Created') }
      setModal(false); setEditing(null); setForm(DEFAULT_FORM); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const openEdit = (org) => {
    const rawSvcs = Array.isArray(org.service_types) ? org.service_types : []
    const customSvc = rawSvcs.find(s => !SERVICE_TYPE_OPTIONS.includes(s))
    const normalizedSvcs = rawSvcs.map(s => SERVICE_TYPE_OPTIONS.includes(s) ? s : 'Other')
    const knownGstTypes = GST_TYPE_OPTIONS.filter(x => x !== 'Other')
    const gstTypeOther = org.gst_type && !knownGstTypes.includes(org.gst_type) ? org.gst_type : ''
    const gstType = gstTypeOther ? 'Other' : (org.gst_type || '')
    setEditing(org.id)
    setForm({
      ...DEFAULT_FORM, ...org,
      owners: Array.isArray(org.owners) ? org.owners : [],
      service_types: normalizedSvcs,
      service_other: customSvc || '',
      gst_type: gstType,
      gst_type_other: gstTypeOther,
    })
    setModal(true)
  }

  const handleDelete = async (id) => {
    try { await api.delete('/organisations/'+id); toast.success('Deleted'); setDeleting(null); load() }
    catch { toast.error('Failed') }
  }

  const closeModal = () => { setModal(false); setEditing(null); setForm(DEFAULT_FORM) }

  if (loading) return <LoadingPage />

  const serviceArr = Array.isArray(form.service_types) ? form.service_types : []

  return (
    <div className="space-y-6">
      <PageHeader title="Organisations" subtitle={orgs.length+' organisations'}
        action={<button onClick={() => { setModal(true); setEditing(null); setForm(DEFAULT_FORM) }} className="btn-gold"><Plus size={16}/>Add Organisation</button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {orgs.map(org => {
          const ownerNames = Array.isArray(org.owners) && org.owners.length
            ? org.owners.map(o => o.name).filter(Boolean).join(', ')
            : org.owner_name
          const svcArr = Array.isArray(org.service_types) ? org.service_types : []
          return (
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
              {svcArr.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {svcArr.slice(0,3).map(s => <span key={s} className="badge-gold text-xs">{s}</span>)}
                  {svcArr.length > 3 && <span className="badge-gray text-xs">+{svcArr.length-3}</span>}
                </div>
              )}
              <div className="space-y-2 mb-4">
                {ownerNames && <div className="flex items-center gap-2 text-sm text-gray-400"><User size={13} className="text-gray-500"/><span>{ownerNames}</span></div>}
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
          )
        })}
        {orgs.length === 0 && <div className="col-span-3 text-center text-gray-500 py-20"><Building2 size={40} className="mx-auto mb-3 opacity-30"/><p>No organisations yet</p></div>}
      </div>

      <Modal open={!!docModal} onClose={() => setDocModal(null)} title={'Document — '+(docModal?.name||'')} size="lg">
        {docModal?.document_url && (
          <div className="space-y-3">
            {docModal.document_url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
              ? <img src={docModal.document_url} alt="Doc" className="w-full rounded-xl border border-dark-600"/>
              : <iframe src={docModal.document_url} width="100%" height="500px" className="rounded-xl border border-dark-600" title="Document" />
            }
            <a href={docModal.document_url} target="_blank" rel="noreferrer" className="btn-gold w-full justify-center"><FileText size={14}/>Open / Download</a>
          </div>
        )}
      </Modal>

      <Modal open={modal} onClose={closeModal} title={editing?'Edit Organisation':'New Organisation'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Basic Info */}
          <div>
            <label className="label">Organisation Name *</label>
            <input className="input" required value={form.name||''} onChange={e=>sf('name',e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Phone</label><input className="input" value={form.contact_number||''} onChange={e=>sf('contact_number',e.target.value)}/></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email||''} onChange={e=>sf('email',e.target.value)}/></div>
          </div>
          <div><label className="label">Address</label><textarea className="input" rows={2} value={form.address||''} onChange={e=>sf('address',e.target.value)}/></div>

          {/* Service Types */}
          <div>
            <label className="label">Service Types</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPE_OPTIONS.map(svc => (
                <button key={svc} type="button"
                  onClick={() => toggleService(svc)}
                  className={'text-xs px-3 py-1.5 rounded-lg border transition-all '+(serviceArr.includes(svc) ? 'bg-gold-500/20 border-gold-500/50 text-gold-400' : 'border-white/10 text-gray-400 hover:border-white/30')}>
                  {svc}
                </button>
              ))}
              <button type="button"
                onClick={() => toggleService('Other')}
                className={'text-xs px-3 py-1.5 rounded-lg border transition-all '+(serviceArr.includes('Other') ? 'bg-gold-500/20 border-gold-500/50 text-gold-400' : 'border-white/10 text-gray-400 hover:border-white/30')}>
                Other
              </button>
            </div>
            {serviceArr.includes('Other') && (
              <input className="input mt-2" placeholder="Specify service type…" value={form.service_other||''} onChange={e=>sf('service_other',e.target.value)}/>
            )}
          </div>

          {/* GST */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">GST Number</label>
              <input className="input" value={form.gst_number||''} onChange={e=>sf('gst_number',e.target.value)}/>
            </div>
            <div>
              <label className="label">GST Type</label>
              <select className="select" value={form.gst_type||''} onChange={e=>sf('gst_type',e.target.value)}>
                <option value="">Select…</option>
                {GST_TYPE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          {form.gst_type === 'Other' && (
            <div><label className="label">GST Type (specify)</label><input className="input" value={form.gst_type_other||''} onChange={e=>sf('gst_type_other',e.target.value)}/></div>
          )}

          {/* Udyam & PAN */}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Udyam No.</label><input className="input" value={form.udyam_number||''} onChange={e=>sf('udyam_number',e.target.value)}/></div>
            <div><label className="label">PAN No.</label><input className="input" value={form.pan_number||''} onChange={e=>sf('pan_number',e.target.value)}/></div>
          </div>

          {/* Owners */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Owners / Partners</label>
              <button type="button" onClick={addOwner} className="text-xs flex items-center gap-1 text-gold-400 hover:text-gold-300"><Plus size={12}/>Add Owner</button>
            </div>
            <div className="space-y-3">
              {(form.owners||[]).map((owner, i) => (
                <div key={i} className="rounded-xl border border-white/10 p-3 space-y-3" style={{background:'var(--bg3)'}}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Owner {i+1}</span>
                    <button type="button" onClick={() => removeOwner(i)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Name</label><input className="input" value={owner.name||''} onChange={e=>updateOwner(i,'name',e.target.value)}/></div>
                    <div><label className="label">Phone</label><input className="input" value={owner.phone||''} onChange={e=>updateOwner(i,'phone',e.target.value)}/></div>
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select className="select" value={owner.role||'Owner'} onChange={e=>updateOwner(i,'role',e.target.value)}>
                      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Signature</label>
                    <SignatureUpload value={owner.signature_url||''} onChange={v=>updateOwner(i,'signature_url',v)}/>
                  </div>
                </div>
              ))}
              {(form.owners||[]).length === 0 && (
                <div className="text-center py-4 rounded-xl border border-dashed border-white/10 text-gray-600 text-sm">No owners added</div>
              )}
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <label className="label">Bank Details</label>
            <div className="rounded-xl border border-white/10 p-4 space-y-3" style={{background:'var(--bg3)'}}>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Bank Name</label><input className="input" value={form.bank_name||''} onChange={e=>sf('bank_name',e.target.value)}/></div>
                <div>
                  <label className="label">Account Type</label>
                  <select className="select" value={form.account_type||'Current'} onChange={e=>sf('account_type',e.target.value)}>
                    <option value="Current">Current</option>
                    <option value="Saving">Saving</option>
                  </select>
                </div>
                <div><label className="label">Account Number</label><input className="input" value={form.account_number||''} onChange={e=>sf('account_number',e.target.value)}/></div>
                <div><label className="label">IFSC Code</label><input className="input" value={form.ifsc_code||''} onChange={e=>sf('ifsc_code',e.target.value)}/></div>
              </div>
              <div><label className="label">Branch</label><input className="input" value={form.branch||''} onChange={e=>sf('branch',e.target.value)}/></div>
              <div>
                <label className="label">Bank Passbook / Cheque</label>
                <DocUpload value={form.bank_passbook_url||''} onChange={v=>sf('bank_passbook_url',v)} folder="dgsystem/organisations/bank" label="Upload passbook or cancelled cheque" />
              </div>
            </div>
          </div>

          {/* Document */}
          <div>
            <label className="label">Organisation Image / Document</label>
            <DocUpload value={form.document_url||''} onChange={v=>sf('document_url',v)} folder="dgsystem/organisations" label="Upload image or PDF" />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={closeModal} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving?'Saving...':editing?'Save Changes':'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={()=>setDeleting(null)} onConfirm={()=>handleDelete(deleting)} title="Delete Organisation" message="This cannot be undone."/>
    </div>
  )
}

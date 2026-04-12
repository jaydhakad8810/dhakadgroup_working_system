import { useEffect, useState, useRef } from 'react'
import { Wrench, Camera, Upload, Loader2 } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, EmptyState, Modal } from '../../components/ui'

// Machine request modal — defined OUTSIDE parent
function MachineRequestModal({ machine, sites, open, onClose, onSuccess }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ site_id: '', from_date: today, to_date: today, notes: '', urgency: 'normal' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.notes.trim()) return toast.error('Enter purpose / reason')
    if (!form.site_id) return toast.error('Select a site')
    setSaving(true)
    try {
      await api.post('/machines/requests', {
        machine_id: machine?.id || '',
        site_id: form.site_id,
        request_date: form.from_date,
        from_date: form.from_date,
        to_date: form.to_date,
        notes: form.notes,
        urgency: form.urgency,
      })
      toast.success('Request sent to admin!')
      onClose()
      onSuccess()
    } catch (err) { toast.error(err.response?.data?.message || 'Request failed') }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={machine ? `Request: ${machine.name}` : 'Request Machine / Tool'}>
      <div className="space-y-3">
        {machine && (
          <div className="p-3 bg-surface-400 rounded-xl flex items-center gap-3">
            {machine.photos?.[0] && <img src={machine.photos[0]} className="w-12 h-12 object-cover rounded-xl" alt={machine.name} />}
            <div>
              <p className="text-white font-semibold text-sm">{machine.name}</p>
              <p className="text-gray-400 text-xs">{machine.category?.name}</p>
            </div>
          </div>
        )}
        <div>
          <label className="label">Site *</label>
          <select className="select" value={form.site_id} onChange={e => setForm(p => ({ ...p, site_id: e.target.value }))}>
            <option value="">Select site</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">From Date</label>
            <input type="date" className="input" value={form.from_date} onChange={e => setForm(p => ({ ...p, from_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">To Date</label>
            <input type="date" className="input" value={form.to_date} min={form.from_date} onChange={e => setForm(p => ({ ...p, to_date: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Purpose *</label>
          <textarea className="input" rows={3} placeholder="Why do you need this machine?" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
        <div>
          <label className="label">Priority</label>
          <div className="flex gap-2">
            {['normal', 'urgent'].map(u => (
              <button key={u} type="button" onClick={() => setForm(p => ({ ...p, urgency: u }))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                  form.urgency === u
                    ? u === 'urgent' ? 'bg-orange-500 text-white' : 'bg-primary-500 text-white'
                    : 'bg-surface-200 text-gray-400'
                }`}>{u}</button>
            ))}
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary w-full">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
          {saving ? 'Sending…' : 'Send Request to Admin'}
        </button>
      </div>
    </Modal>
  )
}

export default function Machines() {
  const [machines, setMachines] = useState([])
  const [sites, setSites] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('machines')
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [machineReqOpen, setMachineReqOpen] = useState(false)
  const [maintenanceModal, setMaintenanceModal] = useState(null)
  const [maintForm, setMaintForm] = useState({ purpose: '', completion_date: new Date().toISOString().split('T')[0], amount: '' })
  const [maintPhoto, setMaintPhoto] = useState(null)
  const [maintPreview, setMaintPreview] = useState(null)
  const [receiptPhoto, setReceiptPhoto] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const photoRef = useRef(); const receiptRef = useRef(); const cameraRef = useRef()

  const load = async () => {
    setLoading(true)
    try {
      const [m, s, r] = await Promise.all([api.get('/machines?all=true'), api.get('/sites'), api.get('/machines/requests/all')])
      setMachines(m.data); setSites(s.data); setRequests(r.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handlePhotoCapture = (e, type) => {
    const file = e.target.files[0]; if (!file) return
    const url = URL.createObjectURL(file)
    if (type === 'main') { setMaintPhoto(file); setMaintPreview(url) }
    else { setReceiptPhoto(file); setReceiptPreview(url) }
  }

  const handleMaintenance = async () => {
    if (!maintForm.purpose) return toast.error('Enter purpose')
    if (!maintPhoto) return toast.error('Maintenance photo is required')
    setSaving(true)
    try {
      const fd = new FormData(); fd.append('file', maintPhoto); fd.append('folder', 'dgsystem/maintenance')
      const { data: up1 } = await api.post('/upload', fd)
      let receiptUrl = null
      if (receiptPhoto) {
        const fd2 = new FormData(); fd2.append('file', receiptPhoto); fd2.append('folder', 'dgsystem/maintenance')
        const { data: up2 } = await api.post('/upload', fd2); receiptUrl = up2.url
      }
      await api.post('/machines/'+maintenanceModal.id+'/maintenance', { ...maintForm, photo: up1.url, receipt_photo: receiptUrl })
      toast.success('Maintenance logged!')
      setMaintenanceModal(null); setMaintPhoto(null); setMaintPreview(null); setReceiptPhoto(null); setReceiptPreview(null)
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setSaving(false)
  }

  if (loading) return <LoadingPage />

  return (
    <div className="page-content space-y-4">
      <div className="flex gap-1 bg-surface-400 rounded-xl p-1">
        {['machines','requests'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={'flex-1 py-2 rounded-lg text-sm font-medium transition-all '+(tab===t?'bg-primary-500 text-white':'text-gray-400')}>
            {t==='machines'?'Machines ('+machines.length+')':'My Requests ('+requests.length+')'}
          </button>
        ))}
      </div>

      {tab==='machines' && (
        <div className="space-y-3">
          {machines.length===0 && <EmptyState icon={Wrench} title="No Machines" description="No machines assigned to your sites"/>}
          {machines.map(m => (
            <div key={m.id} className="card space-y-3 cursor-pointer active:scale-95 transition-transform"
              onClick={() => { setSelectedMachine(m); setMachineReqOpen(true) }}>
              {m.photos?.[0] && <img src={m.photos[0]} className="w-full h-36 object-cover rounded-xl" alt={m.name}/>}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-white font-bold">{m.name}</h3>
                  <p className="text-gray-500 text-sm">{m.category?.name}</p>
                  {m.serial_number && <p className="text-gray-600 text-xs">S/N: {m.serial_number}</p>}
                </div>
                <span className={'text-xs px-2 py-1 rounded-full border font-semibold '+(m.status==='available'?'bg-green-500/15 text-green-400 border-green-500/20':m.status==='in_use'?'bg-blue-500/15 text-blue-400 border-blue-500/20':'bg-orange-500/15 text-orange-400 border-orange-500/20')}>
                  {m.status?.replace('_',' ').toUpperCase()}
                </span>
              </div>
              {m.site && <p className="text-sm text-gray-400">📍 {m.site.name}</p>}
              <button
                onClick={e => {
                  e.stopPropagation()
                  setMaintenanceModal(m)
                  setMaintForm({ purpose: '', completion_date: new Date().toISOString().split('T')[0], amount: '' })
                  setMaintPhoto(null); setMaintPreview(null); setReceiptPhoto(null); setReceiptPreview(null)
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-all">
                <Wrench size={14}/>Log Maintenance
              </button>
              <p className="text-center text-xs text-gray-500">Tap card to request this machine</p>
            </div>
          ))}
        </div>
      )}

      {tab==='requests' && (
        <div className="space-y-3">
          {requests.length===0 && <EmptyState icon={Wrench} title="No Requests" description="No machine requests yet"/>}
          {requests.map(r => (
            <div key={r.id} className="card space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">{r.machine?.name||'Any Available Machine'}</p>
                  <p className="text-gray-500 text-xs">{r.request_date} · {r.site?.name}</p>
                </div>
                <span className={'text-xs px-2 py-1 rounded-full font-semibold '+(r.status==='approved'?'bg-green-500/15 text-green-400':r.status==='completed'?'bg-blue-500/15 text-blue-400':'bg-yellow-500/15 text-yellow-400')}>
                  {r.status?.toUpperCase()}
                </span>
              </div>
              {r.notes && <p className="text-gray-400 text-sm">{r.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Machine Request Modal */}
      <MachineRequestModal
        machine={selectedMachine}
        sites={sites}
        open={machineReqOpen}
        onClose={() => { setMachineReqOpen(false); setSelectedMachine(null) }}
        onSuccess={load}
      />

      <Modal open={!!maintenanceModal} onClose={()=>setMaintenanceModal(null)} title={'Maintenance — '+(maintenanceModal?.name||'')}>
        <div className="space-y-4">
          <div><label className="label">Purpose *</label>
            <textarea className="input" rows={2} placeholder="What maintenance was done?" value={maintForm.purpose} onChange={e=>setMaintForm(p=>({...p,purpose:e.target.value}))}/>
          </div>
          <div><label className="label">Completion Date</label>
            <input type="date" className="input" value={maintForm.completion_date} onChange={e=>setMaintForm(p=>({...p,completion_date:e.target.value}))}/>
          </div>
          <div><label className="label">Amount (₹)</label>
            <input type="number" className="input" placeholder="0" value={maintForm.amount} onChange={e=>setMaintForm(p=>({...p,amount:e.target.value}))}/>
          </div>
          <div>
            <p className="label">Maintenance Photo <span className="text-red-400">*Required</span></p>
            {maintPreview ? (
              <div className="relative"><img src={maintPreview} className="w-full rounded-xl max-h-36 object-cover"/>
                <button onClick={()=>{setMaintPhoto(null);setMaintPreview(null)}} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={()=>cameraRef.current?.click()} className="flex flex-col items-center gap-2 py-3 rounded-xl border-2 border-dashed border-dark-600 text-gray-400 hover:border-primary-500 transition-all"><Camera size={20}/><span className="text-xs">Camera</span></button>
                <button onClick={()=>photoRef.current?.click()} className="flex flex-col items-center gap-2 py-3 rounded-xl border-2 border-dashed border-dark-600 text-gray-400 hover:border-primary-500 transition-all"><Upload size={20}/><span className="text-xs">Upload</span></button>
              </div>
            )}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>handlePhotoCapture(e,'main')}/>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e=>handlePhotoCapture(e,'main')}/>
          </div>
          <div>
            <p className="label">Receipt Photo <span className="text-gray-500 text-xs">(Optional)</span></p>
            {receiptPreview ? (
              <div className="relative"><img src={receiptPreview} className="w-full rounded-xl max-h-28 object-cover"/>
                <button onClick={()=>{setReceiptPhoto(null);setReceiptPreview(null)}} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
              </div>
            ) : (
              <button onClick={()=>receiptRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-dark-600 text-gray-400 hover:border-primary-500 transition-all text-sm">
                <Upload size={16}/>Upload Receipt
              </button>
            )}
            <input ref={receiptRef} type="file" accept="image/*" className="hidden" onChange={e=>handlePhotoCapture(e,'receipt')}/>
          </div>
          <button onClick={handleMaintenance} disabled={saving||!maintPhoto}
            className={'w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all '+(maintPhoto?'bg-orange-500 text-white hover:bg-orange-600':'bg-gray-700 text-gray-500 cursor-not-allowed')}>
            {saving?<Loader2 size={16} className="animate-spin"/>:<Wrench size={16}/>}
            {saving?'Logging...':maintPhoto?'Log Maintenance':'Add Photo First'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

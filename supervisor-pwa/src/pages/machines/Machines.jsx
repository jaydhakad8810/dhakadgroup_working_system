import { useEffect, useState, useRef } from 'react'
import { Wrench, Plus, Camera, Upload, Loader2 } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, EmptyState, Modal } from '../../components/ui'

export default function Machines() {
  const [machines, setMachines] = useState([])
  const [sites, setSites] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('machines')
  const [requestModal, setRequestModal] = useState(false)
  const [maintenanceModal, setMaintenanceModal] = useState(null)
  const [requestForm, setRequestForm] = useState({ machine_id: '', site_id: '', notes: '', request_date: new Date().toISOString().split('T')[0] })
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
      const [m, s, r] = await Promise.all([api.get('/machines'), api.get('/sites'), api.get('/machines/requests/all')])
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

  const handleRequest = async () => {
    if (!requestForm.notes) return toast.error('Please enter purpose')
    setSaving(true)
    try {
      await api.post('/machines/requests', requestForm)
      toast.success('Machine request sent to admin!')
      setRequestModal(false)
      setRequestForm({ machine_id: '', site_id: '', notes: '', request_date: new Date().toISOString().split('T')[0] })
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setSaving(false)
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
      <button onClick={() => setRequestModal(true)} className="btn-primary w-full"><Plus size={16}/>Request Machine / Tool</button>

      {tab==='machines' && (
        <div className="space-y-3">
          {machines.length===0 && <EmptyState icon={Wrench} title="No Machines" description="No machines assigned to your sites"/>}
          {machines.map(m => (
            <div key={m.id} className="card space-y-3">
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
              <button onClick={()=>{setMaintenanceModal(m);setMaintForm({purpose:'',completion_date:new Date().toISOString().split('T')[0],amount:''});setMaintPhoto(null);setMaintPreview(null);setReceiptPhoto(null);setReceiptPreview(null)}}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-all">
                <Wrench size={14}/>Log Maintenance
              </button>
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

      <Modal open={requestModal} onClose={()=>setRequestModal(false)} title="Request Machine / Tool">
        <div className="space-y-3">
          <div><label className="label">Machine (Optional)</label>
            <select className="select" value={requestForm.machine_id} onChange={e=>setRequestForm(p=>({...p,machine_id:e.target.value}))}>
              <option value="">Any Available</option>
              {machines.filter(m=>m.status==='available').map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div><label className="label">Site *</label>
            <select className="select" value={requestForm.site_id} onChange={e=>setRequestForm(p=>({...p,site_id:e.target.value}))}>
              <option value="">Select site</option>
              {sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="label">Date Needed</label>
            <input type="date" className="input" value={requestForm.request_date} onChange={e=>setRequestForm(p=>({...p,request_date:e.target.value}))}/>
          </div>
          <div><label className="label">Purpose *</label>
            <textarea className="input" rows={3} placeholder="Why do you need this?" value={requestForm.notes} onChange={e=>setRequestForm(p=>({...p,notes:e.target.value}))}/>
          </div>
          <button onClick={handleRequest} disabled={saving} className="btn-primary w-full">
            {saving?<Loader2 size={16} className="animate-spin"/>:<Plus size={16}/>}
            {saving?'Sending...':'Send Request to Admin'}
          </button>
        </div>
      </Modal>

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

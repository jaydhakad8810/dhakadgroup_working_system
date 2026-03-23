import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, Save, Loader2, ArrowRightLeft, Plus, Trash2, Camera, CheckSquare } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, EmptyState, Modal } from '../../components/ui'
import { Users } from 'lucide-react'

export default function MarkAttendance() {
  const [searchParams] = useSearchParams()
  const [sites, setSites] = useState([])
  const [labour, setLabour] = useState([])
  const [attendance, setAttendance] = useState({})
  const [checkinPhotos, setCheckinPhotos] = useState({})
  const [tasks, setTasks] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterSite, setFilterSite] = useState(searchParams.get('site_id') || '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [step, setStep] = useState('attendance')
  const [transferModal, setTransferModal] = useState(false)
  const [transferLabour, setTransferLabour] = useState(null)
  const [transferForm, setTransferForm] = useState({ to_site_id: '', reason: '', duration_days: 1 })
  const [transferring, setTransferring] = useState(false)
  const [materials, setMaterials] = useState([{ material_name: '', quantity: '', unit: 'nos' }])
  const [photoLabour, setPhotoLabour] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const cameraRef = useRef()
  const fileRef = useRef()

  useEffect(() => { api.get('/sites').then(r => setSites(r.data)).catch(() => {}) }, [])
  useEffect(() => {
    if (!filterSite) { setLabour([]); return }
    setLoading(true)
    Promise.all([
      api.get('/labour?site_id='+filterSite+'&is_active=true'),
      api.get('/attendance?site_id='+filterSite+'&date='+date)
    ]).then(([l,a]) => {
      setLabour(l.data)
      const map = {}; a.data.forEach(r => { map[r.labour_id] = r.status }); setAttendance(map)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [filterSite, date])

  const setStatus = (id, s) => setAttendance(p => ({ ...p, [id]: p[id]===s?undefined:s }))
  const markAll = (s) => { const m = {}; labour.forEach(l => { m[l.id] = s }); setAttendance(m) }
  const addMaterial = () => setMaterials(p => [...p, { material_name:'',quantity:'',unit:'nos' }])
  const removeMaterial = (i) => setMaterials(p => p.filter((_,idx) => idx!==i))
  const updateMaterial = (i,key,val) => setMaterials(p => p.map((m,idx) => idx===i?{...m,[key]:val}:m))

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0]; if (!file || !photoLabour) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData(); fd.append('file',file); fd.append('folder','dgsystem/checkin')
      const { data } = await api.post('/upload', fd)
      setCheckinPhotos(p => ({ ...p, [photoLabour]: data.url }))
      toast.success('Check-in photo saved!')
    } catch { toast.error('Upload failed') }
    setUploadingPhoto(false); setPhotoLabour(null)
  }

  const handleSave = async () => {
    if (!filterSite) return toast.error('Select a site first')
    const records = labour.map(l => ({ labour_id:l.id, status:attendance[l.id]||'absent', day_multiplier:attendance[l.id]==='half_day'?0.5:1, checkin_photo:checkinPhotos[l.id]||null, task_note:tasks[l.id]||null }))
    const validMaterials = materials.filter(m => m.material_name.trim() && m.quantity)
    setSaving(true)
    try {
      await api.post('/attendance/bulk', { site_id:filterSite, date, records, material_usage:validMaterials })
      toast.success('Day saved for '+records.length+' workers!')
      setStep('complete')
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const openTransfer = (l) => { setTransferLabour(l); setTransferForm({to_site_id:'',reason:'',duration_days:1}); setTransferModal(true) }
  const handleTransfer = async () => {
    if (!transferForm.to_site_id) return toast.error('Select site')
    setTransferring(true)
    try {
      await api.post('/attendance/transfer', { labour_id:transferLabour.id, from_site_id:filterSite, to_site_id:transferForm.to_site_id, reason:transferForm.reason, duration_days:transferForm.duration_days, transfer_date:date })
      toast.success(transferLabour.name+' transferred!'); setTransferModal(false)
      const l = await api.get('/labour?site_id='+filterSite+'&is_active=true'); setLabour(l.data)
    } catch (err) { toast.error(err.response?.data?.message||'Failed') }
    setTransferring(false)
  }

  const presentCount = Object.values(attendance).filter(v=>v==='present').length
  const halfCount = Object.values(attendance).filter(v=>v==='half_day').length
  const absentCount = Object.values(attendance).filter(v=>v==='absent').length
  const presentLabour = labour.filter(l=>attendance[l.id]==='present'||attendance[l.id]==='half_day')
  const otherSites = sites.filter(s=>s.id!==filterSite)

  if (step==='complete') return (
    <div className="page-content flex flex-col items-center justify-center min-h-96 space-y-4 text-center">
      <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"><CheckCircle size={40} className="text-green-400"/></div>
      <h2 className="text-white font-bold text-xl">Day Complete!</h2>
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        <div className="bg-green-500/10 rounded-xl p-3 text-center"><p className="text-green-400 font-bold text-xl">{presentCount+halfCount}</p><p className="text-xs text-gray-500">Present</p></div>
        <div className="bg-blue-500/10 rounded-xl p-3 text-center"><p className="text-blue-400 font-bold text-xl">{Object.values(checkinPhotos).length}</p><p className="text-xs text-gray-500">Photos</p></div>
        <div className="bg-gold-500/10 rounded-xl p-3 text-center"><p className="text-gold-400 font-bold text-xl">{materials.filter(m=>m.material_name).length}</p><p className="text-xs text-gray-500">Materials</p></div>
      </div>
      <button onClick={()=>{setStep('attendance');setAttendance({});setCheckinPhotos({});setTasks({});setMaterials([{material_name:'',quantity:'',unit:'nos'}])}} className="btn-primary w-full max-w-xs">Mark New Day</button>
    </div>
  )

  return (
    <div className="page-content space-y-4">
      <div className="space-y-2">
        <select className="select" value={filterSite} onChange={e=>setFilterSite(e.target.value)}>
          <option value="">Select Site *</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" className="input" value={date} onChange={e=>setDate(e.target.value)} max={new Date().toISOString().split('T')[0]}/>
      </div>

      {labour.length>0&&(
        <div className="flex gap-1">
          {['attendance','checkin','material'].map((s,i)=>(
            <button key={s} onClick={()=>setStep(s)} className={'flex-1 py-2 rounded-xl text-xs font-semibold transition-all '+(step===s?'bg-primary-500 text-white':'bg-surface-400 text-gray-500')}>
              {i+1}. {s==='attendance'?'Attend':s==='checkin'?'Check-In':'Materials'}
            </button>
          ))}
        </div>
      )}

      {step==='attendance'&&labour.length>0&&(<>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2"><p className="text-green-400 font-bold text-xl">{presentCount}</p><p className="text-xs text-gray-500">Present</p></div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2"><p className="text-yellow-400 font-bold text-xl">{halfCount}</p><p className="text-xs text-gray-500">Half Day</p></div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2"><p className="text-red-400 font-bold text-xl">{absentCount}</p><p className="text-xs text-gray-500">Absent</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>markAll('present')} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-green-500/15 text-green-400 border border-green-500/20">All Present</button>
          <button onClick={()=>markAll('absent')} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-500/15 text-red-400 border border-red-500/20">All Absent</button>
        </div>
        <div className="space-y-2">
          {labour.map(l => {
            const s = attendance[l.id]
            return (
              <div key={l.id} className="card py-3">
                <div className="flex items-center gap-3">
                  {l.photo?<img src={l.photo} className="w-10 h-10 rounded-xl object-cover flex-shrink-0"/>:<div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold flex-shrink-0">{l.name[0]}</div>}
                  <div className="flex-1 min-w-0"><p className="text-white font-medium text-sm truncate">{l.name}</p><p className="text-gray-500 text-xs">₹{parseFloat(l.daily_wage).toLocaleString('en-IN')}/day</p></div>
                  <div className="flex gap-1">
                    <button onClick={()=>setStatus(l.id,'present')} className={'w-9 h-9 rounded-xl flex items-center justify-center transition-all '+(s==='present'?'bg-green-500 text-white':'bg-surface-200 text-gray-500')}><CheckCircle size={16}/></button>
                    <button onClick={()=>setStatus(l.id,'half_day')} className={'w-9 h-9 rounded-xl flex items-center justify-center transition-all '+(s==='half_day'?'bg-primary-500 text-white':'bg-surface-200 text-gray-500')}><Clock size={16}/></button>
                    <button onClick={()=>setStatus(l.id,'absent')} className={'w-9 h-9 rounded-xl flex items-center justify-center transition-all '+(s==='absent'?'bg-red-500 text-white':'bg-surface-200 text-gray-500')}><XCircle size={16}/></button>
                    <button onClick={()=>openTransfer(l)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-200 text-gray-500 hover:text-orange-400 transition-all"><ArrowRightLeft size={14}/></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={()=>setStep('checkin')} disabled={presentCount+halfCount===0} className={'w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all '+(presentCount+halfCount>0?'bg-primary-500 text-white':'bg-gray-700 text-gray-500 cursor-not-allowed')}>
          Next: Check-In Photos →
        </button>
      </>)}

      {step==='checkin'&&(<>
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl"><p className="text-blue-400 font-semibold text-sm">📸 Labour Check-In + Task Assignment</p><p className="text-gray-500 text-xs">Capture photo and assign today's task</p></div>
        <div className="space-y-3">
          {presentLabour.map(l=>(
            <div key={l.id} className="card space-y-2">
              <div className="flex items-center gap-3">
                {l.photo?<img src={l.photo} className="w-10 h-10 rounded-xl object-cover"/>:<div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold">{l.name[0]}</div>}
                <div className="flex-1"><p className="text-white font-medium text-sm">{l.name}</p><p className="text-xs text-gray-500">{attendance[l.id]==='half_day'?'Half Day':'Present'}</p></div>
                {checkinPhotos[l.id]?(
                  <div className="relative"><img src={checkinPhotos[l.id]} className="w-12 h-12 rounded-xl object-cover border-2 border-green-500"/><CheckCircle size={14} className="absolute -top-1 -right-1 text-green-400 bg-dark-950 rounded-full"/></div>
                ):(
                  <button onClick={()=>{setPhotoLabour(l.id);cameraRef.current?.click()}} disabled={uploadingPhoto&&photoLabour===l.id} className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl bg-primary-500/15 text-primary-400 border border-primary-500/20">
                    {uploadingPhoto&&photoLabour===l.id?<Loader2 size={12} className="animate-spin"/>:<Camera size={14}/>}Photo
                  </button>
                )}
              </div>
              <input className="input text-sm py-2" placeholder="Today's task (optional)..." value={tasks[l.id]||''} onChange={e=>setTasks(p=>({...p,[l.id]:e.target.value}))}/>
            </div>
          ))}
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture}/>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoCapture}/>
        <button onClick={()=>setStep('material')} className="btn-primary w-full py-3">Next: Material Usage →</button>
      </>)}

      {step==='material'&&(<>
        <div className="p-3 bg-gold-500/10 border border-gold-500/20 rounded-xl"><p className="text-gold-400 font-semibold text-sm">📦 Daily Material Usage</p><p className="text-gray-500 text-xs">Log materials used today</p></div>
        <div className="card space-y-3">
          {materials.map((m,i)=>(
            <div key={i} className="flex gap-2 items-center">
              <input className="input flex-1 text-sm py-2" placeholder="Material" value={m.material_name} onChange={e=>updateMaterial(i,'material_name',e.target.value)}/>
              <input className="input w-20 text-sm py-2" placeholder="Qty" type="number" value={m.quantity} onChange={e=>updateMaterial(i,'quantity',e.target.value)}/>
              <select className="select w-20 text-sm py-2" value={m.unit} onChange={e=>updateMaterial(i,'unit',e.target.value)}><option>nos</option><option>kg</option><option>ltr</option><option>bag</option><option>mtr</option></select>
              {materials.length>1&&<button onClick={()=>removeMaterial(i)} className="text-red-400 p-1"><Trash2 size={14}/></button>}
            </div>
          ))}
          <button onClick={addMaterial} className="flex items-center gap-1 text-sm text-gold-400 py-1"><Plus size={14}/>Add Material</button>
        </div>
        <div className="card bg-surface-300 space-y-2">
          <p className="text-white font-semibold text-sm">📋 Day Summary</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-green-500/10 rounded-xl p-2"><p className="text-green-400 font-bold">{presentCount+halfCount}</p><p className="text-xs text-gray-500">Present</p></div>
            <div className="bg-blue-500/10 rounded-xl p-2"><p className="text-blue-400 font-bold">{Object.values(checkinPhotos).length}</p><p className="text-xs text-gray-500">Photos</p></div>
            <div className="bg-gold-500/10 rounded-xl p-2"><p className="text-gold-400 font-bold">{materials.filter(m=>m.material_name).length}</p><p className="text-xs text-gray-500">Materials</p></div>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-4 font-bold text-base">
          {saving?<Loader2 size={18} className="animate-spin"/>:<CheckSquare size={18}/>}
          {saving?'Saving...':'Complete Day & Save'}
        </button>
      </>)}

      {filterSite&&!loading&&labour.length===0&&<EmptyState icon={Users} title="No Labour" description="No active labour found"/>}

      <Modal open={transferModal} onClose={()=>setTransferModal(false)} title={'Transfer — '+(transferLabour?.name||'')}>
        <div className="space-y-3">
          <div><label className="label">Transfer to Site *</label><select className="select" value={transferForm.to_site_id} onChange={e=>setTransferForm(p=>({...p,to_site_id:e.target.value}))}><option value="">Select site</option>{otherSites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="label">Duration (days)</label><input type="number" className="input" min="1" value={transferForm.duration_days} onChange={e=>setTransferForm(p=>({...p,duration_days:e.target.value}))}/></div>
          <div><label className="label">Reason</label><input className="input" placeholder="Reason" value={transferForm.reason} onChange={e=>setTransferForm(p=>({...p,reason:e.target.value}))}/></div>
          <button onClick={handleTransfer} disabled={transferring} className="btn-primary w-full">{transferring?'Transferring...':'Confirm Transfer'}</button>
        </div>
      </Modal>
    </div>
  )
}

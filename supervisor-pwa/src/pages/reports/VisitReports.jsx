import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, ChevronRight, Camera, Upload, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, EmptyState, StatusBadge, Modal } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function VisitReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [sites, setSites] = useState([])
  const [viewModal, setViewModal] = useState(null)
  const [tab, setTab] = useState('my')
  const [taskModal, setTaskModal] = useState(null)
  const [proofPhoto, setProofPhoto] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [updatingTask, setUpdatingTask] = useState(null)
  const fileRef = useRef()
  const cameraRef = useRef()
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { api.get('/sites').then(r => setSites(r.data)).catch(() => {}) }, [])

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.append('status', filterStatus)
    if (filterSite) params.append('site_id', filterSite)
    api.get('/visit-reports?'+params).then(r => setReports(r.data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [filterStatus, filterSite])

  const myReports = reports.filter(r => r.supervisor_id === user?.id || r.created_by === user?.id)
  const adminReports = reports.filter(r => r.supervisor_id !== user?.id && r.created_by !== user?.id)
  const displayReports = tab === 'my' ? myReports : adminReports
  const pendingTasks = reports.flatMap(r => (r.tasks||[]).map(t=>({...t,report:r}))).filter(t => t.status !== 'done')
  const selectedReport = reports.find(r => r.id === viewModal)

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0]; if (!file) return
    setProofPhoto(file); setProofPreview(URL.createObjectURL(file))
  }

  const handleTaskProgress = async (task) => {
    setUpdatingTask(task.id)
    try { await api.patch('/visit-reports/tasks/'+task.id, { status: 'in_progress' }); toast.success('Task started'); load() }
    catch { toast.error('Failed') }
    setUpdatingTask(null)
  }

  const handleCompleteTask = async () => {
    if (!proofPhoto) return toast.error('Photo proof is required!')
    setCompleting(true)
    try {
      const fd = new FormData(); fd.append('file', proofPhoto); fd.append('folder', 'dgsystem/task-proof')
      const { data: uploaded } = await api.post('/upload', fd)
      await api.patch('/visit-reports/tasks/'+taskModal.id, { status: 'done', completion_photo: uploaded.url })
      toast.success('Task completed with photo proof!')
      setTaskModal(null); setProofPhoto(null); setProofPreview(null); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setCompleting(false)
  }

  const deadlineColor = (d) => {
    if (!d) return 'text-gray-500'
    const days = Math.ceil((new Date(d)-new Date())/(1000*60*60*24))
    return days < 0 ? 'text-red-400' : days <= 2 ? 'text-orange-400' : 'text-gray-400'
  }

  return (
    <div className="page-content space-y-4">
      <button onClick={() => navigate('/reports/add')} className="btn-primary w-full"><Plus size={18}/>New Visit Report</button>

      {pendingTasks.length > 0 && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
          <p className="text-orange-400 font-semibold text-sm">📋 {pendingTasks.length} pending task{pendingTasks.length>1?'s':''} assigned to you</p>
          <div className="mt-2 space-y-1">
            {pendingTasks.slice(0,3).map(t=>(
              <div key={t.id} className="flex items-center justify-between">
                <p className="text-xs text-gray-400 truncate flex-1">{t.task}</p>
                {t.deadline && <p className={'text-xs ml-2 '+deadlineColor(t.deadline)}>{new Date(t.deadline).toLocaleDateString()}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-surface-400 rounded-xl p-1">
        <button onClick={() => setTab('my')} className={'flex-1 py-2 rounded-lg text-sm font-medium transition-all '+(tab==='my'?'bg-primary-500 text-white':'text-gray-400')}>My Reports ({myReports.length})</button>
        <button onClick={() => setTab('admin')} className={'flex-1 py-2 rounded-lg text-sm font-medium transition-all '+(tab==='admin'?'bg-primary-500 text-white':'text-gray-400')}>Admin Reports ({adminReports.length})</button>
      </div>

      <div className="flex gap-2">
        <select className="select flex-1 text-sm py-2" value={filterSite} onChange={e=>setFilterSite(e.target.value)}>
          <option value="">All Sites</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="select flex-1 text-sm py-2" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">All Status</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="closed">Closed</option>
        </select>
      </div>

      {loading ? <LoadingPage/> : (
        <div className="space-y-3">
          {displayReports.map(r => {
            const pending = (r.tasks||[]).filter(t=>t.status!=='done')
            return (
              <button key={r.id} onClick={()=>setViewModal(r.id)} className="card w-full text-left active:scale-95 transition-transform space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{r.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{r.site?.name} · {r.report_date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pending.length>0 && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">{pending.length} task{pending.length>1?'s':''}</span>}
                    <StatusBadge status={r.status}/><ChevronRight size={14} className="text-gray-500"/>
                  </div>
                </div>
              </button>
            )
          })}
          {displayReports.length===0 && <EmptyState icon={FileText} title="No Reports" description="No reports found"/>}
        </div>
      )}

      <Modal open={!!viewModal} onClose={()=>setViewModal(null)} title="Visit Report" size="lg">
        {selectedReport && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Date:</span><span className="text-white ml-1">{selectedReport.report_date}</span></div>
              <div><span className="text-gray-500">Site:</span><span className="text-white ml-1">{selectedReport.site?.name}</span></div>
            </div>
            {selectedReport.notes_for_supervisor && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-blue-400 text-xs font-semibold mb-1">📝 Note from Admin</p>
                <p className="text-white text-sm">{selectedReport.notes_for_supervisor}</p>
              </div>
            )}
            {selectedReport.supervisor_rating && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Your Rating:</span>
                <div className="flex">{[1,2,3,4,5].map(s=><span key={s} className={s<=selectedReport.supervisor_rating?'text-yellow-400':'text-gray-600'}>★</span>)}</div>
              </div>
            )}
            {selectedReport.tasks?.length > 0 && (
              <div>
                <p className="text-white font-semibold text-sm mb-2">📋 Assigned Tasks</p>
                <div className="space-y-2">
                  {selectedReport.tasks.map(task => (
                    <div key={task.id} className="p-3 bg-surface-400 rounded-xl">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{task.task}</p>
                          {task.deadline && <p className={'text-xs mt-0.5 '+deadlineColor(task.deadline)}>Deadline: {new Date(task.deadline).toLocaleDateString()}</p>}
                          {task.completion_photo && <img src={task.completion_photo} alt="Proof" className="mt-2 rounded-lg w-full max-h-32 object-cover"/>}
                        </div>
                        {task.status !== 'done' ? (
                          <div className="flex gap-1.5 shrink-0">
                            {task.status === 'pending' && (
                              <button onClick={()=>handleTaskProgress(task)} disabled={updatingTask===task.id} className="text-xs px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 font-semibold">
                                {updatingTask===task.id?'...':'Start'}
                              </button>
                            )}
                            <button onClick={()=>{setTaskModal(task);setProofPhoto(null);setProofPreview(null)}} className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-400 font-semibold">Complete</button>
                          </div>
                        ) : <span className="text-xs text-green-400 font-semibold shrink-0">✓ Done</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!taskModal} onClose={()=>{setTaskModal(null);setProofPhoto(null);setProofPreview(null)}} title="Complete Task">
        {taskModal && (
          <div className="space-y-4">
            <div className="p-3 bg-surface-400 rounded-xl">
              <p className="text-white font-semibold">{taskModal.task}</p>
              {taskModal.deadline && <p className="text-xs text-gray-500 mt-1">Deadline: {new Date(taskModal.deadline).toLocaleDateString()}</p>}
            </div>
            <div>
              <p className="text-white text-sm font-semibold mb-1">📸 Photo Proof <span className="text-red-400">*Required</span></p>
              <p className="text-gray-500 text-xs mb-3">Upload photo as proof of completion</p>
              {proofPreview ? (
                <div className="relative">
                  <img src={proofPreview} alt="Proof" className="w-full rounded-xl max-h-48 object-cover"/>
                  <button onClick={()=>{setProofPhoto(null);setProofPreview(null)}} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={()=>cameraRef.current?.click()} className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-dashed border-dark-600 text-gray-400 hover:border-primary-500 hover:text-primary-400 transition-all">
                    <Camera size={22}/><span className="text-xs">Take Photo</span>
                  </button>
                  <button onClick={()=>fileRef.current?.click()} className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-dashed border-dark-600 text-gray-400 hover:border-primary-500 hover:text-primary-400 transition-all">
                    <Upload size={22}/><span className="text-xs">Upload</span>
                  </button>
                </div>
              )}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCapture}/>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoCapture}/>
            </div>
            <button onClick={handleCompleteTask} disabled={completing||!proofPhoto}
              className={'w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all '+(proofPhoto?'bg-green-500 text-white hover:bg-green-600':'bg-gray-700 text-gray-500 cursor-not-allowed')}>
              {completing?<Loader2 size={18} className="animate-spin"/>:<CheckCircle size={18}/>}
              {completing?'Completing...':proofPhoto?'Mark as Completed':'Add Photo First'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

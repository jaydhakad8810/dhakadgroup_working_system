import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Camera, CheckCircle, Clock, BarChart2, Download, Printer } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, EmptyState, StatusBadge, Modal } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function VisitReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [sites, setSites] = useState([])
  const [viewModal, setViewModal] = useState(null)
  const [tab, setTab] = useState('my')
  const { user } = useAuth()
  const navigate = useNavigate()

  // Photo proof completion state
  const [completeTask, setCompleteTask] = useState(null)
  const [proofPhoto, setProofPhoto] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [completing, setCompleting] = useState(false)
  const fileRef = useRef()

  // Daily report state
  const [reportModal, setReportModal] = useState(false)
  const [reportSiteId, setReportSiteId] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [dailySummary, setDailySummary] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    api.get('/sites').then(r => {
      setSites(r.data)
      if (r.data.length > 0) setReportSiteId(r.data[0].id)
    }).catch(() => {})
  }, [])

  const loadReports = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.append('status', filterStatus)
    if (filterSite) params.append('site_id', filterSite)
    api.get(`/visit-reports?${params}`)
      .then(r => setReports(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadReports() }, [filterStatus, filterSite, tab])

  const myReports = reports.filter(r => r.supervisor_id === user?.id || r.created_by === user?.id)
  const adminReports = reports.filter(r => r.supervisor_id !== user?.id && r.created_by !== user?.id)
  const displayReports = tab === 'my' ? myReports : adminReports

  const myTasks = reports.flatMap(r => (r.tasks || []).map(t => ({ ...t, report: r })))
  const pendingTasks = myTasks.filter(t => t.status !== 'done')

  const selectedReport = reports.find(r => r.id === viewModal)

  // Photo proof handlers
  const handlePhotoCapture = async (file) => {
    if (!file) return
    setProofUploading(true)
    setProofPreview(URL.createObjectURL(file))
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const { data } = await api.post('/upload/base64', { data: e.target.result, folder: 'dgsystem/task-proofs' })
          setProofPhoto(data.url)
        } catch { setProofPhoto(null); setProofPreview(null) }
        setProofUploading(false)
      }
      reader.readAsDataURL(file)
    } catch { setProofUploading(false) }
  }

  const refreshReport = async (reportId) => {
    try {
      const updated = await api.get(`/visit-reports/${reportId}`)
      setReports(prev => prev.map(r => r.id === reportId ? updated.data : r))
    } catch {}
  }

  const handleMarkInProgress = async (task) => {
    try {
      await api.patch(`/visit-reports/tasks/${task.id}`, { status: 'in_progress' })
      await refreshReport(selectedReport.id)
    } catch {}
  }

  const handleMarkComplete = async () => {
    if (!proofPhoto || !completeTask) return
    setCompleting(true)
    try {
      await api.patch(`/visit-reports/tasks/${completeTask.id}`, {
        status: 'done',
        completion_photo: proofPhoto,
      })
      await refreshReport(selectedReport.id)
      setCompleteTask(null)
      setProofPhoto(null)
      setProofPreview(null)
    } catch {}
    setCompleting(false)
  }

  const openCompleteModal = (task) => {
    setCompleteTask(task)
    setProofPhoto(null)
    setProofPreview(null)
  }

  // Daily report handlers
  const generateReport = async () => {
    if (!reportSiteId) return
    setReportLoading(true)
    setDailySummary(null)
    try {
      const { data } = await api.get(`/visit-reports/daily-summary/${reportSiteId}?date=${reportDate}`)
      setDailySummary(data)
    } catch {}
    setReportLoading(false)
  }

  const exportCSV = () => {
    if (!dailySummary) return
    const s = dailySummary
    const rows = [
      [`DGSystem Daily Report`],
      [`Site: ${s.site?.name}`, `Date: ${s.date}`],
      [],
      ['ATTENDANCE'],
      ['Status', 'Count'],
      ['Present', s.attendance.present],
      ['Half Day', s.attendance.half_day],
      ['Absent', s.attendance.absent],
      ['Total', s.attendance.total],
      [],
      ['LABOUR DETAILS'],
      ['Name', 'Status'],
      ...s.attendance.records.map(r => [r.name || '', r.status]),
      [],
      ['MATERIALS USED'],
      ['Material', 'Details'],
      ...(s.materials.length > 0 ? s.materials.map(m => [m.material_name, m.details]) : [['—', '']]),
      [],
      ['TASKS'],
      ['Task', 'Status', 'Deadline'],
      ...(s.tasks.items.length > 0 ? s.tasks.items.map(t => [t.task, t.status, t.deadline || '']) : [['—', '', '']]),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `DG-Report-${s.site?.name}-${s.date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => window.print()

  return (
    <div className="page-content space-y-4">
      <div className="flex gap-2">
        <button onClick={() => navigate('/reports/add')} className="btn-primary flex-1">
          <Plus size={18} /> New Report
        </button>
        <button onClick={() => { setReportModal(true); setDailySummary(null) }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/20 text-green-400 font-medium text-sm active:scale-95 transition-transform">
          <BarChart2 size={18} /> Daily Report
        </button>
      </div>

      {pendingTasks.length > 0 && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
          <p className="text-orange-400 font-semibold text-sm">
            📋 {pendingTasks.length} pending task{pendingTasks.length > 1 ? 's' : ''} assigned to you
          </p>
          <p className="text-gray-500 text-xs mt-0.5">Tap a report below to view and update tasks</p>
        </div>
      )}

      <div className="flex gap-1 bg-surface-400 rounded-xl p-1">
        <button onClick={() => setTab('my')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'my' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}>
          My Reports ({myReports.length})
        </button>
        <button onClick={() => setTab('admin')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'admin' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}>
          Admin Reports ({adminReports.length})
        </button>
      </div>

      <div className="flex gap-2">
        <select className="select flex-1 text-sm py-2" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="select flex-1 text-sm py-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {loading ? <LoadingPage /> : (
        <div className="space-y-3">
          {displayReports.map(r => {
            const myPendingTasksInReport = (r.tasks || []).filter(t => t.status !== 'done')
            return (
              <button key={r.id} onClick={() => setViewModal(r.id)}
                className="card w-full text-left active:scale-95 transition-transform space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{r.title}</p>
                    <p className="text-gray-400 text-xs">{r.site?.name}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <span>📅 {r.report_date}</span>
                  {r.weather && <span>🌤 {r.weather}</span>}
                  {r.labour_count && <span>👷 {r.labour_count}</span>}
                  <span>📋 {r.tasks?.length || 0} tasks</span>
                  {myPendingTasksInReport.length > 0 && (
                    <span className="text-orange-400 font-medium">⚠️ {myPendingTasksInReport.length} pending</span>
                  )}
                </div>
                {r.description && <p className="text-gray-400 text-xs line-clamp-2">{r.description}</p>}
              </button>
            )
          })}
          {displayReports.length === 0 && (
            <EmptyState icon={FileText}
              title={tab === 'my' ? 'No reports yet' : 'No admin reports'}
              message={tab === 'my' ? 'Create visit reports to document site progress' : 'Admin has not created any reports for your sites yet'}
              action={tab === 'my' ? <button onClick={() => navigate('/reports/add')} className="btn-primary">New Report</button> : null}
            />
          )}
        </div>
      )}

      {/* Report detail modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Visit Report">
        {selectedReport && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="card-sm"><p className="text-gray-400 text-xs">Date</p><p className="text-white font-medium">{selectedReport.report_date}</p></div>
              <div className="card-sm"><p className="text-gray-400 text-xs">Site</p><p className="text-white font-medium">{selectedReport.site?.name}</p></div>
              <div className="card-sm"><p className="text-gray-400 text-xs">Status</p><StatusBadge status={selectedReport.status} /></div>
              <div className="card-sm"><p className="text-gray-400 text-xs">Labour</p><p className="text-white font-medium">{selectedReport.labour_count || '—'}</p></div>
            </div>

            {selectedReport.description && (
              <div><p className="text-gray-400 text-xs mb-1">Description</p>
                <p className="text-white text-sm bg-surface-400 rounded-xl p-3">{selectedReport.description}</p></div>
            )}

            {/* Admin rating — read only */}
            {selectedReport.supervisor_rating > 0 && (
              <div className="card-sm">
                <p className="text-gray-400 text-xs mb-1">Your Rating from Admin</p>
                <span className="text-xl text-yellow-400">
                  {[1,2,3,4,5].map(s => <span key={s}>{s <= selectedReport.supervisor_rating ? '★' : '☆'}</span>)}
                </span>
              </div>
            )}

            {/* Note from admin — visible to supervisor */}
            {selectedReport.note_for_supervisor && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-blue-400 text-xs font-medium mb-1">📝 Note from Admin</p>
                <p className="text-white text-sm">{selectedReport.note_for_supervisor}</p>
              </div>
            )}

            {/* Tasks with In Progress / Completed buttons */}
            {selectedReport.tasks?.length > 0 && (
              <div>
                <p className="text-white font-semibold text-sm mb-2">
                  Tasks ({selectedReport.tasks.filter(t => t.status === 'done').length}/{selectedReport.tasks.length} done)
                </p>
                <div className="space-y-2">
                  {selectedReport.tasks.map(t => (
                    <div key={t.id} className="card-sm">
                      <div className="flex items-start gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${t.status === 'done' ? 'bg-green-400' : t.status === 'in_progress' ? 'bg-primary-400' : 'bg-gray-400'}`} />
                        <div className="flex-1">
                          <p className="text-white text-sm">{t.task}</p>
                          {t.deadline && <p className="text-gray-500 text-xs">Due: {t.deadline}</p>}
                          {t.completion_photo && (
                            <a href={t.completion_photo} target="_blank" rel="noreferrer"
                              className="text-primary-400 text-xs mt-1 inline-flex items-center gap-1">
                              📷 View proof photo
                            </a>
                          )}
                        </div>
                      </div>
                      {t.status !== 'done' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMarkInProgress(t)}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all
                              ${t.status === 'in_progress' ? 'bg-primary-500 text-white' : 'bg-surface-200 text-gray-400 hover:bg-primary-500/20 hover:text-primary-400'}`}>
                            <Clock size={12} /> In Progress
                          </button>
                          <button
                            onClick={() => openCompleteModal(t)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium bg-surface-200 text-gray-400 hover:bg-green-500/20 hover:text-green-400 transition-all">
                            <CheckCircle size={12} /> Completed
                          </button>
                        </div>
                      )}
                      {t.status === 'done' && (
                        <p className="text-green-400 text-xs flex items-center gap-1"><CheckCircle size={11}/>Completed</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReport.next_visit_date && (
              <div className="card-sm">
                <p className="text-gray-400 text-xs">Next Visit Date</p>
                <p className="text-white font-medium">📅 {selectedReport.next_visit_date}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Photo proof completion modal */}
      <Modal open={!!completeTask} onClose={() => { setCompleteTask(null); setProofPhoto(null); setProofPreview(null) }} title="Mark Task Complete">
        {completeTask && (
          <div className="space-y-4">
            <div className="p-3 bg-surface-400 rounded-xl">
              <p className="text-gray-400 text-xs mb-0.5">Task</p>
              <p className="text-white text-sm font-medium">{completeTask.task}</p>
              {completeTask.deadline && <p className="text-gray-500 text-xs mt-0.5">Due: {completeTask.deadline}</p>}
            </div>

            <div className="p-4 border-2 border-dashed border-primary-500/30 rounded-xl text-center">
              <p className="text-white text-sm font-medium mb-1">📷 Photo Proof Required</p>
              <p className="text-gray-400 text-xs mb-3">Take a photo as proof of task completion</p>
              {proofPreview ? (
                <img src={proofPreview} alt="Proof" className="w-full max-h-48 object-cover rounded-xl mb-3" />
              ) : null}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => e.target.files[0] && handlePhotoCapture(e.target.files[0])} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="btn-primary flex items-center gap-2 mx-auto"
                disabled={proofUploading}>
                <Camera size={16} />
                {proofUploading ? 'Uploading...' : proofPreview ? 'Retake Photo' : 'Capture Photo'}
              </button>
            </div>

            {!proofPhoto && !proofUploading && (
              <p className="text-orange-400 text-xs text-center">⚠️ You must capture a photo before marking as complete</p>
            )}

            <button
              onClick={handleMarkComplete}
              disabled={!proofPhoto || completing}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all
                disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed
                enabled:bg-green-500 enabled:text-white enabled:hover:bg-green-600">
              {completing ? 'Marking Complete...' : '✓ Mark as Completed'}
            </button>
          </div>
        )}
      </Modal>

      {/* Daily Report Generator Modal */}
      <Modal open={reportModal} onClose={() => setReportModal(false)} title="Generate Daily Report">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Site</label>
              <select className="select" value={reportSiteId} onChange={e => setReportSiteId(e.target.value)}>
                <option value="">Select site</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={reportDate} onChange={e => setReportDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <button onClick={generateReport} disabled={!reportSiteId || reportLoading}
            className="btn-primary w-full">
            {reportLoading ? 'Generating...' : '📊 Generate Report'}
          </button>

          {dailySummary && (
            <div className="space-y-3 print:text-black">
              <div className="p-3 bg-surface-400 rounded-xl">
                <p className="text-white font-bold">{dailySummary.site?.name}</p>
                <p className="text-gray-400 text-xs">📅 {dailySummary.date}</p>
              </div>

              {/* Attendance */}
              <div>
                <p className="text-white font-semibold text-sm mb-2">👷 Attendance</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                    <p className="text-green-400 font-bold text-lg">{dailySummary.attendance.present}</p>
                    <p className="text-gray-400 text-xs">Present</p>
                  </div>
                  <div className="p-2 bg-primary-500/10 border border-primary-500/20 rounded-xl text-center">
                    <p className="text-primary-400 font-bold text-lg">{dailySummary.attendance.half_day}</p>
                    <p className="text-gray-400 text-xs">Half Day</p>
                  </div>
                  <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                    <p className="text-red-400 font-bold text-lg">{dailySummary.attendance.absent}</p>
                    <p className="text-gray-400 text-xs">Absent</p>
                  </div>
                </div>
              </div>

              {/* Materials */}
              <div>
                <p className="text-white font-semibold text-sm mb-2">🧱 Materials Used</p>
                {dailySummary.materials.length > 0 ? (
                  <div className="space-y-1">
                    {dailySummary.materials.map((m, i) => (
                      <div key={i} className="flex justify-between text-sm p-2 bg-surface-400 rounded-lg">
                        <span className="text-white">{m.material_name}</span>
                        <span className="text-gray-400">{m.details}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-500 text-sm">No materials logged today</p>}
              </div>

              {/* Tasks */}
              <div>
                <p className="text-white font-semibold text-sm mb-2">
                  📋 Tasks — {dailySummary.tasks.done}/{dailySummary.tasks.total} done
                </p>
                {dailySummary.tasks.items.length > 0 ? (
                  <div className="space-y-1">
                    {dailySummary.tasks.items.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 bg-surface-400 rounded-lg">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === 'done' ? 'bg-green-400' : t.status === 'in_progress' ? 'bg-primary-400' : 'bg-gray-400'}`} />
                        <span className="text-white flex-1 truncate">{t.task}</span>
                        <span className="text-gray-400 text-xs capitalize">{t.status.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-500 text-sm">No tasks for today</p>}
              </div>

              {/* Export buttons */}
              <div className="flex gap-2 pt-2">
                <button onClick={exportPDF}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium text-sm active:scale-95 transition-transform">
                  <Printer size={16} /> Export PDF
                </button>
                <button onClick={exportCSV}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/20 text-green-400 font-medium text-sm active:scale-95 transition-transform">
                  <Download size={16} /> Export Excel
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

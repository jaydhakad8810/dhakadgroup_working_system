import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, ChevronRight, Filter } from 'lucide-react'
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
  const [tab, setTab] = useState('my') // my | admin
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.append('status', filterStatus)
    if (filterSite) params.append('site_id', filterSite)
    // For 'my' tab, backend already filters by supervisor_id since user is supervisor
    // For 'admin' tab, fetch all reports for the sites this supervisor manages
    api.get(`/visit-reports?${params}`)
      .then(r => setReports(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterStatus, filterSite, tab])

  // Separate my reports from admin-created reports
  const myReports = reports.filter(r => r.supervisor_id === user?.id || r.created_by === user?.id)
  const adminReports = reports.filter(r => r.supervisor_id !== user?.id && r.created_by !== user?.id)
  const displayReports = tab === 'my' ? myReports : adminReports

  // Tasks assigned to this supervisor
  const myTasks = reports.flatMap(r => (r.tasks || []).map(t => ({ ...t, report: r })))
  const pendingTasks = myTasks.filter(t => t.status !== 'done')

  const selectedReport = reports.find(r => r.id === viewModal)

  return (
    <div className="page-content space-y-4">
      <button onClick={() => navigate('/reports/add')} className="btn-primary w-full">
        <Plus size={18} /> New Visit Report
      </button>

      {/* Pending tasks alert */}
      {pendingTasks.length > 0 && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
          <p className="text-orange-400 font-semibold text-sm">
            📋 {pendingTasks.length} pending task{pendingTasks.length > 1 ? 's' : ''} assigned to you
          </p>
          <p className="text-gray-500 text-xs mt-0.5">Tap a report below to view and update tasks</p>
        </div>
      )}

      {/* Tabs */}
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

      {/* Filters */}
      <div className="flex gap-2">
        <select className="select flex-1 text-sm py-2"
          value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="select flex-1 text-sm py-2"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
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

            {/* Tasks with update ability */}
            {selectedReport.tasks?.length > 0 && (
              <div>
                <p className="text-white font-semibold text-sm mb-2">
                  Tasks ({selectedReport.tasks.filter(t => t.status === 'done').length}/{selectedReport.tasks.length} done)
                </p>
                <div className="space-y-2">
                  {selectedReport.tasks.map(t => (
                    <div key={t.id} className="card-sm">
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${t.status === 'done' ? 'bg-green-400' : t.status === 'in_progress' ? 'bg-primary-400' : 'bg-gray-400'}`} />
                        <div className="flex-1">
                          <p className="text-white text-sm">{t.task}</p>
                          {t.deadline && <p className="text-gray-500 text-xs">Due: {t.deadline}</p>}
                        </div>
                        <select
                          className="text-xs rounded-lg px-2 py-1 bg-surface-200 text-gray-300 border-none outline-none"
                          value={t.status}
                          onChange={async (e) => {
                            try {
                              await api.patch(`/visit-reports/tasks/${t.id}`, { status: e.target.value })
                              // Refresh
                              const updated = await api.get(`/visit-reports/${selectedReport.id}`)
                              setReports(prev => prev.map(r => r.id === selectedReport.id ? updated.data : r))
                            } catch {}
                          }}>
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
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
    </div>
  )
}

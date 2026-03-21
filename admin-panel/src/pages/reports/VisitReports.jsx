import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal, StatusBadge } from '../../components/ui'
import { Plus, Eye, Trash2, CheckCircle } from 'lucide-react'

export default function VisitReports() {
  const [reports, setReports]   = useState([])
  const [sites, setSites]       = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [loading, setLoading]   = useState(true)
  const [viewModal, setViewModal] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [filterSite, setFilterSite]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSup, setFilterSup]       = useState('')
  const [form, setForm]   = useState({ report_date: new Date().toISOString().split('T')[0], status: 'open', weather: '' })
  const [tasks, setTasks] = useState([{ task: '', deadline: '', status: 'pending' }])
  const [saving, setSaving] = useState(false)
  const f = (k,v) => setForm(p => ({...p,[k]:v}))

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSite)   params.append('site_id', filterSite)
      if (filterStatus) params.append('status', filterStatus)
      if (filterSup)    params.append('supervisor_id', filterSup)
      const [r, s, u] = await Promise.all([
        api.get(`/visit-reports?${params}`),
        api.get('/sites'),
        api.get('/users?role=supervisor')
      ])
      setReports(r.data); setSites(s.data); setSupervisors(u.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [filterSite, filterStatus, filterSup])

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const validTasks = tasks.filter(t => t.task.trim())
      await api.post('/visit-reports', { ...form, tasks: validTasks })
      toast.success('Report created'); setAddModal(false)
      setForm({ report_date: new Date().toISOString().split('T')[0], status: 'open', weather: '' })
      setTasks([{ task: '', deadline: '', status: 'pending' }])
      load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const updateTaskStatus = async (taskId, status) => {
    try {
      await api.patch(`/visit-reports/tasks/${taskId}`, { status })
      toast.success('Task updated'); load()
      if (viewModal) {
        const r = await api.get(`/visit-reports/${viewModal}`)
        setViewModal(r.data.id)
        setReports(prev => prev.map(x => x.id === r.data.id ? r.data : x))
      }
    } catch { toast.error('Failed') }
  }

  const deleteReport = async (id) => {
    if (!confirm('Delete this report?')) return
    try { await api.delete(`/visit-reports/${id}`); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const selectedReport = reports.find(r => r.id === viewModal)

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Visit Reports"
        subtitle={`${reports.length} reports`}
        action={<button onClick={() => setAddModal(true)} className="btn-gold"><Plus size={16}/>Create Report</button>}
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="select w-48" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="select w-44" value={filterSup} onChange={e => setFilterSup(e.target.value)}>
          <option value="">All Supervisors</option>
          {supervisors.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="select w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Title</th><th>Site</th>
              <th>Supervisor</th><th>Labour</th><th>Status</th>
              <th>Tasks</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => {
              const doneTasks    = r.tasks?.filter(t => t.status === 'done').length || 0
              const pendingTasks = r.tasks?.filter(t => t.status === 'pending').length || 0
              return (
                <tr key={r.id}>
                  <td style={{color:'var(--muted)'}}>{r.report_date}</td>
                  <td className="font-medium max-w-xs truncate">{r.title}</td>
                  <td style={{color:'var(--muted)'}}>{r.site?.name}</td>
                  <td style={{color:'var(--muted)'}}>{r.supervisor?.name || 'Admin'}</td>
                  <td style={{color:'var(--muted)'}}>{r.labour_count || '—'}</td>
                  <td><StatusBadge status={r.status}/></td>
                  <td>
                    <span className="text-xs">
                      <span className="text-green-400">{doneTasks}✓</span>
                      {pendingTasks > 0 && <span className="text-red-400 ml-1">{pendingTasks} pending</span>}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setViewModal(r.id)} className="btn-ghost px-2 py-1 text-blue-400"><Eye size={14}/></button>
                      <button onClick={() => deleteReport(r.id)} className="btn-ghost px-2 py-1 text-red-400"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!reports.length && <tr><td colSpan={8} className="text-center py-8" style={{color:'var(--muted)'}}>No reports found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* View / Task management modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Visit Report Detail" size="lg">
        {selectedReport && (
          <div className="space-y-4">
            {/* Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Date', selectedReport.report_date],
                ['Site', selectedReport.site?.name],
                ['Supervisor', selectedReport.supervisor?.name || 'Admin'],
                ['Weather', selectedReport.weather],
                ['Labour Count', selectedReport.labour_count],
                ['Next Visit', selectedReport.next_visit_date],
              ].filter(([,v])=>v).map(([l,v]) => (
                <div key={l} className="p-2 rounded-lg" style={{background:'var(--bg3)'}}>
                  <p className="text-xs" style={{color:'var(--muted)'}}>{l}</p>
                  <p className="font-medium" style={{color:'var(--text)'}}>{v}</p>
                </div>
              ))}
            </div>
            {selectedReport.description && (
              <div className="p-3 rounded-xl" style={{background:'var(--bg3)'}}>
                <p className="text-xs font-medium mb-1" style={{color:'var(--muted)'}}>Description</p>
                <p className="text-sm" style={{color:'var(--text)'}}>{selectedReport.description}</p>
              </div>
            )}

            {/* Tasks with status control */}
            {selectedReport.tasks?.length > 0 && (
              <div>
                <p className="font-semibold mb-2" style={{color:'var(--text)'}}>
                  Tasks ({selectedReport.tasks.filter(t=>t.status==='done').length}/{selectedReport.tasks.length} done)
                </p>
                <div className="space-y-2">
                  {selectedReport.tasks.map(t => (
                    <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl" style={{background:'var(--bg3)'}}>
                      <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                        t.status==='done' ? 'bg-green-400' : t.status==='in_progress' ? 'bg-gold-400' : 'bg-gray-400'
                      }`}/>
                      <div className="flex-1">
                        <p className="text-sm" style={{color:'var(--text)'}}>{t.task}</p>
                        {t.deadline && <p className="text-xs mt-0.5" style={{color:'var(--muted)'}}>Due: {t.deadline}</p>}
                        {t.completion_note && <p className="text-xs text-green-400 mt-0.5">Note: {t.completion_note}</p>}
                      </div>
                      {/* Admin can update task status */}
                      <div className="flex gap-1">
                        {['pending','in_progress','done'].map(s => (
                          <button key={s} onClick={() => updateTaskStatus(t.id, s)}
                            className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                              t.status===s
                                ? s==='done' ? 'bg-green-500 text-white'
                                : s==='in_progress' ? 'bg-gold-500 text-black'
                                : 'bg-gray-500 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}>
                            {s==='pending'?'Pending':s==='in_progress'?'Progress':'Done'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Report Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Create Visit Report" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Site *</label>
              <select className="select" required value={form.site_id||''} onChange={e => f('site_id',e.target.value)}>
                <option value="">Select site</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assign to Supervisor</label>
              <select className="select" value={form.supervisor_id||''} onChange={e => f('supervisor_id',e.target.value)}>
                <option value="">Admin (self)</option>
                {supervisors.map(u => <option key={u.id} value={u.id}>{u.name} ({u.employee_id})</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className="label">Report Title *</label><input className="input" required value={form.title||''} onChange={e => f('title',e.target.value)} placeholder="e.g. Weekly Progress Report"/></div>
            <div><label className="label">Date *</label><input type="date" className="input" required value={form.report_date} onChange={e => f('report_date',e.target.value)}/></div>
            <div><label className="label">Status</label>
              <select className="select" value={form.status} onChange={e => f('status',e.target.value)}>
                <option value="open">Open</option><option value="in_progress">In Progress</option><option value="closed">Closed</option>
              </select>
            </div>
            <div><label className="label">Weather</label><input className="input" value={form.weather} onChange={e => f('weather',e.target.value)} placeholder="Sunny, Rainy…"/></div>
            <div><label className="label">Labour Count</label><input type="number" className="input" value={form.labour_count||''} onChange={e => f('labour_count',e.target.value)}/></div>
            <div><label className="label">Next Visit Date</label><input type="date" className="input" value={form.next_visit_date||''} onChange={e => f('next_visit_date',e.target.value)}/></div>
          </div>
          <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description||''} onChange={e => f('description',e.target.value)}/></div>

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Tasks / Punch Points (visible to supervisor)</label>
              <button type="button" onClick={() => setTasks(p => [...p, {task:'',deadline:'',status:'pending'}])}
                className="text-gold-500 text-sm">+ Add Task</button>
            </div>
            <div className="space-y-2">
              {tasks.map((t, i) => (
                <div key={i} className="p-3 rounded-xl space-y-2" style={{background:'var(--bg3)'}}>
                  <div className="flex gap-2">
                    <input className="input flex-1 text-sm py-2" placeholder="Task description…" value={t.task}
                      onChange={e => setTasks(p => p.map((x,j) => j===i ? {...x,task:e.target.value} : x))}/>
                    <button type="button" onClick={() => setTasks(p => p.filter((_,j) => j!==i))}
                      className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0 text-xs">✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="input text-sm py-2" value={t.deadline||''}
                      onChange={e => setTasks(p => p.map((x,j) => j===i ? {...x,deadline:e.target.value} : x))}/>
                    <select className="select text-sm py-2" value={t.status}
                      onChange={e => setTasks(p => p.map((x,j) => j===i ? {...x,status:e.target.value} : x))}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setAddModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving?'Saving…':'Create Report'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

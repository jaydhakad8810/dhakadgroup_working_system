import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Plus, Trash2, Loader2 } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function AddReport() {
  const navigate = useNavigate()
  const [sites, setSites] = useState([])
  const [saving, setSaving] = useState(false)
  const [tasks, setTasks] = useState([{ task: '', deadline: '', status: 'pending' }])
  const [form, setForm] = useState({
    report_date: new Date().toISOString().split('T')[0],
    status: 'open', labour_count: ''
  })

  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data)).catch(() => {})
  }, [])

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const addTask = () => setTasks(p => [...p, { task: '', deadline: '', status: 'pending' }])
  const removeTask = (i) => setTasks(p => p.filter((_, idx) => idx !== i))
  const updateTask = (i, key, val) => setTasks(p => p.map((t, idx) => idx === i ? { ...t, [key]: val } : t))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.site_id) return toast.error('Select a site')
    if (!form.title) return toast.error('Title is required')
    setSaving(true)
    try {
      const validTasks = tasks.filter(t => t.task.trim())
      await api.post('/visit-reports', { ...form, tasks: validTasks })
      toast.success('Report submitted!'); navigate('/reports')
    } catch { toast.error('Failed to submit') }
    setSaving(false)
  }

  return (
    <div className="page-content space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Site *</label>
          <select className="select" required value={form.site_id || ''} onChange={e => f('site_id', e.target.value)}>
            <option value="">Select site</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Report Title *</label>
          <input className="input" required value={form.title || ''} onChange={e => f('title', e.target.value)} placeholder="e.g. Weekly Progress Report" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input" required value={form.report_date} onChange={e => f('report_date', e.target.value)} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={e => f('status', e.target.value)}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Labour Count</label>
          <input type="number" className="input" value={form.labour_count} onChange={e => f('labour_count', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={form.description || ''} onChange={e => f('description', e.target.value)} placeholder="Describe today's progress..." />
        </div>
        <div>
          <label className="label">Private Note (Admin only)</label>
          <textarea className="input" rows={2} value={form.private_note || ''} onChange={e => f('private_note', e.target.value)} placeholder="Internal notes..." />
        </div>
        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Tasks / Punch Points</label>
            <button type="button" onClick={addTask} className="text-primary-500 text-sm flex items-center gap-1"><Plus size={14} />Add</button>
          </div>
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <div key={i} className="p-3 bg-surface-400 rounded-xl space-y-2">
                <div className="flex gap-2">
                  <input className="input flex-1 text-sm py-2" placeholder="Task description..." value={task.task} onChange={e => updateTask(i, 'task', e.target.value)} />
                  <button type="button" onClick={() => removeTask(i)} className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="input text-sm py-2" value={task.deadline} onChange={e => updateTask(i, 'deadline', e.target.value)} placeholder="Deadline" />
                  <select className="select text-sm py-2" value={task.status} onChange={e => updateTask(i, 'status', e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full py-4">
          {saving ? <Loader2 size={18} className="animate-spin" /> : null}
          {saving ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  )
}

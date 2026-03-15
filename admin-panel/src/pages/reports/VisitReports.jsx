import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal, StatusBadge } from '../../components/ui'
import { Plus, Eye } from 'lucide-react'

export default function VisitReports() {
  const [reports, setReports] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewModal, setViewModal] = useState(null)
  const [filterSite, setFilterSite] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSite) params.append('site_id', filterSite)
      if (filterStatus) params.append('status', filterStatus)
      const [r, s] = await Promise.all([api.get(`/visit-reports?${params}`), api.get('/sites')])
      setReports(r.data); setSites(s.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [filterSite, filterStatus])

  if (loading) return <LoadingPage />
  const selected = reports.find(r => r.id === viewModal)

  return (
    <div className="space-y-6">
      <PageHeader title="Visit Reports" subtitle={`${reports.length} reports`} />
      <div className="flex gap-3 flex-wrap">
        <select className="select w-48" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="select w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="closed">Closed</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead><tr><th>Date</th><th>Title</th><th>Site</th><th>Supervisor</th><th>Labour</th><th>Status</th><th>Tasks</th><th></th></tr></thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id}>
                <td className="text-gray-400">{r.report_date}</td>
                <td className="font-medium">{r.title}</td>
                <td className="text-gray-400">{r.site?.name}</td>
                <td className="text-gray-400">{r.supervisor?.name || '—'}</td>
                <td className="text-gray-400">{r.labour_count || '—'}</td>
                <td><StatusBadge status={r.status} /></td>
                <td><span className="text-gray-400 text-xs">{r.tasks?.length || 0} tasks</span></td>
                <td><button onClick={() => setViewModal(r.id)} className="btn-ghost py-1 px-2 text-xs"><Eye size={14} />View</button></td>
              </tr>
            ))}
            {reports.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-8">No visit reports</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Visit Report" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">Date</p><p className="text-white">{selected.report_date}</p></div>
              <div><p className="text-gray-400">Site</p><p className="text-white">{selected.site?.name}</p></div>
              <div><p className="text-gray-400">Supervisor</p><p className="text-white">{selected.supervisor?.name || '—'}</p></div>
              <div><p className="text-gray-400">Weather</p><p className="text-white">{selected.weather || '—'}</p></div>
              <div><p className="text-gray-400">Labour Count</p><p className="text-white">{selected.labour_count || '—'}</p></div>
              <div><p className="text-gray-400">Status</p><StatusBadge status={selected.status} /></div>
            </div>
            {selected.description && <div><p className="text-gray-400 text-sm mb-1">Description</p><p className="text-white text-sm bg-dark-800 p-3 rounded-lg">{selected.description}</p></div>}
            {selected.tasks?.length > 0 && (
              <div>
                <p className="text-gray-400 text-sm mb-2">Tasks ({selected.tasks.length})</p>
                <div className="space-y-2">
                  {selected.tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3 bg-dark-800 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${t.status === 'done' ? 'bg-green-400' : t.status === 'in_progress' ? 'bg-gold-400' : 'bg-gray-400'}`} />
                      <div className="flex-1">
                        <p className="text-white text-sm">{t.task}</p>
                        {t.deadline && <p className="text-gray-400 text-xs">Due: {t.deadline}</p>}
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

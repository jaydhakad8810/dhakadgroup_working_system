import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, ChevronRight } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, EmptyState, StatusBadge } from '../../components/ui'

export default function VisitReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/visit-reports').then(r => setReports(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-content space-y-4">
      <button onClick={() => navigate('/reports/add')} className="btn-primary w-full">
        <Plus size={18} /> New Visit Report
      </button>

      {loading ? <LoadingPage /> : (
        <div className="space-y-2">
          {reports.map(r => (
            <div key={r.id} className="card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{r.title}</p>
                  <p className="text-gray-400 text-sm">{r.site?.name}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>📅 {r.report_date}</span>
                {r.weather && <span>🌤 {r.weather}</span>}
                {r.labour_count && <span>👷 {r.labour_count}</span>}
                <span>📋 {r.tasks?.length || 0} tasks</span>
              </div>
              {r.description && <p className="text-gray-400 text-xs line-clamp-2">{r.description}</p>}
            </div>
          ))}
          {reports.length === 0 && (
            <EmptyState icon={FileText} title="No reports yet"
              message="Create visit reports to document site progress"
              action={<button onClick={() => navigate('/reports/add')} className="btn-primary">New Report</button>}
            />
          )}
        </div>
      )}
    </div>
  )
}

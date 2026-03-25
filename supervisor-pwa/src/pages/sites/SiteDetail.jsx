import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardCheck, Users, DollarSign, FileText, TrendingUp } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge, InfoRow } from '../../components/ui'

export default function SiteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    api.get(`/sites/${id}`).then(r => setSite(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingPage />
  if (!site) return <div className="page-content text-gray-400">Site not found</div>

  const actions = [
    { label: 'Attendance', icon: ClipboardCheck, color: 'bg-primary-500/20 text-primary-400', to: `/attendance?site_id=${id}` },
    { label: 'Labour', icon: Users, color: 'bg-green-500/20 text-green-400', to: `/labour?site_id=${id}` },
    { label: 'Expenses', icon: TrendingUp, color: 'bg-blue-500/20 text-blue-400', to: `/expenses?site_id=${id}` },
    { label: 'Reports', icon: FileText, color: 'bg-purple-500/20 text-purple-400', to: `/reports?site_id=${id}` },
  ]

  return (
    <div className="page-content space-y-4">
      {/* Header Card */}
      <div className="card bg-gradient-to-br from-primary-500/15 to-surface-300 border-primary-500/20">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-white font-bold text-xl">{site.name}</h2>
            <p className="text-gray-400 text-sm mt-0.5">{site.organisation?.name}</p>
          </div>
          <StatusBadge status={site.status} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {actions.map(({ label, icon: Icon, color, to }) => (
          <button key={to} onClick={() => navigate(to)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-300 active:scale-95 transition-transform">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}><Icon size={18} /></div>
            <span className="text-gray-300 text-xs text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* Site Info */}
      <div className="card space-y-0">
        <h3 className="text-white font-semibold mb-3">Site Details</h3>
        <InfoRow label="Client" value={site.client_name} />
        <InfoRow label="Client Phone" value={site.client_phone} />
        <InfoRow label="Start Date" value={site.start_date} />
        <InfoRow label="Expected End" value={site.expected_end_date} />
        <InfoRow label="City" value={`${site.city || ''} ${site.state || ''}`.trim()} />
        <InfoRow label="GPS Radius" value={site.gps_radius_meters ? `${site.gps_radius_meters}m` : null} />
        {site.notes && <div className="pt-2"><p className="text-gray-400 text-sm">Notes</p><p className="text-white text-sm mt-1">{site.notes}</p></div>}
      </div>
    </div>
  )
}

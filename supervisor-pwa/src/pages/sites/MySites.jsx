import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, MapPin, ChevronRight } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, EmptyState, StatusBadge } from '../../components/ui'

export default function MySites() {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingPage />

  return (
    <div className="page-content">
      <div className="space-y-3">
        {sites.map(site => (
          <button key={site.id} onClick={() => navigate(`/sites/${site.id}`)}
            className="card w-full text-left active:scale-95 transition-transform">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                <Building2 size={22} className="text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-white font-semibold truncate">{site.name}</h3>
                  <StatusBadge status={site.status} />
                </div>
                {site.client_name && <p className="text-gray-400 text-sm mt-0.5">👤 {site.client_name}</p>}
                {(site.city || site.state) && (
                  <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                    <MapPin size={11} />{[site.city, site.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {site.contract_value && (
                  <p className="text-primary-400 text-xs mt-1 font-medium">
                    ₹{parseFloat(site.contract_value).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="text-gray-600 flex-shrink-0 mt-1" />
            </div>
          </button>
        ))}
        {sites.length === 0 && <EmptyState icon={Building2} title="No sites assigned" message="Contact your admin to get assigned to a site." />}
      </div>
    </div>
  )
}

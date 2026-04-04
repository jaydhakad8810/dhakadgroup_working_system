import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, LoadingPage } from '../../components/ui'
import { ChevronRight, Phone, Building2, HardHat } from 'lucide-react'
import api from '../../utils/api'

export default function Supervisors() {
  const [supervisors, setSupervisors] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/users?role=supervisor')
      .then(r => setSupervisors(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Supervisors" subtitle={`${supervisors.length} supervisors`} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {supervisors.map(s => (
          <div key={s.id} onClick={() => navigate(`/supervisors/${s.id}`)}
            className="card cursor-pointer hover:border-gold-500/40 transition-all group">
            <div className="flex items-center gap-3 mb-3">
              {s.photo
                ? <img src={s.photo} className="w-12 h-12 rounded-xl object-cover border border-dark-600 flex-shrink-0" alt={s.name} />
                : <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-lg flex-shrink-0">{s.name?.[0]}</div>
              }
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold truncate">{s.name}</h3>
                <p className="text-gold-400 font-mono text-xs">{s.employee_id || '—'}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={s.is_active ? 'badge-green' : 'badge-red'}>{s.is_active ? 'Active' : 'Inactive'}</span>
                <ChevronRight size={14} className="text-gray-600 group-hover:text-gold-400 transition-colors" />
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              {s.phone && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Phone size={13} className="text-gray-600" />
                  <span>{s.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-400">
                <Building2 size={13} className="text-gray-600" />
                <span>View assigned sites</span>
              </div>
            </div>
          </div>
        ))}
        {supervisors.length === 0 && (
          <div className="col-span-full text-center py-16">
            <HardHat size={40} className="mx-auto mb-3 opacity-20 text-gray-400" />
            <p className="text-gray-500">No supervisors found</p>
          </div>
        )}
      </div>
    </div>
  )
}

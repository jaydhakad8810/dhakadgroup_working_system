import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, LoadingPage } from '../../components/ui'
import { ChevronRight, Phone, Building2 } from 'lucide-react'
import api from '../../utils/api'
import api from '../../utils/api'
import { PageHeader, LoadingPage } from '../../components/ui'
import { HardHat, Phone, MapPin, ChevronRight } from 'lucide-react'

export default function Supervisors() {
  const [supervisors, setSupervisors] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/users?role=supervisor')
      .then(r => setSupervisors(r.data))
      .then(r => setSupervisors(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title={`Supervisors (${supervisors.length})`} />

      {!supervisors.length && (
        <p className="text-center text-gray-500 py-20">No supervisors found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <PageHeader
        title="Supervisors"
        subtitle={`${supervisors.length} supervisors`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {supervisors.map(s => (
          <div
            key={s.id}
            onClick={() => navigate(`/supervisors/${s.id}`)}
            className="card cursor-pointer hover:border-gold-500/40 transition-all group"
          >
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
                ? <img src={s.photo} className="w-14 h-14 rounded-xl object-cover border border-dark-600" alt={s.name} />
                : <div className="w-14 h-14 rounded-xl bg-gold-500/20 flex items-center justify-center text-gold-400 text-xl font-bold border border-gold-500/20">
                    {s.name?.[0]}
                  </div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{s.name}</p>
                <p className="text-gold-400 font-mono text-xs">{s.employee_id || '—'}</p>
              </div>
              <ChevronRight size={16} className="text-gray-600 group-hover:text-gold-400 transition-colors shrink-0" />
            </div>

            <div className="space-y-1.5 text-sm">
              {s.phone && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Phone size={13} className="text-gray-600" />
                  <Phone size={13} />
                  <span>{s.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-400">
                <Building2 size={13} className="text-gray-600" />
                <span>View assigned sites →</span>
              </div>
            </div>
          </div>
        ))}
                <MapPin size={13} />
                <span>Sites assigned: —</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {s.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs text-gray-600">
                {s.last_login ? 'Last: ' + new Date(s.last_login).toLocaleDateString('en-IN') : 'Never logged in'}
              </span>
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

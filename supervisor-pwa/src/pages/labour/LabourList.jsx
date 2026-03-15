import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, ChevronRight, Users } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, EmptyState, StatusBadge } from '../../components/ui'

export default function LabourList() {
  const [labour, setLabour] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const siteFromUrl = searchParams.get('site_id')
    if (siteFromUrl) setFilterSite(siteFromUrl)
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ is_active: 'true' })
      if (filterSite) params.append('site_id', filterSite)
      const [l, s] = await Promise.all([api.get(`/labour?${params}`), api.get('/sites')])
      setLabour(l.data); setSites(s.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filterSite])

  const filtered = labour.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <LoadingPage />

  return (
    <div className="page-content space-y-4">
      {/* Search + Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-10" placeholder="Search labour..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Add button */}
      <button onClick={() => navigate('/labour/add')} className="btn-primary w-full">
        <Plus size={18} /> Add Labour
      </button>

      {/* Count */}
      <p className="text-gray-500 text-sm">{filtered.length} workers</p>

      {/* List */}
      {filtered.length === 0
        ? <EmptyState icon={Users} title="No labour found" message="Add labour to get started." action={<button onClick={() => navigate('/labour/add')} className="btn-primary">Add Labour</button>} />
        : (
          <div className="space-y-2">
            {filtered.map(l => (
              <button key={l.id} onClick={() => navigate(`/labour/${l.id}`)}
                className="card w-full text-left active:scale-95 transition-transform">
                <div className="flex items-center gap-3">
                  {l.photo
                    ? <img src={l.photo} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" alt={l.name} />
                    : <div className="w-11 h-11 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-lg flex-shrink-0">{l.name[0]}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold truncate">{l.name}</p>
                      <StatusBadge status={l.labour_type} />
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{l.site?.name || 'No site'} · ₹{parseFloat(l.daily_wage).toLocaleString('en-IN')}/day</p>
                    {l.phone && <p className="text-gray-600 text-xs">{l.phone}</p>}
                  </div>
                  <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )
      }
    </div>
  )
}
